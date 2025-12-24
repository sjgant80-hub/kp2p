/**
 * Konomi Ignite - Tag Database via GitHub Issues
 * Uses GitHub Issues API as a free, versioned tag value store
 */

import { log } from './utils.js';

export class TagDatabase {
  constructor(config = {}) {
    this.owner = config.owner || '';
    this.repo = config.repo || '';
    this.token = config.token || '';
    this.issueNumber = config.issueNumber || null;
    this.pollInterval = config.pollInterval || 5000; // 5 seconds
    this.pollTimer = null;
    this.tags = new Map();
    this.lastEtag = null;
    this.onUpdate = config.onUpdate || (() => {});
    this.connected = false;

    // Status tracking
    this.clientId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.connectedAt = null;
    this.pollCount = 0;
    this.statusUpdateTimer = null;
  }

  // Configure connection
  configure(owner, repo, token) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    log('info', `Configured TagDB: ${owner}/${repo}`, 'TAGDB');
  }

  // Get API base URL
  get apiBase() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  // Fetch headers
  get headers() {
    const h = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    if (this.token) {
      h['Authorization'] = `token ${this.token}`;
    }
    if (this.lastEtag) {
      h['If-None-Match'] = this.lastEtag;
    }
    return h;
  }

  // Find or create the tag database issue
  async findOrCreateIssue() {
    const label = 'konomi-tagdb';

    // Search for existing issue
    try {
      const resp = await fetch(`${this.apiBase}/issues?labels=${label}&state=open`, {
        headers: this.headers
      });

      if (!resp.ok) {
        throw new Error(`GitHub API error: ${resp.status}`);
      }

      const issues = await resp.json();

      if (issues.length > 0) {
        this.issueNumber = issues[0].number;
        log('info', `Found TagDB issue #${this.issueNumber}`, 'TAGDB');
        return issues[0];
      }

      // Create new issue
      const createResp = await fetch(`${this.apiBase}/issues`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          title: '🔥 Konomi Ignite Tag Database',
          body: this.serializeTags(),
          labels: [label]
        })
      });

      if (!createResp.ok) {
        throw new Error(`Failed to create issue: ${createResp.status}`);
      }

      const newIssue = await createResp.json();
      this.issueNumber = newIssue.number;
      log('success', `Created TagDB issue #${this.issueNumber}`, 'TAGDB');
      return newIssue;

    } catch (e) {
      log('error', `TagDB error: ${e.message}`, 'TAGDB');
      throw e;
    }
  }

  // Connect and start polling
  async connect() {
    if (!this.owner || !this.repo) {
      throw new Error('Repository not configured');
    }

    log('info', 'Connecting to TagDB...', 'TAGDB');

    await this.findOrCreateIssue();
    await this.poll();

    this.connected = true;
    this.connectedAt = Date.now();
    this.pollCount = 0;

    // Write initial status tags
    await this.updateStatusTags();

    this.startPolling();
    this.startStatusUpdates();

    log('success', 'TagDB connected', 'TAGDB');
  }

  // Disconnect
  disconnect() {
    this.stopPolling();
    this.stopStatusUpdates();
    this.connected = false;
    this.connectedAt = null;
    log('info', 'TagDB disconnected', 'TAGDB');
  }

  // Start status tag updates (every poll interval)
  startStatusUpdates() {
    if (this.statusUpdateTimer) return;

    this.statusUpdateTimer = setInterval(() => {
      this.updateStatusTags().catch(e => {
        log('error', `Status update error: ${e.message}`, 'TAGDB');
      });
    }, this.pollInterval);
  }

  // Stop status updates
  stopStatusUpdates() {
    if (this.statusUpdateTimer) {
      clearInterval(this.statusUpdateTimer);
      this.statusUpdateTimer = null;
    }
  }

  // Update gateway status tags
  async updateStatusTags() {
    const now = new Date();
    const uptime = this.connectedAt ? Math.floor((Date.now() - this.connectedAt) / 1000) : 0;

    // Status tags that update automatically
    const statusTags = {
      'Gateway/Status': this.connected ? 'Connected' : 'Disconnected',
      'Gateway/Heartbeat': now.toISOString(),
      'Gateway/Uptime_Seconds': uptime,
      'Gateway/Poll_Count': this.pollCount,
      'Gateway/Client_ID': this.clientId,
      'Gateway/Last_Update': now.toLocaleTimeString(),
      'Gateway/Memory_MB': Math.round(performance?.memory?.usedJSHeapSize / 1024 / 1024) || 0,
      'Gateway/Tags_Count': this.tags.size
    };

    // Update local tags
    for (const [path, value] of Object.entries(statusTags)) {
      this.tags.set(path, {
        value,
        quality: 'Good',
        timestamp: now.toISOString(),
        source: 'system'
      });
    }

    // Sync to remote
    await this.syncToRemote();
    log('info', `Status tags updated (uptime: ${uptime}s, polls: ${this.pollCount})`, 'TAGDB');
  }

  // Start polling for updates
  startPolling() {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.poll().catch(e => {
        log('error', `Poll error: ${e.message}`, 'TAGDB');
      });
    }, this.pollInterval);

    log('info', `Polling every ${this.pollInterval}ms`, 'TAGDB');
  }

  // Stop polling
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // Poll for updates
  async poll() {
    if (!this.issueNumber) return;

    this.pollCount++;

    try {
      const resp = await fetch(`${this.apiBase}/issues/${this.issueNumber}`, {
        headers: this.headers
      });

      // 304 Not Modified - no changes
      if (resp.status === 304) {
        return;
      }

      if (!resp.ok) {
        throw new Error(`Poll failed: ${resp.status}`);
      }

      // Store ETag for conditional requests
      this.lastEtag = resp.headers.get('ETag');

      const issue = await resp.json();
      const newTags = this.deserializeTags(issue.body);

      // Check for changes
      let hasChanges = false;
      for (const [path, value] of newTags) {
        const existing = this.tags.get(path);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(value)) {
          hasChanges = true;
          this.tags.set(path, value);
        }
      }

      if (hasChanges) {
        log('info', `Received ${newTags.size} tags from remote`, 'TAGDB');
        this.onUpdate(this.tags);
      }

    } catch (e) {
      if (e.message !== 'Poll failed: 304') {
        throw e;
      }
    }
  }

  // Write a tag value
  async writeTag(path, value, quality = 'Good') {
    const tagData = {
      value,
      quality,
      timestamp: new Date().toISOString(),
      source: 'local'
    };

    this.tags.set(path, tagData);

    // Update issue
    await this.syncToRemote();

    log('info', `Wrote ${path} = ${JSON.stringify(value)}`, 'TAGDB');
    return tagData;
  }

  // Read a tag value
  readTag(path) {
    return this.tags.get(path) || null;
  }

  // Write multiple tags
  async writeTags(updates) {
    for (const [path, value] of Object.entries(updates)) {
      this.tags.set(path, {
        value,
        quality: 'Good',
        timestamp: new Date().toISOString(),
        source: 'local'
      });
    }

    await this.syncToRemote();
    log('info', `Wrote ${Object.keys(updates).length} tags`, 'TAGDB');
  }

  // Sync local tags to remote
  async syncToRemote() {
    if (!this.issueNumber) return;

    try {
      const resp = await fetch(`${this.apiBase}/issues/${this.issueNumber}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          body: this.serializeTags()
        })
      });

      if (!resp.ok) {
        throw new Error(`Sync failed: ${resp.status}`);
      }

      this.lastEtag = resp.headers.get('ETag');

    } catch (e) {
      log('error', `Sync error: ${e.message}`, 'TAGDB');
      throw e;
    }
  }

  // Serialize tags to issue body
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
      '# Konomi Ignite Tag Database',
      '',
      '> ⚠️ This issue is used as a tag value database. Do not edit manually.',
      '',
      '```json',
      JSON.stringify(data, null, 2),
      '```',
      '',
      `Last updated: ${data.updated}`
    ].join('\n');
  }

  // Deserialize tags from issue body
  deserializeTags(body) {
    const tags = new Map();

    try {
      // Extract JSON from markdown code block
      const match = body.match(/```json\n([\s\S]*?)\n```/);
      if (!match) return tags;

      const data = JSON.parse(match[1]);

      if (data.tags) {
        for (const [path, value] of Object.entries(data.tags)) {
          tags.set(path, value);
        }
      }

    } catch (e) {
      log('error', `Failed to parse TagDB: ${e.message}`, 'TAGDB');
    }

    return tags;
  }

  // Add a comment (for history/audit trail)
  async addComment(message) {
    if (!this.issueNumber) return;

    try {
      await fetch(`${this.apiBase}/issues/${this.issueNumber}/comments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ body: message })
      });
    } catch (e) {
      log('error', `Comment error: ${e.message}`, 'TAGDB');
    }
  }

  // Export current tags
  exportTags() {
    const data = {};
    for (const [path, value] of this.tags) {
      data[path] = value;
    }
    return data;
  }

  // Import tags
  async importTags(data) {
    for (const [path, value] of Object.entries(data)) {
      this.tags.set(path, value);
    }
    await this.syncToRemote();
  }
}

// Singleton instance
export const tagDB = new TagDatabase();

// UI for configuring TagDB
export function showTagDBConfig() {
  const existing = document.getElementById('tagdb-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'tagdb-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>🗄️ Tag Database (GitHub)</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 16px;">
          Use a GitHub repository issue as a tag value database.
          Values sync across all connected clients.
        </p>

        <div class="form-group">
          <label>Repository Owner</label>
          <input type="text" id="tagdb-owner" placeholder="username" value="${tagDB.owner}">
        </div>

        <div class="form-group">
          <label>Repository Name</label>
          <input type="text" id="tagdb-repo" placeholder="my-repo" value="${tagDB.repo}">
        </div>

        <div class="form-group">
          <label>Personal Access Token</label>
          <input type="password" id="tagdb-token" placeholder="ghp_xxxx" value="${tagDB.token}">
          <small style="color: var(--text-dim);">
            Needs repo scope. <a href="https://github.com/settings/tokens/new" target="_blank" style="color: var(--cyan);">Create token</a>
          </small>
        </div>

        <div class="form-group">
          <label>Poll Interval (ms)</label>
          <input type="number" id="tagdb-poll" value="${tagDB.pollInterval}" min="1000" step="1000">
        </div>

        <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 6px;">
          <div style="font-size: 11px; color: var(--text-dim);">
            Status: <span id="tagdb-status" style="color: ${tagDB.connected ? 'var(--green)' : 'var(--text-dim)'}">
              ${tagDB.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          ${tagDB.issueNumber ? `<div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Issue: #${tagDB.issueNumber}</div>` : ''}
        </div>

        <div id="tagdb-live-tags" style="margin-top: 16px; max-height: 200px; overflow-y: auto; display: ${tagDB.connected ? 'block' : 'none'};">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">📊 Live Status Tags</div>
          <div id="tagdb-tags-list" style="font-family: monospace; font-size: 11px;"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-danger" id="tagdb-disconnect" style="${tagDB.connected ? '' : 'display:none'}">Disconnect</button>
        <button class="btn btn-primary" id="tagdb-connect">Connect</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Update live tags display
  function updateLiveTagsDisplay() {
    const list = document.getElementById('tagdb-tags-list');
    if (!list) return;

    const statusTags = [...tagDB.tags.entries()]
      .filter(([path]) => path.startsWith('Gateway/'))
      .sort((a, b) => a[0].localeCompare(b[0]));

    list.innerHTML = statusTags.map(([path, data]) => {
      const name = path.replace('Gateway/', '');
      const value = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
      return `<div style="display: flex; justify-content: space-between; padding: 4px 8px; background: var(--bg2); margin-bottom: 2px; border-radius: 3px;">
        <span style="color: var(--cyan);">${name}</span>
        <span style="color: var(--green);">${value}</span>
      </div>`;
    }).join('');
  }

  // Start live update if connected
  let liveUpdateTimer = null;
  if (tagDB.connected) {
    updateLiveTagsDisplay();
    liveUpdateTimer = setInterval(updateLiveTagsDisplay, 1000);
  }

  // Clean up timer when modal closes
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-close')) {
      if (liveUpdateTimer) clearInterval(liveUpdateTimer);
    }
  });

  // Connect button
  document.getElementById('tagdb-connect').onclick = async () => {
    const owner = document.getElementById('tagdb-owner').value.trim();
    const repo = document.getElementById('tagdb-repo').value.trim();
    const token = document.getElementById('tagdb-token').value.trim();
    const poll = parseInt(document.getElementById('tagdb-poll').value) || 5000;

    if (!owner || !repo) {
      alert('Owner and repo are required');
      return;
    }

    tagDB.configure(owner, repo, token);
    tagDB.pollInterval = poll;

    try {
      await tagDB.connect();
      document.getElementById('tagdb-status').textContent = 'Connected';
      document.getElementById('tagdb-status').style.color = 'var(--green)';
      document.getElementById('tagdb-disconnect').style.display = '';
      document.getElementById('tagdb-live-tags').style.display = 'block';

      // Start live updates
      updateLiveTagsDisplay();
      if (liveUpdateTimer) clearInterval(liveUpdateTimer);
      liveUpdateTimer = setInterval(updateLiveTagsDisplay, 1000);

      // Save config
      localStorage.setItem('konomi-tagdb-config', JSON.stringify({ owner, repo, token, poll }));

    } catch (e) {
      alert(`Connection failed: ${e.message}`);
    }
  };

  // Disconnect button
  document.getElementById('tagdb-disconnect').onclick = () => {
    tagDB.disconnect();
    document.getElementById('tagdb-status').textContent = 'Disconnected';
    document.getElementById('tagdb-status').style.color = 'var(--text-dim)';
    document.getElementById('tagdb-disconnect').style.display = 'none';
    document.getElementById('tagdb-live-tags').style.display = 'none';
    if (liveUpdateTimer) {
      clearInterval(liveUpdateTimer);
      liveUpdateTimer = null;
    }
  };
}

// Load saved config on startup
export function initTagDB() {
  try {
    const saved = JSON.parse(localStorage.getItem('konomi-tagdb-config') || '{}');
    if (saved.owner && saved.repo) {
      tagDB.configure(saved.owner, saved.repo, saved.token || '');
      tagDB.pollInterval = saved.poll || 5000;
      log('info', `TagDB config loaded: ${saved.owner}/${saved.repo}`, 'TAGDB');
    }
  } catch (e) {
    // Ignore
  }
}

// Export for window
if (typeof window !== 'undefined') {
  window.tagDB = tagDB;
  window.showTagDBConfig = showTagDBConfig;
}
