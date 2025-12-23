/**
 * @file src/llm/agent.js
 * @desc LLM Agent with tool capabilities (web, files, code execution)
 *
 * TOOLS:
 * - web_fetch: Fetch content from URLs
 * - file_read: Read files from VFS
 * - file_write: Write files to VFS
 * - file_list: List directory contents
 * - code_run: Execute JavaScript in sandbox
 * - memory_get/set: Persistent key-value storage
 */

import { LocalLLM } from './local.js';
import { VFS } from '../os/vfs.js';
import { Sandbox } from '../core/sandbox.js';

/**
 * Tool definitions for the agent
 */
export const TOOLS = {
  web_fetch: {
    name: 'web_fetch',
    description: 'Fetch content from a URL. Returns the text content of the page.',
    parameters: {
      url: { type: 'string', description: 'The URL to fetch', required: true },
    },
  },
  file_read: {
    name: 'file_read',
    description: 'Read the contents of a file from the virtual file system.',
    parameters: {
      path: { type: 'string', description: 'File path to read', required: true },
    },
  },
  file_write: {
    name: 'file_write',
    description: 'Write content to a file in the virtual file system.',
    parameters: {
      path: { type: 'string', description: 'File path to write', required: true },
      content: { type: 'string', description: 'Content to write', required: true },
    },
  },
  file_list: {
    name: 'file_list',
    description: 'List files and directories at a path.',
    parameters: {
      path: { type: 'string', description: 'Directory path to list', required: false },
    },
  },
  code_run: {
    name: 'code_run',
    description: 'Execute JavaScript code in a secure sandbox. Returns the result.',
    parameters: {
      code: { type: 'string', description: 'JavaScript code to execute', required: true },
    },
  },
  memory_get: {
    name: 'memory_get',
    description: 'Get a value from persistent memory storage.',
    parameters: {
      key: { type: 'string', description: 'Key to retrieve', required: true },
    },
  },
  memory_set: {
    name: 'memory_set',
    description: 'Store a value in persistent memory.',
    parameters: {
      key: { type: 'string', description: 'Key to store', required: true },
      value: { type: 'string', description: 'Value to store', required: true },
    },
  },
};

/**
 * Format tools for LLM system prompt
 */
function formatToolsForPrompt() {
  let text = 'You have access to the following tools:\n\n';
  for (const [name, tool] of Object.entries(TOOLS)) {
    text += `### ${name}\n${tool.description}\n`;
    text += 'Parameters:\n';
    for (const [pname, pdef] of Object.entries(tool.parameters)) {
      text += `- ${pname} (${pdef.type}${pdef.required ? ', required' : ''}): ${pdef.description}\n`;
    }
    text += '\n';
  }
  text += `
To use a tool, respond with a JSON block like this:
\`\`\`tool
{"tool": "tool_name", "params": {"param1": "value1"}}
\`\`\`

After using a tool, you will receive the result and can continue your response.
Only use tools when necessary to complete the user's request.
`;
  return text;
}

/**
 * LLM Agent with tool execution
 */
export class Agent {
  constructor(options = {}) {
    this.llm = null;
    this.vfs = null;
    this.sandbox = null;
    this.memory = new Map();
    this.history = [];
    this.maxHistory = options.maxHistory || 20;
    this.onProgress = options.onProgress || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onToolResult = options.onToolResult || (() => {});

    // Web fetch settings
    this.corsProxy = options.corsProxy || 'https://api.allorigins.win/raw?url=';
    this.allowedDomains = options.allowedDomains || null; // null = allow all
  }

  /**
   * Initialize the agent
   */
  async init(modelId, progressCallback) {
    // Initialize LLM
    this.llm = new LocalLLM({
      model: modelId,
      onProgress: progressCallback || (() => {}),
    });
    await this.llm.load();

    // Initialize VFS
    this.vfs = new VFS({ storageKey: 'agent-vfs' });

    // Initialize sandbox (may fail in some environments)
    try {
      this.sandbox = new Sandbox({ id: 'agent-sandbox', timeout: 10000 });
      await this.sandbox.start();
    } catch (e) {
      console.warn('Sandbox initialization failed:', e.message);
      this.sandbox = null;
    }

    // Load memory from localStorage
    this._loadMemory();

    return this;
  }

  /**
   * Generate system prompt with tools
   */
  _systemPrompt() {
    return `You are a helpful AI assistant with access to tools for web browsing, file management, and code execution.

${formatToolsForPrompt()}

Be concise and helpful. When you need information from the web, files, or need to compute something, use the appropriate tool.
Always explain what you're doing before using a tool.`;
  }

  /**
   * Chat with the agent
   */
  async chat(userMessage, options = {}) {
    // Add to history
    this.history.push({ role: 'user', content: userMessage });

    // Trim history if too long
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Build messages
    const messages = [
      { role: 'system', content: this._systemPrompt() },
      ...this.history,
    ];

    // Generate response
    let response = await this.llm.chat(messages, {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1024,
    });

    // Check for tool calls and execute them
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      const toolCall = this._parseToolCall(response);
      if (!toolCall) break;

      iterations++;
      this.onToolCall(toolCall);

      // Execute the tool
      const result = await this._executeTool(toolCall.tool, toolCall.params);
      this.onToolResult({ tool: toolCall.tool, result });

      // Add tool interaction to history
      this.history.push({ role: 'assistant', content: response });
      this.history.push({
        role: 'user',
        content: `Tool result for ${toolCall.tool}:\n${JSON.stringify(result, null, 2)}\n\nContinue your response based on this result.`
      });

      // Generate continuation
      const continueMessages = [
        { role: 'system', content: this._systemPrompt() },
        ...this.history,
      ];

      response = await this.llm.chat(continueMessages, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1024,
      });
    }

    // Add final response to history
    this.history.push({ role: 'assistant', content: response });

    return response;
  }

  /**
   * Parse tool call from response
   */
  _parseToolCall(response) {
    // Look for ```tool ... ``` block
    const match = response.match(/```tool\s*([\s\S]*?)```/);
    if (!match) return null;

    try {
      const json = JSON.parse(match[1].trim());
      if (json.tool && TOOLS[json.tool]) {
        return { tool: json.tool, params: json.params || {} };
      }
    } catch (e) {
      console.warn('Failed to parse tool call:', e);
    }
    return null;
  }

  /**
   * Execute a tool
   */
  async _executeTool(name, params) {
    try {
      switch (name) {
        case 'web_fetch':
          return await this._toolWebFetch(params.url);
        case 'file_read':
          return this._toolFileRead(params.path);
        case 'file_write':
          return this._toolFileWrite(params.path, params.content);
        case 'file_list':
          return this._toolFileList(params.path || '/');
        case 'code_run':
          return await this._toolCodeRun(params.code);
        case 'memory_get':
          return this._toolMemoryGet(params.key);
        case 'memory_set':
          return this._toolMemorySet(params.key, params.value);
        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  // === TOOL IMPLEMENTATIONS ===

  async _toolWebFetch(url) {
    // Validate URL
    if (!url || typeof url !== 'string') {
      return { error: 'Invalid URL' };
    }

    // Check allowed domains
    if (this.allowedDomains) {
      const urlObj = new URL(url);
      if (!this.allowedDomains.includes(urlObj.hostname)) {
        return { error: `Domain not allowed: ${urlObj.hostname}` };
      }
    }

    try {
      // Use CORS proxy for cross-origin requests
      const fetchUrl = this.corsProxy ? this.corsProxy + encodeURIComponent(url) : url;
      const res = await fetch(fetchUrl, {
        headers: { 'Accept': 'text/html,text/plain,application/json' }
      });

      if (!res.ok) {
        return { error: `HTTP ${res.status}: ${res.statusText}` };
      }

      let content = await res.text();

      // Truncate if too long
      if (content.length > 10000) {
        content = content.slice(0, 10000) + '\n... (truncated)';
      }

      // Basic HTML stripping
      content = content
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return { url, content, length: content.length };
    } catch (e) {
      return { error: `Fetch failed: ${e.message}` };
    }
  }

  _toolFileRead(path) {
    if (!this.vfs.exists(path)) {
      return { error: `File not found: ${path}` };
    }
    const content = this.vfs.readFile(path);
    return { path, content, size: content.length };
  }

  _toolFileWrite(path, content) {
    this.vfs.writeFile(path, content);
    return { path, written: content.length, success: true };
  }

  _toolFileList(path) {
    if (!this.vfs.exists(path)) {
      return { error: `Directory not found: ${path}` };
    }
    const items = this.vfs.readdir(path);
    const details = items.map(name => {
      const fullPath = path === '/' ? '/' + name : path + '/' + name;
      const stat = this.vfs.stat(fullPath);
      return { name, type: stat?.type || 'unknown', size: stat?.size || 0 };
    });
    return { path, items: details };
  }

  async _toolCodeRun(code) {
    if (!this.sandbox) {
      // Fallback: evaluate simple expressions
      try {
        // Only allow simple math expressions for safety
        if (/^[\d\s+\-*/().]+$/.test(code)) {
          const result = eval(code);
          return { result, type: typeof result };
        }
        return { error: 'Sandbox not available. Only math expressions allowed.' };
      } catch (e) {
        return { error: e.message };
      }
    }

    try {
      const result = await this.sandbox.exec('compute', code);
      return { result, type: typeof result };
    } catch (e) {
      return { error: e.message };
    }
  }

  _toolMemoryGet(key) {
    const value = this.memory.get(key);
    return { key, value: value !== undefined ? value : null, found: value !== undefined };
  }

  _toolMemorySet(key, value) {
    this.memory.set(key, value);
    this._saveMemory();
    return { key, stored: true };
  }

  // === MEMORY PERSISTENCE ===

  _loadMemory() {
    try {
      const data = localStorage.getItem('agent-memory');
      if (data) {
        this.memory = new Map(JSON.parse(data));
      }
    } catch (e) {}
  }

  _saveMemory() {
    try {
      localStorage.setItem('agent-memory', JSON.stringify([...this.memory]));
    } catch (e) {}
  }

  // === CLEANUP ===

  async destroy() {
    if (this.sandbox) {
      await this.sandbox.stop();
    }
    this.history = [];
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.history];
  }
}

export default Agent;
