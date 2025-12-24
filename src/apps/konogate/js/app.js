/**
 * KonoGate - P2P API Gateway
 * Local-first API gateway with LLM-powered security
 */

import { UDTs } from './udts/api.js';
import * as gateway from './providers/gateway.js';
import * as security from './agents/security.js';

const $ = id => document.getElementById(id);

// App state
const state = {
  engine: null,
  llmReady: false,
  activeTab: 'gateway'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventHandlers();
  gateway.initGateway({ name: 'KonoGate Local' });
  renderUDTs();
  renderProviderTree();
  await initLLM();
  startDemoTraffic();
  startUIUpdates();
});

// Tab switching
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.tab;
      $(`tab-${state.activeTab}`).classList.add('active');
    });
  });
}

// Event handlers
function setupEventHandlers() {
  $('addProviderBtn')?.addEventListener('click', showAddProviderModal);
  $('addEndpointBtn')?.addEventListener('click', showAddEndpointModal);
  $('clearTrafficBtn')?.addEventListener('click', () => $('trafficFeed').innerHTML = '');
  $('clearLogsBtn')?.addEventListener('click', () => $('logConsole').innerHTML = '');
}

// Initialize LLM
async function initLLM() {
  $('llmStatus').textContent = 'AI: Loading...';

  if (!navigator.gpu) {
    $('llmStatus').textContent = 'AI: No WebGPU';
    security.initSecurityAgent(null);
    return;
  }

  try {
    const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');

    state.engine = await CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
      initProgressCallback: (p) => {
        $('llmStatus').textContent = `AI: ${Math.round(p.progress * 100)}%`;
      }
    });

    state.llmReady = true;
    $('llmStatus').textContent = 'AI: Ready';
    security.initSecurityAgent(state.engine);

  } catch (e) {
    console.error('LLM init failed:', e);
    $('llmStatus').textContent = 'AI: Offline';
    security.initSecurityAgent(null);
  }
}

// Render UDT list
function renderUDTs() {
  const list = $('udtList');
  list.innerHTML = Object.keys(UDTs).map(name => `
    <div class="udt-item" data-udt="${name}">📋 ${name}</div>
  `).join('');
}

// Render provider tree
function renderProviderTree() {
  const tree = $('providerTree');
  const gwState = gateway.getState();

  if (gwState.providers.size === 0) {
    tree.innerHTML = '<div class="text-dim" style="padding: 8px; font-size: 12px;">No providers. Add one to get started.</div>';
    return;
  }

  tree.innerHTML = Array.from(gwState.providers.values()).map(p => `
    <div class="provider-item" data-id="${p.ID}">
      <span>${p.Type === 'graphql' ? '◆' : '●'}</span>
      <span>${p.Name}</span>
    </div>
  `).join('');
}

// Start demo traffic simulation
function startDemoTraffic() {
  const methods = ['GET', 'POST', 'GET', 'GET', 'PUT', 'DELETE'];
  const paths = ['/api/users', '/api/products', '/api/orders', '/api/auth', '/api/search'];
  const statuses = [200, 200, 200, 200, 201, 400, 404, 500];

  setInterval(() => {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const latency = Math.floor(Math.random() * 200) + 10;

    // Check rate limit
    const rateCheck = gateway.checkRateLimit('global');
    const blocked = !rateCheck.allowed;

    const req = gateway.recordRequest({
      Method: method,
      Path: path,
      Status: blocked ? 429 : status,
      Latency: latency,
      Blocked: blocked,
      BlockReason: blocked ? 'Rate limit exceeded' : '',
      ClientIP: `192.168.1.${Math.floor(Math.random() * 255)}`
    });

    // Record for security agent
    security.recordMetric(req);

    // Update traffic feed
    addTrafficItem(req);

    // Log
    addLog(blocked ? 'warn' : (status >= 400 ? 'error' : 'info'),
      `${method} ${path} → ${req.Status} (${latency}ms)`);

  }, 500 + Math.random() * 1500);
}

// Add traffic item to feed
function addTrafficItem(req) {
  const feed = $('trafficFeed');
  const item = document.createElement('div');
  item.className = 'traffic-item';
  item.innerHTML = `
    <span class="traffic-method ${req.Method}">${req.Method}</span>
    <span class="traffic-path">${req.Path}</span>
    <span class="traffic-status ${req.Status < 400 ? 'ok' : 'error'}">${req.Status}</span>
    <span class="traffic-time">${req.Latency}ms</span>
  `;
  feed.insertBefore(item, feed.firstChild);

  // Keep last 50
  while (feed.children.length > 50) feed.removeChild(feed.lastChild);
}

// Add log entry
function addLog(level, message) {
  const console = $('logConsole');
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  line.textContent = `[${time}] [${level.toUpperCase()}] ${message}`;
  console.appendChild(line);
  console.scrollTop = console.scrollHeight;

  while (console.children.length > 200) console.removeChild(console.firstChild);
}

// Start UI updates
function startUIUpdates() {
  setInterval(() => {
    const stats = gateway.getStats();

    $('reqTotal').textContent = stats.totalRequests;
    $('reqRate').textContent = `${stats.requestRate}/m`;
    $('reqBlocked').textContent = stats.blockedRequests;
    $('alertCount').textContent = stats.alertCount;
    $('gatewayStatus').textContent = `Gateway: Running (${stats.endpointCount} endpoints)`;

    // Update tags panel
    renderTags();

    // Update security agent status
    updateAgentStatus();

    // Update alerts
    updateAlerts();

  }, 1000);
}

// Render tags
function renderTags() {
  const tags = gateway.getAllTags();
  const browser = $('tagBrowser');

  browser.innerHTML = tags.slice(-30).map(t => `
    <div class="tag-item">
      <span class="tag-path">${t.path.split('/').pop()}</span>
      <span class="tag-value">${typeof t.value === 'object' ? JSON.stringify(t.value) : t.value}</span>
    </div>
  `).join('');
}

// Update agent status
function updateAgentStatus() {
  const status = security.getAgentStatus();
  const panel = $('agentStatus');

  panel.innerHTML = `
    <div style="margin-top: 12px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Status</span>
        <span style="color: ${status.llmReady ? 'var(--success)' : 'var(--warning)'}">
          ${status.llmReady ? '🟢 Active' : '🟡 Rule-based only'}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Requests/min</span>
        <span>${status.metrics.requestsPerMinute}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Errors/min</span>
        <span>${status.metrics.errorCount}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Unique IPs</span>
        <span>${status.metrics.uniqueIPs}</span>
      </div>
    </div>
  `;
}

// Update alerts list
function updateAlerts() {
  const gwState = gateway.getState();
  const list = $('alertList');

  if (gwState.alerts.length === 0) {
    list.innerHTML = '<div class="text-dim">No alerts</div>';
    return;
  }

  list.innerHTML = gwState.alerts.slice(-10).reverse().map(a => `
    <div class="alert-item">
      <span class="alert-time">${new Date(a.Timestamp).toLocaleTimeString()}</span>
      <span class="alert-msg">${a.Message}</span>
    </div>
  `).join('');
}

// Modal: Add Provider
function showAddProviderModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:12px;padding:24px;width:400px;">
      <h3 style="margin-bottom:16px;">Add API Provider</h3>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">Name</label>
        <input type="text" id="prov-name" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">Base URL</label>
        <input type="text" id="prov-url" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);" placeholder="https://api.example.com">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">Type</label>
        <select id="prov-type" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);">
          <option value="rest">REST</option>
          <option value="graphql">GraphQL</option>
        </select>
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="saveProviderBtn">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $('saveProviderBtn').onclick = () => {
    gateway.addProvider({
      Name: $('prov-name').value,
      BaseURL: $('prov-url').value,
      Type: $('prov-type').value
    });
    renderProviderTree();
    addLog('info', `Added provider: ${$('prov-name').value}`);
    modal.remove();
  };
}

// Modal: Add Endpoint
function showAddEndpointModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:12px;padding:24px;width:400px;">
      <h3 style="margin-bottom:16px;">Add Endpoint</h3>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">Method</label>
        <select id="ep-method" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">Path</label>
        <input type="text" id="ep-path" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);" placeholder="/api/resource">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;margin-bottom:4px;">Rate Limit (req/min)</label>
        <input type="number" id="ep-rate" value="60" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);">
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="saveEndpointBtn">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $('saveEndpointBtn').onclick = () => {
    gateway.addEndpoint({
      Method: $('ep-method').value,
      Path: $('ep-path').value,
      RateLimit: parseInt($('ep-rate').value)
    });
    addLog('info', `Added endpoint: ${$('ep-method').value} ${$('ep-path').value}`);
    modal.remove();
  };
}

// Expose for debugging
window.konogate = { gateway, security, state };
