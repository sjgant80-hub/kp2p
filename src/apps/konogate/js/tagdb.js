/**
 * KonoGate TagDB - GitHub Issues as Tag Database
 * Stores API traffic, endpoints, and gateway state
 */

// API Request UDT for TagDB
export const APIRequestUDT = {
  name: 'APIRequest',
  description: 'Single API request record',
  members: {
    ID: { type: 'String', description: 'Unique request ID' },
    Method: { type: 'String', description: 'HTTP method (GET, POST, etc)' },
    Endpoint: { type: 'String', description: 'API endpoint path' },
    Status: { type: 'Int4', description: 'HTTP status code' },
    Duration_MS: { type: 'Int4', description: 'Request duration in ms' },
    Timestamp: { type: 'String', description: 'ISO timestamp' },
    Size_Bytes: { type: 'Int4', description: 'Response size' }
  }
};

// Traffic buffer for batching writes
const trafficBuffer = [];
const MAX_BUFFER = 50;
const FLUSH_INTERVAL = 2000;

export class GateTagDB {
  constructor() {
    this.owner = '';
    this.repo = '';
    this.token = '';
    this.issueNumber = null;
    this.tags = new Map();
    this.connected = false;
    this.pollInterval = 5000;
    this.pollTimer = null;
    this.flushTimer = null;
    this.listeners = new Set();
    this.clientId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.connectedAt = null;
    this.requestCount = 0;
  }

  get apiBase() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  get headers() {
    const h = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    if (this.token) h['Authorization'] = `token ${this.token}`;
    return h;
  }

  configure(owner, repo, token) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
  }

  async connect() {
    if (!this.owner || !this.repo) {
      throw new Error('Repository not configured');
    }

    await this.findOrCreateIssue();
    await this.poll();

    this.connected = true;
    this.connectedAt = Date.now();

    this.startPolling();
    this.startFlushTimer();

    // Initial status
    await this.updateStatus();

    this.emit('connected');
  }

  disconnect() {
    this.stopPolling();
    this.stopFlushTimer();
    this.connected = false;
    this.connectedAt = null;
    this.emit('disconnected');
  }

  async findOrCreateIssue() {
    const label = 'konogate-tagdb';

    try {
      const resp = await fetch(`${this.apiBase}/issues?labels=${label}&state=open`, {
        headers: this.headers
      });

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);

      const issues = await resp.json();

      if (issues.length > 0) {
        this.issueNumber = issues[0].number;
        return issues[0];
      }

      // Create new
      const createResp = await fetch(`${this.apiBase}/issues`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          title: '🚪 KonoGate API TagDB',
          body: this.serializeTags(),
          labels: [label]
        })
      });

      if (!createResp.ok) throw new Error(`Create failed: ${createResp.status}`);

      const newIssue = await createResp.json();
      this.issueNumber = newIssue.number;
      return newIssue;

    } catch (e) {
      console.error('TagDB error:', e);
      throw e;
    }
  }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll(), this.pollInterval);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flushTraffic(), FLUSH_INTERVAL);
  }

  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async poll() {
    if (!this.issueNumber) return;

    try {
      const resp = await fetch(`${this.apiBase}/issues/${this.issueNumber}`, {
        headers: this.headers
      });

      if (resp.status === 304) return;
      if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);

      const issue = await resp.json();
      const newTags = this.deserializeTags(issue.body);

      for (const [path, value] of newTags) {
        this.tags.set(path, value);
      }

      this.emit('update', this.tags);

    } catch (e) {
      console.error('Poll error:', e);
    }
  }

  // Record an API request - buffers for batch write
  recordRequest(request) {
    this.requestCount++;

    const entry = {
      id: `${this.clientId}-${this.requestCount}`,
      method: request.method || 'GET',
      endpoint: request.endpoint || '/',
      status: request.status || 200,
      duration: request.duration || 0,
      timestamp: new Date().toISOString(),
      size: request.size || 0
    };

    trafficBuffer.push(entry);

    // Emit for real-time listeners (API HERO)
    this.emit('request', entry);

    // Auto-flush if buffer full
    if (trafficBuffer.length >= MAX_BUFFER) {
      this.flushTraffic();
    }

    return entry;
  }

  // Flush traffic buffer to tags
  async flushTraffic() {
    if (trafficBuffer.length === 0) return;

    const batch = trafficBuffer.splice(0, trafficBuffer.length);

    // Store recent requests as rolling window
    const recentKey = 'API/Recent_Requests';
    const existing = this.tags.get(recentKey)?.value || [];
    const recent = [...batch, ...existing].slice(0, 100); // Keep last 100

    this.tags.set(recentKey, {
      value: recent,
      timestamp: new Date().toISOString()
    });

    // Update stats
    await this.updateStatus();

    // Sync to remote
    if (this.connected) {
      await this.syncToRemote();
    }
  }

  async updateStatus() {
    const now = new Date();
    const uptime = this.connectedAt ? Math.floor((Date.now() - this.connectedAt) / 1000) : 0;

    const statusTags = {
      'Gateway/Status': this.connected ? 'Connected' : 'Disconnected',
      'Gateway/Client_ID': this.clientId,
      'Gateway/Uptime_Seconds': uptime,
      'Gateway/Request_Count': this.requestCount,
      'Gateway/Last_Update': now.toISOString(),
      'Gateway/Buffer_Size': trafficBuffer.length
    };

    for (const [path, value] of Object.entries(statusTags)) {
      this.tags.set(path, { value, timestamp: now.toISOString() });
    }
  }

  async syncToRemote() {
    if (!this.issueNumber) return;

    try {
      await fetch(`${this.apiBase}/issues/${this.issueNumber}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ body: this.serializeTags() })
      });
    } catch (e) {
      console.error('Sync error:', e);
    }
  }

  serializeTags() {
    const data = {
      version: 1,
      updated: new Date().toISOString(),
      tags: {}
    };

    for (const [path, value] of this.tags) {
      data.tags[path] = value;
    }

    return [
      '# KonoGate API TagDB',
      '',
      '> This issue stores API gateway state. Do not edit manually.',
      '',
      '```json',
      JSON.stringify(data, null, 2),
      '```',
      '',
      `Updated: ${data.updated}`
    ].join('\n');
  }

  deserializeTags(body) {
    const tags = new Map();
    try {
      const match = body.match(/```json\n([\s\S]*?)\n```/);
      if (!match) return tags;
      const data = JSON.parse(match[1]);
      if (data.tags) {
        for (const [path, value] of Object.entries(data.tags)) {
          tags.set(path, value);
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
    return tags;
  }

  // Event system
  on(event, callback) {
    this.listeners.add({ event, callback });
    return () => this.off(event, callback);
  }

  off(event, callback) {
    for (const l of this.listeners) {
      if (l.event === event && l.callback === callback) {
        this.listeners.delete(l);
        break;
      }
    }
  }

  emit(event, data) {
    for (const l of this.listeners) {
      if (l.event === event) {
        try { l.callback(data); } catch (e) { console.error(e); }
      }
    }
  }

  // Get recent requests for API HERO
  getRecentRequests() {
    return this.tags.get('API/Recent_Requests')?.value || [];
  }

  // Read tag
  readTag(path) {
    return this.tags.get(path);
  }

  // Write tag
  async writeTag(path, value) {
    this.tags.set(path, { value, timestamp: new Date().toISOString() });
    if (this.connected) await this.syncToRemote();
  }
}

// Singleton
export const gateTagDB = new GateTagDB();

// Load from localStorage
export function initGateTagDB() {
  try {
    const saved = JSON.parse(localStorage.getItem('konogate-tagdb') || '{}');
    if (saved.owner && saved.repo) {
      gateTagDB.configure(saved.owner, saved.repo, saved.token || '');
    }
  } catch (e) {}
}

// Config UI
export function showTagDBConfig() {
  const existing = document.getElementById('tagdb-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'tagdb-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; width: 400px; max-width: 90vw;">
      <div class="modal-header" style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
        <span>🗄️ TagDB Config</span>
        <button style="background: none; border: none; color: var(--text); cursor: pointer; font-size: 18px;" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body" style="padding: 16px;">
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; color: var(--text-dim); margin-bottom: 4px;">Owner</label>
          <input type="text" id="tagdb-owner" value="${gateTagDB.owner}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; color: var(--text-dim); margin-bottom: 4px;">Repository</label>
          <input type="text" id="tagdb-repo" value="${gateTagDB.repo}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; color: var(--text-dim); margin-bottom: 4px;">Token</label>
          <input type="password" id="tagdb-token" value="${gateTagDB.token}" placeholder="ghp_..." style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
        </div>
        <div style="padding: 12px; background: var(--bg); border-radius: 6px; margin-top: 12px;">
          <div style="font-size: 12px;">Status: <span id="tagdb-status" style="color: ${gateTagDB.connected ? 'var(--success)' : 'var(--text-dim)'};">${gateTagDB.connected ? 'Connected' : 'Disconnected'}</span></div>
        </div>
      </div>
      <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="tagdb-save">Connect</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('tagdb-save').onclick = async () => {
    const owner = document.getElementById('tagdb-owner').value.trim();
    const repo = document.getElementById('tagdb-repo').value.trim();
    const token = document.getElementById('tagdb-token').value.trim();

    if (!owner || !repo) {
      alert('Owner and repo required');
      return;
    }

    gateTagDB.configure(owner, repo, token);
    localStorage.setItem('konogate-tagdb', JSON.stringify({ owner, repo, token }));

    try {
      await gateTagDB.connect();
      document.getElementById('tagdb-status').textContent = 'Connected';
      document.getElementById('tagdb-status').style.color = 'var(--success)';
    } catch (e) {
      alert('Connection failed: ' + e.message);
    }
  };
}

// Export to window
if (typeof window !== 'undefined') {
  window.gateTagDB = gateTagDB;
  window.showTagDBConfig = showTagDBConfig;
}
