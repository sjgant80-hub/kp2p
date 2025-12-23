/**
 * @file src/llm/agent-v2.js
 * @desc LLM Agent v2 - Streaming responses, better tool handling, improved UX
 *
 * IMPROVEMENTS OVER v1:
 * - Streaming responses for better UX
 * - Better tool parsing (handles multiple formats)
 * - Tool result streaming
 * - Conversation export/import
 * - Better error recovery
 * - Settings persistence
 */

import { LocalLLM } from './local.js';
import { VFS } from '../os/vfs.js';

/**
 * Tool definitions
 */
export const TOOLS = {
  web_fetch: {
    name: 'web_fetch',
    icon: '🌐',
    description: 'Fetch content from a URL',
    parameters: {
      url: { type: 'string', description: 'URL to fetch', required: true },
    },
  },
  file_read: {
    name: 'file_read',
    icon: '📖',
    description: 'Read a file',
    parameters: {
      path: { type: 'string', description: 'File path', required: true },
    },
  },
  file_write: {
    name: 'file_write',
    icon: '✏️',
    description: 'Write to a file',
    parameters: {
      path: { type: 'string', description: 'File path', required: true },
      content: { type: 'string', description: 'Content', required: true },
    },
  },
  file_list: {
    name: 'file_list',
    icon: '📂',
    description: 'List directory',
    parameters: {
      path: { type: 'string', description: 'Directory path', required: false },
    },
  },
  calculate: {
    name: 'calculate',
    icon: '🧮',
    description: 'Evaluate a math expression',
    parameters: {
      expression: { type: 'string', description: 'Math expression', required: true },
    },
  },
  memory_get: {
    name: 'memory_get',
    icon: '💾',
    description: 'Get stored value',
    parameters: {
      key: { type: 'string', description: 'Key name', required: true },
    },
  },
  memory_set: {
    name: 'memory_set',
    icon: '💾',
    description: 'Store a value',
    parameters: {
      key: { type: 'string', description: 'Key name', required: true },
      value: { type: 'string', description: 'Value', required: true },
    },
  },
};

/**
 * Build system prompt with tools
 */
function buildSystemPrompt(tools) {
  let prompt = `You are a helpful AI assistant with access to tools.

## Available Tools
`;

  for (const tool of Object.values(tools)) {
    prompt += `\n### ${tool.icon} ${tool.name}\n${tool.description}\n`;
    prompt += 'Parameters: ';
    const params = Object.entries(tool.parameters)
      .map(([k, v]) => `${k}${v.required ? '*' : ''}`)
      .join(', ');
    prompt += params + '\n';
  }

  prompt += `
## Tool Usage
To use a tool, write:
<tool name="tool_name" param1="value1" param2="value2"/>

Example: <tool name="calculate" expression="15 * 0.15"/>

Rules:
- Use tools when needed to answer questions
- Explain briefly before using a tool
- Wait for tool results before continuing
- Be concise in responses
`;

  return prompt;
}

/**
 * Parse tool calls from text (supports multiple formats)
 */
function parseToolCalls(text) {
  const calls = [];

  // Format 1: <tool name="..." param="..."/>
  const xmlRegex = /<tool\s+name="(\w+)"([^/>]*)\/?>/g;
  let match;
  while ((match = xmlRegex.exec(text)) !== null) {
    const name = match[1];
    const paramsStr = match[2];
    const params = {};

    const paramRegex = /(\w+)="([^"]*)"/g;
    let pm;
    while ((pm = paramRegex.exec(paramsStr)) !== null) {
      params[pm[1]] = pm[2];
    }

    if (TOOLS[name]) {
      calls.push({ name, params, raw: match[0] });
    }
  }

  // Format 2: ```tool {"tool": "...", "params": {...}} ```
  const jsonRegex = /```tool\s*([\s\S]*?)```/g;
  while ((match = jsonRegex.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      if (json.tool && TOOLS[json.tool]) {
        calls.push({ name: json.tool, params: json.params || {}, raw: match[0] });
      }
    } catch (e) {}
  }

  return calls;
}

/**
 * Agent v2 - Improved LLM agent
 */
export class AgentV2 {
  constructor(options = {}) {
    this.llm = null;
    this.vfs = null;
    this.memory = new Map();
    this.history = [];
    this.settings = {
      temperature: 0.7,
      maxTokens: 1024,
      maxHistory: 20,
      corsProxy: 'https://api.allorigins.win/raw?url=',
      ...options.settings,
    };

    // Callbacks
    this.onToken = options.onToken || (() => {});
    this.onToolStart = options.onToolStart || (() => {});
    this.onToolEnd = options.onToolEnd || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Initialize agent
   */
  async init(modelId, onProgress) {
    this.llm = new LocalLLM({
      model: modelId,
      onProgress: onProgress || (() => {}),
    });
    await this.llm.load();

    this.vfs = new VFS({ storageKey: 'agent-v2-vfs' });
    this._loadMemory();

    return this;
  }

  /**
   * Chat with streaming
   */
  async chat(message) {
    this.history.push({ role: 'user', content: message });
    this._trimHistory();

    const messages = [
      { role: 'system', content: buildSystemPrompt(TOOLS) },
      ...this.history,
    ];

    let fullResponse = '';
    let iterations = 0;

    while (iterations < 5) {
      iterations++;

      // Stream response
      let response = '';
      try {
        for await (const token of this.llm.stream(messages[messages.length - 1].content, {
          history: messages.slice(1, -1),
          temperature: this.settings.temperature,
          maxTokens: this.settings.maxTokens,
        })) {
          response += token;
          this.onToken(token);
        }
      } catch (e) {
        this.onError(e);
        response = `Error: ${e.message}`;
      }

      fullResponse += response;

      // Check for tool calls
      const toolCalls = parseToolCalls(response);
      if (toolCalls.length === 0) break;

      // Execute first tool call
      const call = toolCalls[0];
      this.onToolStart(call);

      const result = await this._executeTool(call.name, call.params);
      this.onToolEnd({ ...call, result });

      // Add to history for continuation
      this.history.push({ role: 'assistant', content: response });
      const resultText = `\n[Tool ${call.name} returned: ${JSON.stringify(result)}]\n`;
      this.history.push({ role: 'user', content: resultText });

      messages.push({ role: 'assistant', content: response });
      messages.push({ role: 'user', content: resultText });

      fullResponse += resultText;
    }

    // Add final response
    this.history.push({ role: 'assistant', content: fullResponse });

    return fullResponse;
  }

  /**
   * Execute tool
   */
  async _executeTool(name, params) {
    try {
      switch (name) {
        case 'web_fetch':
          return await this._webFetch(params.url);
        case 'file_read':
          return this._fileRead(params.path);
        case 'file_write':
          return this._fileWrite(params.path, params.content);
        case 'file_list':
          return this._fileList(params.path || '/');
        case 'calculate':
          return this._calculate(params.expression);
        case 'memory_get':
          return { value: this.memory.get(params.key) ?? null };
        case 'memory_set':
          this.memory.set(params.key, params.value);
          this._saveMemory();
          return { stored: true };
        default:
          return { error: 'Unknown tool' };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  async _webFetch(url) {
    try {
      const fetchUrl = this.settings.corsProxy + encodeURIComponent(url);
      const res = await fetch(fetchUrl);
      if (!res.ok) return { error: `HTTP ${res.status}` };

      let text = await res.text();
      // Strip HTML
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);

      return { content: text, length: text.length };
    } catch (e) {
      return { error: e.message };
    }
  }

  _fileRead(path) {
    if (!this.vfs.exists(path)) return { error: 'Not found' };
    return { content: this.vfs.readFile(path) };
  }

  _fileWrite(path, content) {
    this.vfs.writeFile(path, content);
    return { written: content.length };
  }

  _fileList(path) {
    if (!this.vfs.exists(path)) return { error: 'Not found' };
    return { items: this.vfs.readdir(path) };
  }

  _calculate(expr) {
    // Safe math evaluation
    if (!/^[\d\s+\-*/().%^]+$/.test(expr)) {
      return { error: 'Invalid expression' };
    }
    try {
      const result = Function(`"use strict"; return (${expr})`)();
      return { result };
    } catch (e) {
      return { error: e.message };
    }
  }

  _trimHistory() {
    if (this.history.length > this.settings.maxHistory * 2) {
      this.history = this.history.slice(-this.settings.maxHistory * 2);
    }
  }

  _loadMemory() {
    try {
      const data = localStorage.getItem('agent-v2-memory');
      if (data) this.memory = new Map(JSON.parse(data));
    } catch (e) {}
  }

  _saveMemory() {
    try {
      localStorage.setItem('agent-v2-memory', JSON.stringify([...this.memory]));
    } catch (e) {}
  }

  /**
   * Export conversation
   */
  exportChat() {
    return {
      history: this.history,
      memory: [...this.memory],
      settings: this.settings,
      exported: new Date().toISOString(),
    };
  }

  /**
   * Import conversation
   */
  importChat(data) {
    if (data.history) this.history = data.history;
    if (data.memory) this.memory = new Map(data.memory);
    if (data.settings) Object.assign(this.settings, data.settings);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Destroy agent
   */
  async destroy() {
    if (this.llm) await this.llm.unload();
    this.history = [];
  }
}

export default AgentV2;
