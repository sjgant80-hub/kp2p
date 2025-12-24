/**
 * LLM Tool UDTs - Tag-based tool definitions for local LLM agents
 *
 * Provides a standardized way to define tools that LLMs can call,
 * with minified tag format for efficient context usage.
 */

// Tool parameter types
export const ParamType = {
  STR: 'string',
  INT: 'integer',
  NUM: 'number',
  BOOL: 'boolean',
  ARR: 'array',
  OBJ: 'object',
  ANY: 'any'
};

// Tool categories
export const ToolCategory = {
  WEB: 'web',           // Network/HTTP
  FILE: 'file',         // File system
  CODE: 'code',         // Code execution
  DATA: 'data',         // Data manipulation
  MEM: 'memory',        // Persistent storage
  SYS: 'system',        // System info
  UI: 'ui',             // User interface
  TAG: 'tag'            // Tag/UDT operations
};

/**
 * Tool UDT - defines a callable tool
 */
export const ToolUDT = {
  name: 'Tool',
  members: {
    N: { type: 'String', desc: 'tool name' },
    D: { type: 'String', desc: 'description' },
    C: { type: 'String', desc: 'category' },
    P: { type: 'Array', desc: 'parameters' },
    R: { type: 'Object', desc: 'return type' },
    E: { type: 'Boolean', desc: 'enabled', default: true }
  }
};

/**
 * Parameter UDT - defines a tool parameter
 */
export const ParamUDT = {
  name: 'Param',
  members: {
    N: { type: 'String', desc: 'param name' },
    T: { type: 'String', desc: 'type' },
    D: { type: 'String', desc: 'description' },
    R: { type: 'Boolean', desc: 'required', default: true },
    V: { type: 'Any', desc: 'default value' }
  }
};

/**
 * Tool Call UDT - represents a tool invocation
 */
export const ToolCallUDT = {
  name: 'ToolCall',
  members: {
    T: { type: 'String', desc: 'tool name' },
    P: { type: 'Object', desc: 'parameters' },
    I: { type: 'String', desc: 'call id' }
  }
};

/**
 * Tool Result UDT - represents tool execution result
 */
export const ToolResultUDT = {
  name: 'ToolResult',
  members: {
    I: { type: 'String', desc: 'call id' },
    S: { type: 'Boolean', desc: 'success' },
    D: { type: 'Any', desc: 'data/result' },
    E: { type: 'String', desc: 'error message' }
  }
};

/**
 * Standard tool definitions - minified format
 */
export const TOOLS = {
  // === WEB ===
  web_fetch: {
    N: 'web_fetch',
    D: 'Fetch content from URL. Returns text/HTML.',
    C: 'web',
    P: [
      { N: 'url', T: 'string', D: 'URL to fetch', R: true },
      { N: 'headers', T: 'object', D: 'Request headers', R: false }
    ],
    R: { T: 'object', D: '{url, content, status}' }
  },

  web_search: {
    N: 'web_search',
    D: 'Search the web. Returns results.',
    C: 'web',
    P: [
      { N: 'query', T: 'string', D: 'Search query', R: true },
      { N: 'limit', T: 'integer', D: 'Max results', R: false, V: 5 }
    ],
    R: { T: 'array', D: '[{title, url, snippet}]' }
  },

  // === FILE ===
  file_read: {
    N: 'file_read',
    D: 'Read file contents',
    C: 'file',
    P: [
      { N: 'path', T: 'string', D: 'File path', R: true }
    ],
    R: { T: 'object', D: '{path, content, size}' }
  },

  file_write: {
    N: 'file_write',
    D: 'Write content to file',
    C: 'file',
    P: [
      { N: 'path', T: 'string', D: 'File path', R: true },
      { N: 'content', T: 'string', D: 'Content to write', R: true },
      { N: 'append', T: 'boolean', D: 'Append mode', R: false, V: false }
    ],
    R: { T: 'object', D: '{path, written, success}' }
  },

  file_list: {
    N: 'file_list',
    D: 'List files in directory',
    C: 'file',
    P: [
      { N: 'path', T: 'string', D: 'Directory path', R: false, V: '/' }
    ],
    R: { T: 'object', D: '{path, items:[{name,type,size}]}' }
  },

  file_delete: {
    N: 'file_delete',
    D: 'Delete file or directory',
    C: 'file',
    P: [
      { N: 'path', T: 'string', D: 'Path to delete', R: true }
    ],
    R: { T: 'object', D: '{path, deleted}' }
  },

  // === CODE ===
  code_run: {
    N: 'code_run',
    D: 'Execute JavaScript code in sandbox',
    C: 'code',
    P: [
      { N: 'code', T: 'string', D: 'JS code to run', R: true },
      { N: 'timeout', T: 'integer', D: 'Timeout ms', R: false, V: 5000 }
    ],
    R: { T: 'object', D: '{result, type, logs}' }
  },

  code_eval: {
    N: 'code_eval',
    D: 'Evaluate expression (math/logic)',
    C: 'code',
    P: [
      { N: 'expr', T: 'string', D: 'Expression', R: true }
    ],
    R: { T: 'object', D: '{result, type}' }
  },

  // === MEMORY ===
  memory_get: {
    N: 'memory_get',
    D: 'Get value from persistent memory',
    C: 'memory',
    P: [
      { N: 'key', T: 'string', D: 'Key to retrieve', R: true }
    ],
    R: { T: 'object', D: '{key, value, found}' }
  },

  memory_set: {
    N: 'memory_set',
    D: 'Store value in persistent memory',
    C: 'memory',
    P: [
      { N: 'key', T: 'string', D: 'Key to store', R: true },
      { N: 'value', T: 'any', D: 'Value to store', R: true }
    ],
    R: { T: 'object', D: '{key, stored}' }
  },

  memory_list: {
    N: 'memory_list',
    D: 'List all memory keys',
    C: 'memory',
    P: [],
    R: { T: 'array', D: '[keys]' }
  },

  memory_clear: {
    N: 'memory_clear',
    D: 'Clear all memory',
    C: 'memory',
    P: [
      { N: 'prefix', T: 'string', D: 'Key prefix filter', R: false }
    ],
    R: { T: 'object', D: '{cleared}' }
  },

  // === DATA ===
  json_parse: {
    N: 'json_parse',
    D: 'Parse JSON string',
    C: 'data',
    P: [
      { N: 'text', T: 'string', D: 'JSON string', R: true }
    ],
    R: { T: 'object', D: '{data, error}' }
  },

  json_stringify: {
    N: 'json_stringify',
    D: 'Convert to JSON string',
    C: 'data',
    P: [
      { N: 'data', T: 'any', D: 'Data to stringify', R: true },
      { N: 'pretty', T: 'boolean', D: 'Pretty print', R: false, V: false }
    ],
    R: { T: 'string', D: 'JSON string' }
  },

  // === SYSTEM ===
  sys_time: {
    N: 'sys_time',
    D: 'Get current time',
    C: 'system',
    P: [
      { N: 'format', T: 'string', D: 'Format (iso|unix|local)', R: false, V: 'iso' }
    ],
    R: { T: 'string', D: 'Formatted time' }
  },

  sys_info: {
    N: 'sys_info',
    D: 'Get system information',
    C: 'system',
    P: [],
    R: { T: 'object', D: '{platform, memory, gpu}' }
  },

  // === TAG/UDT ===
  tag_read: {
    N: 'tag_read',
    D: 'Read tag value from UNS',
    C: 'tag',
    P: [
      { N: 'path', T: 'string', D: 'Tag path', R: true }
    ],
    R: { T: 'object', D: '{path, value, quality, timestamp}' }
  },

  tag_write: {
    N: 'tag_write',
    D: 'Write tag value to UNS',
    C: 'tag',
    P: [
      { N: 'path', T: 'string', D: 'Tag path', R: true },
      { N: 'value', T: 'any', D: 'Value to write', R: true }
    ],
    R: { T: 'object', D: '{path, written, quality}' }
  },

  tag_browse: {
    N: 'tag_browse',
    D: 'Browse tags at path',
    C: 'tag',
    P: [
      { N: 'path', T: 'string', D: 'Browse path', R: false, V: '/' }
    ],
    R: { T: 'object', D: '{path, tags:[{name, type, hasChildren}]}' }
  },

  udt_create: {
    N: 'udt_create',
    D: 'Create UDT instance',
    C: 'tag',
    P: [
      { N: 'type', T: 'string', D: 'UDT type name', R: true },
      { N: 'path', T: 'string', D: 'Tag path', R: true },
      { N: 'values', T: 'object', D: 'Initial values', R: false }
    ],
    R: { T: 'object', D: '{path, type, created}' }
  }
};

/**
 * Generate system prompt for tools
 */
export function generateToolPrompt(tools = TOOLS, options = {}) {
  const { format = 'full', categories = null } = options;

  let toolList = Object.values(tools);

  // Filter by category if specified
  if (categories) {
    toolList = toolList.filter(t => categories.includes(t.C));
  }

  if (format === 'mini') {
    // Minimal format for small context windows
    return toolList.map(t => {
      const params = t.P.map(p => `${p.N}${p.R ? '*' : '?'}:${p.T}`).join(',');
      return `${t.N}(${params}): ${t.D}`;
    }).join('\n');
  }

  // Full format
  let prompt = 'Available tools:\n\n';

  for (const tool of toolList) {
    prompt += `### ${tool.N}\n`;
    prompt += `${tool.D}\n`;
    prompt += 'Parameters:\n';

    for (const p of tool.P) {
      const req = p.R ? '(required)' : `(optional, default: ${p.V ?? 'null'})`;
      prompt += `- ${p.N} (${p.T}): ${p.D} ${req}\n`;
    }

    prompt += `Returns: ${tool.R.D}\n\n`;
  }

  prompt += `
To call a tool, use this format:
\`\`\`tool
{"T":"tool_name","P":{"param1":"value1"}}
\`\`\`

After a tool returns, continue your response based on the result.
`;

  return prompt;
}

/**
 * Parse tool call from LLM response
 */
export function parseToolCall(response) {
  // Look for ```tool {...} ``` block
  const match = response.match(/```tool\s*([\s\S]*?)```/);
  if (!match) return null;

  try {
    const json = JSON.parse(match[1].trim());

    // Support both minified (T/P) and full (tool/params) format
    const toolName = json.T || json.tool;
    const params = json.P || json.params || {};

    if (toolName && TOOLS[toolName]) {
      return {
        tool: toolName,
        params,
        id: json.I || crypto.randomUUID?.() || Date.now().toString()
      };
    }
  } catch (e) {
    console.warn('Failed to parse tool call:', e);
  }

  return null;
}

/**
 * Format tool result for LLM
 */
export function formatToolResult(toolName, result, error = null) {
  if (error) {
    return {
      I: result?.id || Date.now().toString(),
      S: false,
      E: error.message || String(error)
    };
  }

  return {
    I: result?.id || Date.now().toString(),
    S: true,
    D: result
  };
}

/**
 * Create a tool registry for an agent
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.handlers = new Map();
  }

  /**
   * Register a tool
   */
  register(definition, handler) {
    const name = definition.N;
    this.tools.set(name, definition);
    this.handlers.set(name, handler);
    return this;
  }

  /**
   * Register multiple tools
   */
  registerAll(definitions, handlers) {
    for (const [name, def] of Object.entries(definitions)) {
      if (handlers[name]) {
        this.register(def, handlers[name]);
      }
    }
    return this;
  }

  /**
   * Execute a tool call
   */
  async execute(toolName, params) {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      return formatToolResult(toolName, null, new Error(`Unknown tool: ${toolName}`));
    }

    try {
      const result = await handler(params);
      return formatToolResult(toolName, result);
    } catch (e) {
      return formatToolResult(toolName, null, e);
    }
  }

  /**
   * Get tool definitions
   */
  getTools() {
    return Object.fromEntries(this.tools);
  }

  /**
   * Generate prompt for registered tools
   */
  getPrompt(options) {
    return generateToolPrompt(this.getTools(), options);
  }
}

// Export UDTs
export const UDTs = {
  Tool: ToolUDT,
  Param: ParamUDT,
  ToolCall: ToolCallUDT,
  ToolResult: ToolResultUDT
};
