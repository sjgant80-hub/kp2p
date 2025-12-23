/**
 * @file src/agent/bridge.js
 * @desc Agent bridge - connects LLM to sandboxed tools
 *
 * ARCHITECTURE:
 * ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
 * │   LLM API   │────→│    Bridge    │────→│   Sandbox   │
 * │ (Claude/GPT)│←────│  (mediator)  │←────│  (Worker)   │
 * └─────────────┘     └──────────────┘     └─────────────┘
 *                            │
 *                            ▼
 *                     ┌──────────────┐
 *                     │  P2P Peers   │
 *                     │  (WebRTC)    │
 *                     └──────────────┘
 *
 * The bridge NEVER gives LLM direct access to:
 * - fetch/network
 * - file system
 * - credentials
 * - eval/dynamic code
 */

import { Sandbox } from '../core/sandbox.js';
import { Protocol, MSG_TYPE } from '../core/protocol.js';

/**
 * Tool definitions for LLM function calling
 */
export const TOOLS = {
  // Peer communication
  send_message: {
    name: 'send_message',
    description: 'Send a message to a connected peer',
    parameters: {
      type: 'object',
      properties: {
        peer_id: { type: 'string', description: 'The peer ID to send to' },
        message: { type: 'string', description: 'The message text' },
      },
      required: ['peer_id', 'message'],
    },
  },

  broadcast: {
    name: 'broadcast',
    description: 'Send a message to all connected peers',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to broadcast' },
      },
      required: ['message'],
    },
  },

  list_peers: {
    name: 'list_peers',
    description: 'Get list of currently connected peers',
    parameters: { type: 'object', properties: {} },
  },

  // Sandboxed memory
  memory_get: {
    name: 'memory_get',
    description: 'Get a value from agent memory',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The key to retrieve' },
      },
      required: ['key'],
    },
  },

  memory_set: {
    name: 'memory_set',
    description: 'Store a value in agent memory',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The key to store' },
        value: { type: 'any', description: 'The value to store' },
      },
      required: ['key', 'value'],
    },
  },

  memory_list: {
    name: 'memory_list',
    description: 'List all keys in agent memory',
    parameters: { type: 'object', properties: {} },
  },

  // Computation
  compute: {
    name: 'compute',
    description: 'Evaluate a mathematical expression',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression like "2 + 3 * 4"' },
      },
      required: ['expression'],
    },
  },

  // Self-info
  status: {
    name: 'status',
    description: 'Get agent status (uptime, message count, etc)',
    parameters: { type: 'object', properties: {} },
  },
};

/**
 * LLM Provider adapters
 */
const providers = {
  /**
   * Anthropic Claude adapter
   */
  claude: {
    formatTools() {
      return Object.values(TOOLS).map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    },

    async call(apiKey, messages, tools, options = {}) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model || 'claude-3-haiku-20240307',
          max_tokens: options.maxTokens || 1024,
          messages,
          tools,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      return response.json();
    },

    parseToolCalls(response) {
      const toolCalls = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            args: block.input,
          });
        }
      }
      return toolCalls;
    },

    formatToolResult(id, result) {
      return {
        type: 'tool_result',
        tool_use_id: id,
        content: JSON.stringify(result),
      };
    },
  },

  /**
   * OpenAI GPT adapter
   */
  openai: {
    formatTools() {
      return Object.values(TOOLS).map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    },

    async call(apiKey, messages, tools, options = {}) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'gpt-3.5-turbo',
          messages,
          tools,
          max_tokens: options.maxTokens || 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      return response.json();
    },

    parseToolCalls(response) {
      const msg = response.choices[0].message;
      if (!msg.tool_calls) return [];

      return msg.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }));
    },

    formatToolResult(id, result) {
      return {
        role: 'tool',
        tool_call_id: id,
        content: JSON.stringify(result),
      };
    },
  },
};

/**
 * Agent Bridge - mediates between LLM and sandboxed environment
 */
export class AgentBridge {
  constructor(options = {}) {
    this.id = options.id || 'agent-' + Math.random().toString(36).slice(2, 8);
    this.provider = options.provider || 'claude';
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.sandbox = null;
    this.protocol = null;
    this.peers = new Map();
    this.onMessage = options.onMessage || (() => {});
    this.onThought = options.onThought || (() => {});
  }

  /**
   * Start the agent
   */
  async start() {
    // Start sandbox
    this.sandbox = new Sandbox({ id: this.id + '-sandbox' });
    await this.sandbox.start();

    // Create protocol handler
    this.protocol = new Protocol(this.id, {
      onSend: (msg) => this._sendToPeer(msg),
    });

    // Register handlers
    this.protocol.on('chat', async (payload) => {
      this.onMessage({ from: 'peer', text: payload.text });
      return { received: true };
    });
  }

  /**
   * Connect to a peer
   */
  addPeer(peerId, channel) {
    this.peers.set(peerId, channel);

    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.protocol.receive(msg);
      } catch (err) {
        console.error('Failed to parse peer message:', err);
      }
    };
  }

  /**
   * Remove peer
   */
  removePeer(peerId) {
    this.peers.delete(peerId);
  }

  /**
   * Send message to peer
   */
  _sendToPeer(msg) {
    const data = JSON.stringify(msg);

    if (msg.to) {
      // Direct message
      const channel = this.peers.get(msg.to);
      if (channel && channel.readyState === 'open') {
        channel.send(data);
      }
    } else {
      // Broadcast
      for (const [_, channel] of this.peers) {
        if (channel.readyState === 'open') {
          channel.send(data);
        }
      }
    }
  }

  /**
   * Execute a tool call from LLM
   */
  async _executeTool(name, args) {
    switch (name) {
      case 'send_message':
        this.protocol.emit('chat', { text: args.message });
        return { sent: true, to: args.peer_id };

      case 'broadcast':
        this.protocol.emit('chat', { text: args.message });
        return { sent: true, to: 'all' };

      case 'list_peers':
        return { peers: Array.from(this.peers.keys()) };

      case 'memory_get':
        return { value: await this.sandbox.get(args.key) };

      case 'memory_set':
        await this.sandbox.set(args.key, args.value);
        return { stored: true };

      case 'memory_list':
        return { keys: await this.sandbox.keys() };

      case 'compute':
        return { result: await this.sandbox.compute(args.expression) };

      case 'status':
        return await this.sandbox.stats();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Run agent with a prompt
   */
  async run(userMessage, options = {}) {
    const adapter = providers[this.provider];
    if (!adapter) throw new Error(`Unknown provider: ${this.provider}`);

    const tools = adapter.formatTools();
    const messages = [
      {
        role: 'system',
        content: `You are an AI agent running in a sandboxed P2P environment.
You can communicate with peers and store data in memory.
You CANNOT access the internet, files, or any external resources.
Be helpful and use your available tools to assist.`,
      },
      { role: 'user', content: userMessage },
    ];

    let iterations = 0;
    const maxIterations = options.maxIterations || 10;

    while (iterations < maxIterations) {
      iterations++;

      // Call LLM
      const response = await adapter.call(
        this.apiKey,
        messages,
        tools,
        { model: this.model }
      );

      // Check for tool calls
      const toolCalls = adapter.parseToolCalls(response);

      if (toolCalls.length === 0) {
        // No tool calls, return text response
        const text = this.provider === 'claude'
          ? response.content.find(b => b.type === 'text')?.text
          : response.choices[0].message.content;
        return { text, iterations };
      }

      // Execute tool calls
      const results = [];
      for (const call of toolCalls) {
        this.onThought({ tool: call.name, args: call.args });

        try {
          const result = await this._executeTool(call.name, call.args);
          results.push(adapter.formatToolResult(call.id, result));
        } catch (err) {
          results.push(adapter.formatToolResult(call.id, { error: err.message }));
        }
      }

      // Add assistant message and results
      if (this.provider === 'claude') {
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: results });
      } else {
        messages.push(response.choices[0].message);
        messages.push(...results);
      }
    }

    throw new Error('Max iterations exceeded');
  }

  /**
   * Stop the agent
   */
  async stop() {
    if (this.sandbox) {
      await this.sandbox.stop();
      this.sandbox = null;
    }
    this.peers.clear();
  }
}

export default AgentBridge;
