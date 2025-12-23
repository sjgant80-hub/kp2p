/**
 * @file src/llm/agent-v4.js
 * @desc LLM Agent v4 - MCP-enabled agent with tool server
 *
 * Features:
 * - Built-in MCP server for tool access
 * - Works with any MCP-compatible model
 * - Tool definitions in standard MCP format
 * - Streaming responses
 * - Visual rendering support
 */

import { LocalLLM } from './local.js';
import { MCPServer, TOOL_DEFINITIONS } from './mcp-server.js';

/**
 * Build system prompt with MCP tool format
 */
function buildSystemPrompt(tools) {
  let prompt = `You are a helpful AI assistant with access to tools via MCP (Model Context Protocol).

## Available Tools
`;

  for (const tool of tools) {
    prompt += `\n### ${tool.name}\n${tool.description}\n`;
    if (tool.inputSchema?.properties) {
      const props = Object.entries(tool.inputSchema.properties)
        .map(([k, v]) => `  - ${k}: ${v.description || v.type}`)
        .join('\n');
      prompt += `Parameters:\n${props}\n`;
    }
  }

  prompt += `
## How to Use Tools

To use a tool, output a JSON block in this format:
\`\`\`json
{"tool": "tool_name", "args": {"param1": "value1"}}
\`\`\`

Examples:
\`\`\`json
{"tool": "calculate", "args": {"expression": "125 * 0.18"}}
\`\`\`

\`\`\`json
{"tool": "render_html", "args": {"html": "<h1>Hello!</h1>", "title": "Greeting"}}
\`\`\`

\`\`\`json
{"tool": "file_write", "args": {"path": "/notes.txt", "content": "My notes here"}}
\`\`\`

After calling a tool, wait for the result before continuing.

## Guidelines
- Use tools when they help answer the user's request
- For visual output, use render_html to display formatted content
- Be concise and helpful
- Explain what you're doing before using a tool
`;

  return prompt;
}

/**
 * Parse tool calls from response
 */
function parseToolCalls(text) {
  const calls = [];

  // JSON code block format
  const jsonBlocks = text.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g);
  for (const match of jsonBlocks) {
    try {
      const json = JSON.parse(match[1]);
      if (json.tool) {
        calls.push({
          name: json.tool,
          args: json.args || json.params || {},
          raw: match[0],
        });
      }
    } catch (e) {}
  }

  // Inline JSON format (fallback)
  if (calls.length === 0) {
    const inlineMatch = text.match(/\{"tool":\s*"(\w+)"[^}]*\}/);
    if (inlineMatch) {
      try {
        const json = JSON.parse(inlineMatch[0]);
        calls.push({
          name: json.tool,
          args: json.args || json.params || {},
          raw: inlineMatch[0],
        });
      } catch (e) {}
    }
  }

  return calls;
}

/**
 * Agent v4 - MCP-enabled agent
 */
export class AgentV4 {
  constructor(options = {}) {
    this.llm = null;
    this.mcp = null;
    this.history = [];
    this.settings = {
      temperature: 0.7,
      maxTokens: 2048,
      maxHistory: 20,
      ...options.settings,
    };

    // Callbacks
    this.onToken = options.onToken || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onToolResult = options.onToolResult || (() => {});
    this.onRender = options.onRender || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Initialize agent with MCP server
   */
  async init(modelId, onProgress) {
    // Initialize LLM
    this.llm = new LocalLLM({
      model: modelId,
      onProgress: onProgress || (() => {}),
    });
    await this.llm.load();

    // Initialize MCP server
    this.mcp = new MCPServer({
      onRender: (data) => this.onRender(data),
      onToolCall: (call) => this.onToolCall(call),
      onToolResult: (result) => this.onToolResult(result),
    });
    this.mcp.start();

    return this;
  }

  /**
   * Get MCP server instance (for external access)
   */
  getMCPServer() {
    return this.mcp;
  }

  /**
   * Get available tools
   */
  getTools() {
    return TOOL_DEFINITIONS;
  }

  /**
   * Chat with the agent
   */
  async chat(message) {
    this.history.push({ role: 'user', content: message });
    this._trimHistory();

    const systemPrompt = buildSystemPrompt(this.getTools());
    const messages = [
      { role: 'system', content: systemPrompt },
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

      // Execute first tool call via MCP
      const call = toolCalls[0];
      const result = await this.mcp.callTool(call.name, call.args);

      // Add to history for continuation
      this.history.push({ role: 'assistant', content: response });
      const resultText = `\n\nTool result for ${call.name}:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\nContinue your response based on this result.`;
      this.history.push({ role: 'user', content: resultText });

      messages.push({ role: 'assistant', content: response });
      messages.push({ role: 'user', content: resultText });

      fullResponse += resultText;
    }

    // Add final response to history
    this.history.push({ role: 'assistant', content: fullResponse });

    return fullResponse;
  }

  /**
   * Call a tool directly (bypass LLM)
   */
  async callTool(name, args) {
    return this.mcp.callTool(name, args);
  }

  /**
   * Trim history to max length
   */
  _trimHistory() {
    if (this.history.length > this.settings.maxHistory * 2) {
      this.history = this.history.slice(-this.settings.maxHistory * 2);
    }
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
    if (this.mcp) {
      this.mcp.stop();
      this.mcp = null;
    }
    if (this.llm) {
      await this.llm.unload();
      this.llm = null;
    }
    this.history = [];
  }
}

export default AgentV4;
