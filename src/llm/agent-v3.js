/**
 * @file src/llm/agent-v3.js
 * @desc LLM Agent v3 - Visual agent with HTML rendering capabilities
 *
 * NEW IN v3:
 * - render_html: Display HTML in iframe preview
 * - render_chart: Create simple charts
 * - render_markdown: Render markdown as HTML
 * - screenshot: Capture current preview (placeholder)
 */

import { LocalLLM } from './local.js';
import { VFS } from '../os/vfs.js';

/**
 * Tool definitions
 */
export const TOOLS = {
  render_html: {
    name: 'render_html',
    icon: '🖼️',
    description: 'Display HTML content in the preview pane. Use for visual outputs, charts, diagrams, etc.',
    parameters: {
      html: { type: 'string', description: 'HTML content to render', required: true },
      title: { type: 'string', description: 'Title for the preview', required: false },
    },
  },
  render_chart: {
    name: 'render_chart',
    icon: '📊',
    description: 'Create a simple bar/pie chart from data',
    parameters: {
      type: { type: 'string', description: 'Chart type: bar, pie, line', required: true },
      data: { type: 'string', description: 'JSON array of {label, value} objects', required: true },
      title: { type: 'string', description: 'Chart title', required: false },
    },
  },
  web_fetch: {
    name: 'web_fetch',
    icon: '🌐',
    description: 'Fetch content from a URL',
    parameters: {
      url: { type: 'string', description: 'URL to fetch', required: true },
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
 * Build system prompt
 */
function buildSystemPrompt(tools) {
  let prompt = `You are a helpful AI assistant with visual output capabilities. You can render HTML, create charts, and display visual content in a preview pane.

## Available Tools
`;

  for (const tool of Object.values(tools)) {
    prompt += `\n### ${tool.icon} ${tool.name}\n${tool.description}\n`;
  }

  prompt += `
## Tool Usage
To use a tool, write:
<tool name="tool_name" param1="value1" param2="value2"/>

For multi-line content like HTML, use:
<tool name="render_html">
<html>Your HTML here</html>
</tool>

## Visual Output Guidelines
- Use render_html to show formatted results, tables, lists
- Create charts for numerical data visualization
- Use colors and styling to make output clear
- Always provide alt text for accessibility

## Examples
User: "Show me a pie chart of browser market share"
<tool name="render_chart" type="pie" data='[{"label":"Chrome","value":65},{"label":"Safari","value":19},{"label":"Firefox","value":4}]' title="Browser Market Share"/>

User: "Create a colorful hello world page"
<tool name="render_html">
<!DOCTYPE html>
<html>
<body style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
<h1>Hello World!</h1>
</body>
</html>
</tool>
`;

  return prompt;
}

/**
 * Parse tool calls from text
 */
function parseToolCalls(text) {
  const calls = [];

  // Format 1: Self-closing <tool name="..." param="..."/>
  const selfClosing = /<tool\s+name="(\w+)"([^>]*?)\/>/g;
  let match;
  while ((match = selfClosing.exec(text)) !== null) {
    const name = match[1];
    const params = parseAttributes(match[2]);
    if (TOOLS[name]) {
      calls.push({ name, params, raw: match[0] });
    }
  }

  // Format 2: <tool name="...">content</tool> for multi-line
  const multiLine = /<tool\s+name="(\w+)"([^>]*)>([\s\S]*?)<\/tool>/g;
  while ((match = multiLine.exec(text)) !== null) {
    const name = match[1];
    const params = parseAttributes(match[2]);
    const content = match[3].trim();

    // For render_html, the content IS the html
    if (name === 'render_html') {
      params.html = content;
    }

    if (TOOLS[name]) {
      calls.push({ name, params, raw: match[0] });
    }
  }

  return calls;
}

function parseAttributes(str) {
  const params = {};
  const regex = /(\w+)=["']([^"']*)["']/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    params[m[1]] = m[2];
  }
  return params;
}

/**
 * Generate chart HTML
 */
function generateChartHTML(type, dataStr, title) {
  let data;
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    return `<div style="color:red">Invalid data format</div>`;
  }

  const colors = ['#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#f093fb', '#4facfe', '#667eea'];

  if (type === 'pie') {
    const total = data.reduce((s, d) => s + d.value, 0);
    let angle = 0;
    const slices = data.map((d, i) => {
      const pct = d.value / total;
      const start = angle;
      angle += pct * 360;
      return { ...d, pct, start, end: angle, color: colors[i % colors.length] };
    });

    // Create conic gradient for pie
    const gradient = slices.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ');

    return `
<!DOCTYPE html>
<html>
<head><style>
body { font-family: system-ui; background: #1a1a2e; color: #fff; margin: 0; padding: 20px; }
.chart { display: flex; align-items: center; gap: 30px; }
.pie { width: 200px; height: 200px; border-radius: 50%; background: conic-gradient(${gradient}); }
.legend { font-size: 14px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
.legend-color { width: 16px; height: 16px; border-radius: 4px; }
h2 { margin: 0 0 20px; color: #4facfe; }
</style></head>
<body>
<h2>${title || 'Pie Chart'}</h2>
<div class="chart">
<div class="pie"></div>
<div class="legend">
${slices.map(s => `<div class="legend-item"><div class="legend-color" style="background:${s.color}"></div>${s.label}: ${(s.pct * 100).toFixed(1)}%</div>`).join('')}
</div>
</div>
</body>
</html>`;
  }

  if (type === 'bar') {
    const max = Math.max(...data.map(d => d.value));
    return `
<!DOCTYPE html>
<html>
<head><style>
body { font-family: system-ui; background: #1a1a2e; color: #fff; margin: 0; padding: 20px; }
.chart { display: flex; align-items: flex-end; gap: 12px; height: 200px; padding: 20px 0; }
.bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar { width: 40px; background: linear-gradient(180deg, #4facfe, #00f2fe); border-radius: 4px 4px 0 0; transition: height 0.3s; }
.label { font-size: 12px; margin-top: 8px; color: #888; }
.value { font-size: 11px; margin-bottom: 4px; color: #4facfe; }
h2 { margin: 0 0 20px; color: #4facfe; }
</style></head>
<body>
<h2>${title || 'Bar Chart'}</h2>
<div class="chart">
${data.map((d, i) => `<div class="bar-wrap"><div class="value">${d.value}</div><div class="bar" style="height:${(d.value / max) * 150}px;background:linear-gradient(180deg,${colors[i % colors.length]},${colors[(i + 1) % colors.length]})"></div><div class="label">${d.label}</div></div>`).join('')}
</div>
</body>
</html>`;
  }

  if (type === 'line') {
    const max = Math.max(...data.map(d => d.value));
    const points = data.map((d, i) => {
      const x = 50 + (i / (data.length - 1)) * 300;
      const y = 180 - (d.value / max) * 150;
      return `${x},${y}`;
    }).join(' ');

    return `
<!DOCTYPE html>
<html>
<head><style>
body { font-family: system-ui; background: #1a1a2e; color: #fff; margin: 0; padding: 20px; }
h2 { margin: 0 0 20px; color: #4facfe; }
svg { display: block; }
.label { font-size: 10px; fill: #888; }
</style></head>
<body>
<h2>${title || 'Line Chart'}</h2>
<svg width="400" height="220">
<polyline points="${points}" fill="none" stroke="#4facfe" stroke-width="3"/>
${data.map((d, i) => {
  const x = 50 + (i / (data.length - 1)) * 300;
  const y = 180 - (d.value / max) * 150;
  return `<circle cx="${x}" cy="${y}" r="5" fill="#4facfe"/><text x="${x}" y="200" text-anchor="middle" class="label">${d.label}</text>`;
}).join('')}
</svg>
</body>
</html>`;
  }

  return `<div>Unknown chart type: ${type}</div>`;
}

/**
 * Agent v3 - Visual agent
 */
export class AgentV3 {
  constructor(options = {}) {
    this.llm = null;
    this.vfs = null;
    this.memory = new Map();
    this.history = [];
    this.settings = {
      temperature: 0.7,
      maxTokens: 2048,
      maxHistory: 20,
      corsProxy: 'https://api.allorigins.win/raw?url=',
      ...options.settings,
    };

    // Callbacks
    this.onToken = options.onToken || (() => {});
    this.onToolStart = options.onToolStart || (() => {});
    this.onToolEnd = options.onToolEnd || (() => {});
    this.onRender = options.onRender || (() => {}); // NEW: called when HTML should be rendered
    this.onError = options.onError || (() => {});
  }

  async init(modelId, onProgress) {
    this.llm = new LocalLLM({
      model: modelId,
      onProgress: onProgress || (() => {}),
    });
    await this.llm.load();
    this.vfs = new VFS({ storageKey: 'agent-v3-vfs' });
    this._loadMemory();
    return this;
  }

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

      // Add to history
      this.history.push({ role: 'assistant', content: response });
      const resultText = `\n[Tool ${call.name} completed: ${JSON.stringify(result).slice(0, 200)}]\n`;
      this.history.push({ role: 'user', content: resultText });

      messages.push({ role: 'assistant', content: response });
      messages.push({ role: 'user', content: resultText });

      fullResponse += resultText;
    }

    this.history.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
  }

  async _executeTool(name, params) {
    try {
      switch (name) {
        case 'render_html': {
          const html = params.html || '';
          this.onRender({ type: 'html', content: html, title: params.title });
          return { rendered: true, length: html.length };
        }

        case 'render_chart': {
          const html = generateChartHTML(params.type, params.data, params.title);
          this.onRender({ type: 'chart', content: html, title: params.title });
          return { rendered: true, type: params.type };
        }

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
      text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
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

  _calculate(expr) {
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

  _trimHistory() {
    if (this.history.length > this.settings.maxHistory * 2) {
      this.history = this.history.slice(-this.settings.maxHistory * 2);
    }
  }

  _loadMemory() {
    try {
      const data = localStorage.getItem('agent-v3-memory');
      if (data) this.memory = new Map(JSON.parse(data));
    } catch (e) {}
  }

  _saveMemory() {
    try {
      localStorage.setItem('agent-v3-memory', JSON.stringify([...this.memory]));
    } catch (e) {}
  }

  clearHistory() {
    this.history = [];
  }

  async destroy() {
    if (this.llm) await this.llm.unload();
    this.history = [];
  }
}

export default AgentV3;
