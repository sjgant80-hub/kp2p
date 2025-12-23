/**
 * @file src/llm/mcp-server.js
 * @desc MCP (Model Context Protocol) Server for browser-based tool access
 *
 * Exposes tools via:
 * - BroadcastChannel for same-origin communication
 * - postMessage for iframe/window communication
 * - Direct function calls for same-context use
 *
 * Compatible with MCP protocol for AI model tool use.
 */

import { VFS } from '../os/vfs.js';

/**
 * Tool definitions in MCP format
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'render_html',
    description: 'Render HTML content in the preview pane',
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'HTML content to render' },
        title: { type: 'string', description: 'Title for the preview' },
      },
      required: ['html'],
    },
  },
  {
    name: 'web_fetch',
    description: 'Fetch content from a URL (with CORS proxy)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'calculate',
    description: 'Evaluate a mathematical expression',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression (e.g., "15 * 0.20")' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'file_read',
    description: 'Read contents of a file from virtual filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'file_write',
    description: 'Write content to a file in virtual filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'file_list',
    description: 'List files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path (default: /)' },
      },
    },
  },
  {
    name: 'memory_get',
    description: 'Retrieve a value from persistent memory',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to retrieve' },
      },
      required: ['key'],
    },
  },
  {
    name: 'memory_set',
    description: 'Store a value in persistent memory',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to store' },
        value: { type: 'string', description: 'Value to store' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'get_time',
    description: 'Get current date and time',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'json_parse',
    description: 'Parse a JSON string',
    inputSchema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON string to parse' },
      },
      required: ['json'],
    },
  },
];

/**
 * MCP Server - exposes tools to AI models
 */
export class MCPServer {
  constructor(options = {}) {
    this.id = options.id || 'mcp-server-' + Math.random().toString(36).slice(2, 8);
    this.vfs = options.vfs || new VFS({ storageKey: 'mcp-vfs' });
    this.memory = new Map();
    this.corsProxy = options.corsProxy || 'https://api.allorigins.win/raw?url=';

    // Callbacks
    this.onRender = options.onRender || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onToolResult = options.onToolResult || (() => {});

    // Communication channels
    this.channel = null;
    this.clients = new Set();

    // Load memory
    this._loadMemory();
  }

  /**
   * Start the MCP server
   */
  start() {
    // BroadcastChannel for same-origin communication
    try {
      this.channel = new BroadcastChannel('mcp-tools-' + this.id);
      this.channel.onmessage = (e) => this._handleMessage(e.data, 'broadcast');
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // postMessage for cross-origin/iframe communication
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'mcp-request') {
        this._handleMessage(e.data, 'postMessage', e.source);
      }
    });

    console.log(`[MCP] Server started: ${this.id}`);
    return this;
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  /**
   * Get tool definitions (MCP format)
   */
  getTools() {
    return TOOL_DEFINITIONS;
  }

  /**
   * Call a tool directly
   */
  async callTool(name, params = {}) {
    this.onToolCall({ name, params });

    const result = await this._executeTool(name, params);

    this.onToolResult({ name, params, result });
    return result;
  }

  /**
   * Handle incoming MCP message
   */
  async _handleMessage(msg, source, replyTo) {
    if (msg.method === 'tools/list') {
      this._reply(replyTo, source, {
        id: msg.id,
        result: { tools: this.getTools() },
      });
    }

    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params || {};
      const result = await this.callTool(name, args);
      this._reply(replyTo, source, {
        id: msg.id,
        result: { content: [{ type: 'text', text: JSON.stringify(result) }] },
      });
    }
  }

  /**
   * Reply to a message
   */
  _reply(target, source, msg) {
    if (source === 'broadcast' && this.channel) {
      this.channel.postMessage({ type: 'mcp-response', ...msg });
    } else if (target) {
      target.postMessage({ type: 'mcp-response', ...msg }, '*');
    }
  }

  /**
   * Execute a tool
   */
  async _executeTool(name, params) {
    try {
      switch (name) {
        case 'render_html':
          this.onRender({ html: params.html, title: params.title });
          return { success: true, rendered: true };

        case 'web_fetch':
          return await this._webFetch(params.url);

        case 'calculate':
          return this._calculate(params.expression);

        case 'file_read':
          return this._fileRead(params.path);

        case 'file_write':
          return this._fileWrite(params.path, params.content);

        case 'file_list':
          return this._fileList(params.path || '/');

        case 'memory_get':
          return { key: params.key, value: this.memory.get(params.key) ?? null };

        case 'memory_set':
          this.memory.set(params.key, params.value);
          this._saveMemory();
          return { success: true };

        case 'get_time':
          return {
            iso: new Date().toISOString(),
            local: new Date().toLocaleString(),
            timestamp: Date.now(),
          };

        case 'json_parse':
          try {
            return { data: JSON.parse(params.json) };
          } catch (e) {
            return { error: 'Invalid JSON: ' + e.message };
          }

        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  async _webFetch(url) {
    try {
      const fetchUrl = this.corsProxy + encodeURIComponent(url);
      const res = await fetch(fetchUrl);
      if (!res.ok) return { error: `HTTP ${res.status}` };

      let text = await res.text();
      // Strip HTML tags for cleaner output
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);

      return { url, content: text, length: text.length };
    } catch (e) {
      return { error: e.message };
    }
  }

  _calculate(expr) {
    // Safe math evaluation
    if (!/^[\d\s+\-*/().%^,]+$/.test(expr)) {
      return { error: 'Invalid expression (only math operators allowed)' };
    }
    try {
      const result = Function(`"use strict"; return (${expr})`)();
      return { expression: expr, result };
    } catch (e) {
      return { error: e.message };
    }
  }

  _fileRead(path) {
    try {
      if (!this.vfs.exists(path)) {
        return { error: `File not found: ${path}` };
      }
      const content = this.vfs.readFile(path);
      return { path, content, size: content.length };
    } catch (e) {
      return { error: e.message };
    }
  }

  _fileWrite(path, content) {
    try {
      this.vfs.writeFile(path, content);
      return { path, written: content.length, success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  _fileList(path) {
    try {
      if (!this.vfs.exists(path)) {
        return { error: `Directory not found: ${path}` };
      }
      const items = this.vfs.readdir(path);
      return { path, items };
    } catch (e) {
      return { error: e.message };
    }
  }

  _loadMemory() {
    try {
      const data = localStorage.getItem('mcp-memory');
      if (data) this.memory = new Map(JSON.parse(data));
    } catch (e) {}
  }

  _saveMemory() {
    try {
      localStorage.setItem('mcp-memory', JSON.stringify([...this.memory]));
    } catch (e) {}
  }
}

/**
 * MCP Client - for connecting to an MCP server
 */
export class MCPClient {
  constructor(options = {}) {
    this.serverId = options.serverId;
    this.channel = null;
    this.pending = new Map();
    this.nextId = 1;
  }

  /**
   * Connect to server
   */
  connect() {
    this.channel = new BroadcastChannel('mcp-tools-' + this.serverId);
    this.channel.onmessage = (e) => {
      if (e.data?.type === 'mcp-response') {
        const resolver = this.pending.get(e.data.id);
        if (resolver) {
          resolver(e.data.result);
          this.pending.delete(e.data.id);
        }
      }
    };
    return this;
  }

  /**
   * List available tools
   */
  async listTools() {
    return this._request('tools/list');
  }

  /**
   * Call a tool
   */
  async callTool(name, args) {
    return this._request('tools/call', { name, arguments: args });
  }

  async _request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.channel.postMessage({ type: 'mcp-request', id, method, params });
      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve({ error: 'Timeout' });
        }
      }, 30000);
    });
  }

  disconnect() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export default MCPServer;
