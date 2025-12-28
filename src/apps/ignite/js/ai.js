/**
 * Konomi Ignite - AI Assistant (WebLLM)
 * Digital twin AI for Ignition tag operations
 */

import { $, escapeHtml, log } from './utils.js';
import { ignitionState, readTag, writeTag, createTag, createUDT } from './ignition.js';

// AI State
export const aiState = {
  engine: null,
  ready: false,
  loading: false,
  history: [],
  mcpEndpoint: null
};

// System prompt with Ignition context
const SYSTEM_PROMPT = `You are Kono, an AI assistant specialized in industrial automation and Ignition SCADA systems. You help users with:
- Tag management (creating, reading, writing tags)
- UDT (User Defined Types) design and instances
- MQTT, OPC-UA, OPC-DA connectivity
- Alarm configuration and management
- HMI/SCADA best practices
- ISA-95/ISA-88 standards

You have access to the Ignite digital twin environment. When users ask about tags, you can reference the current tag database.
Be concise and technical. Use proper Ignition terminology.

Available commands you can suggest:
- createTag(path, {dataType, engUnit, value}) - Create a new tag
- createUDT(name, members[]) - Create a User Defined Type
- readTag(path) - Read a tag value
- writeTag(path, value) - Write to a tag
- subscribe(path) - Subscribe to live updates

Current tag providers: [default], [System]
Available data types: Int1, Int2, Int4, Int8, Float4, Float8, Boolean, String, DateTime`;

// Initialize AI
export async function initAI() {
  renderAIPanel();

  // Check for saved MCP endpoint
  const savedEndpoint = localStorage.getItem('ignite-mcp-endpoint');
  if (savedEndpoint) {
    aiState.mcpEndpoint = savedEndpoint;
    $('mcpEndpoint').value = savedEndpoint;
  }
}

// Load WebLLM model
export async function loadModel(modelId) {
  if (aiState.loading) return;

  aiState.loading = true;
  aiState.ready = false;
  updateAIStatus('loading', 'Loading model...');
  showProgress(true, 'Initializing WebLLM...', 0);

  try {
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');

    aiState.engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (progress) => {
        const pct = Math.round(progress.progress * 100);
        showProgress(true, progress.text || `Loading: ${pct}%`, pct);
      }
    });

    aiState.ready = true;
    aiState.loading = false;
    showProgress(false);
    updateAIStatus('ready', 'Ready');
    log('success', `AI model loaded: ${modelId}`, 'AI');

    // Send initial context
    addMessage('system', 'AI assistant ready. I can help you with Ignition tags, UDTs, and industrial protocols.');

  } catch (err) {
    aiState.loading = false;
    showProgress(false);
    updateAIStatus('error', 'Failed to load');
    log('error', `AI load error: ${err.message}`, 'AI');
  }
}

// Generate AI response
export async function chat(userMessage) {
  if (!aiState.ready || !userMessage.trim()) return;

  addMessage('user', userMessage);
  aiState.history.push({ role: 'user', content: userMessage });

  showTyping(true);

  try {
    // Build context with current tags
    const tagContext = buildTagContext();
    const contextPrompt = SYSTEM_PROMPT + '\n\nCurrent Tags:\n' + tagContext;

    // Check if using MCP endpoint or local WebLLM
    let reply;

    if (aiState.mcpEndpoint) {
      reply = await callMCPEndpoint(userMessage, contextPrompt);
    } else {
      const response = await aiState.engine.chat.completions.create({
        messages: [
          { role: 'system', content: contextPrompt },
          ...aiState.history.slice(-10)
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      reply = response.choices[0]?.message?.content || "I couldn't process that request.";
    }

    showTyping(false);
    addMessage('ai', reply);
    aiState.history.push({ role: 'assistant', content: reply });

    // Parse any commands in the response
    parseAndExecuteCommands(reply);

  } catch (err) {
    showTyping(false);
    addMessage('ai', 'Sorry, I encountered an error. Please try again.');
    log('error', `AI chat error: ${err.message}`, 'AI');
  }
}

// Call MCP server endpoint
async function callMCPEndpoint(message, context) {
  const response = await fetch(aiState.mcpEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'chat',
      params: {
        message,
        context,
        history: aiState.history.slice(-10)
      }
    })
  });

  if (!response.ok) throw new Error('MCP request failed');
  const data = await response.json();
  return data.result || data.content || data.message;
}

// Build context from current tags
function buildTagContext() {
  const lines = [];

  for (const [path, tag] of ignitionState.tags) {
    if (tag.type === 'folder') continue;
    const value = typeof tag.value === 'object' ? JSON.stringify(tag.value) : tag.value;
    lines.push(`${path}: ${value} (${tag.udtType || tag.dataType})`);
  }

  if (lines.length === 0) {
    return 'No tags configured yet.';
  }

  return lines.slice(0, 20).join('\n') + (lines.length > 20 ? `\n...and ${lines.length - 20} more` : '');
}

// Parse and execute any commands mentioned by AI
function parseAndExecuteCommands(text) {
  // Look for suggested commands
  const createTagMatch = text.match(/createTag\(['"]([^'"]+)['"],\s*\{([^}]+)\}\)/);
  if (createTagMatch) {
    const path = createTagMatch[1];
    try {
      const config = JSON.parse(`{${createTagMatch[2].replace(/(\w+):/g, '"$1":')}}`);
      // Suggest but don't auto-execute
      addMessage('system', `💡 Suggested: Create tag "${path}". Click to execute.`, {
        action: () => {
          createTag(path, config);
          addMessage('system', `✅ Created tag: ${path}`);
        }
      });
    } catch (e) {}
  }

  const readTagMatch = text.match(/readTag\(['"]([^'"]+)['"]\)/);
  if (readTagMatch) {
    const path = readTagMatch[1];
    addMessage('system', `💡 Suggested: Read tag "${path}". Click to execute.`, {
      action: async () => {
        const value = await readTag(path);
        addMessage('system', `📊 ${path} = ${value}`);
      }
    });
  }
}

// UI Rendering
function renderAIPanel() {
  const panel = $('ai-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="ai-header">
      <div class="ai-title">
        <span class="ai-icon">🤖</span>
        <span>Kono AI</span>
        <span class="ai-status" id="aiStatus">
          <span class="ai-dot"></span>
          <span class="ai-status-text">Offline</span>
        </span>
      </div>
      <select id="modelSelect" class="ai-model-select">
        <option value="SmolLM2-360M-Instruct-q4f16_1-MLC">SmolLM2 360M (Fast)</option>
        <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B</option>
        <option value="Qwen2.5-1.5B-Instruct-q4f16_1-MLC">Qwen 2.5 1.5B</option>
      </select>
    </div>

    <div class="ai-mcp-config" id="mcpConfig">
      <label>MCP Endpoint (optional):</label>
      <div class="mcp-row">
        <input type="text" id="mcpEndpoint" placeholder="http://localhost:8080/mcp">
        <button class="btn btn-sm" id="mcpConnectBtn">Connect</button>
      </div>
    </div>

    <div class="ai-progress" id="aiProgress" style="display:none;">
      <div class="ai-progress-text" id="progressText">Loading...</div>
      <div class="ai-progress-bar">
        <div class="ai-progress-fill" id="progressFill"></div>
      </div>
    </div>

    <div class="ai-messages" id="aiMessages"></div>

    <div class="ai-typing" id="aiTyping" style="display:none;">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>

    <div class="ai-input-area">
      <textarea id="aiInput" placeholder="Ask about tags, UDTs, or protocols..." rows="1"></textarea>
      <button id="aiSendBtn" class="btn btn-primary" disabled>➤</button>
    </div>

    <div class="ai-hints">
      <div class="ai-hint" data-msg="What tags are configured?">📊 Show tags</div>
      <div class="ai-hint" data-msg="Create a Temperature sensor tag">🌡️ New sensor</div>
      <div class="ai-hint" data-msg="How do I create a Motor UDT?">📦 Motor UDT</div>
      <div class="ai-hint" data-msg="What OPC-UA nodes should I browse?">🔌 OPC-UA help</div>
    </div>
  `;

  // Event listeners
  $('modelSelect').onchange = () => {
    aiState.history = [];
    $('aiMessages').innerHTML = '';
    loadModel($('modelSelect').value);
  };

  $('mcpConnectBtn').onclick = () => {
    const endpoint = $('mcpEndpoint').value.trim();
    if (endpoint) {
      aiState.mcpEndpoint = endpoint;
      localStorage.setItem('ignite-mcp-endpoint', endpoint);
      updateAIStatus('ready', 'MCP Connected');
      addMessage('system', `Connected to MCP endpoint: ${endpoint}`);
    }
  };

  const input = $('aiInput');
  const sendBtn = $('aiSendBtn');

  input.oninput = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  };

  sendBtn.onclick = () => {
    chat(input.value);
    input.value = '';
    input.style.height = 'auto';
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  };

  // Quick hints
  document.querySelectorAll('.ai-hint').forEach(hint => {
    hint.onclick = () => {
      input.value = hint.dataset.msg;
      sendBtn.click();
    };
  });

  // Auto-load model
  setTimeout(() => loadModel($('modelSelect').value), 500);
}

function addMessage(role, content, options = {}) {
  const container = $('aiMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `ai-msg ai-msg-${role}`;

  const icon = role === 'user' ? '👤' : role === 'ai' ? '🤖' : '⚡';

  div.innerHTML = `
    <div class="ai-msg-icon">${icon}</div>
    <div class="ai-msg-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
  `;

  if (options.action) {
    div.style.cursor = 'pointer';
    div.onclick = options.action;
    div.classList.add('ai-msg-actionable');
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateAIStatus(state, text) {
  const status = $('aiStatus');
  if (!status) return;

  status.className = 'ai-status ai-status-' + state;
  status.querySelector('.ai-status-text').textContent = text;

  $('aiSendBtn').disabled = state !== 'ready';
}

function showProgress(show, text = '', pct = 0) {
  const progress = $('aiProgress');
  if (!progress) return;

  progress.style.display = show ? 'block' : 'none';
  if (text) $('progressText').textContent = text;
  $('progressFill').style.width = pct + '%';
}

function showTyping(show) {
  const typing = $('aiTyping');
  if (typing) typing.style.display = show ? 'flex' : 'none';
}

// Export for window access
if (typeof window !== 'undefined') {
  window.igniteAI = {
    chat,
    loadModel,
    initAI
  };
}
