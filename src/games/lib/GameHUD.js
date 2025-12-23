/**
 * @file src/games/lib/GameHUD.js
 * @desc HUD/UI components for GitFox games
 *       Handles shield bars, scores, player lists, kill feeds, etc.
 */

import { $, escapeHtml, padNumber } from './utils.js';

/**
 * HUD Theme presets
 */
export const HUDThemes = {
  gitfox: {
    primary: '#0f0',
    secondary: '#0af',
    warning: '#f80',
    danger: '#f00',
    background: 'rgba(0,20,10,0.9)'
  },
  amazon: {
    primary: '#f60',
    secondary: '#ff9900',
    warning: '#f80',
    danger: '#f00',
    background: 'rgba(20,10,0,0.9)'
  },
  neutral: {
    primary: '#0af',
    secondary: '#08f',
    warning: '#f80',
    danger: '#f00',
    background: 'rgba(0,20,40,0.9)'
  }
};

/**
 * Game HUD Manager
 * Creates and manages all HUD elements
 */
export class GameHUD {
  constructor(options = {}) {
    this.theme = options.theme || HUDThemes.gitfox;
    this.elements = {};
    this.killFeedTimeout = options.killFeedTimeout || 5000;
    this.maxKillFeedItems = options.maxKillFeedItems || 5;
  }

  /**
   * Update shield bar
   * @param {number} value - Shield value (0-100)
   * @param {string} fillId - Fill element ID
   */
  updateShield(value, fillId = 'shield-fill') {
    const el = $(fillId);
    if (el) {
      el.style.width = Math.max(0, Math.min(100, value)) + '%';
    }
  }

  /**
   * Update boost bar
   * @param {number} value - Boost value (0-100)
   * @param {string} fillId - Fill element ID
   */
  updateBoost(value, fillId = 'boost-fill') {
    const el = $(fillId);
    if (el) {
      el.style.width = Math.max(0, Math.min(100, value)) + '%';
    }
  }

  /**
   * Update score display
   * @param {number} score - Current score
   * @param {string} elementId - Element ID
   * @param {number} padWidth - Number padding width
   */
  updateScore(score, elementId = 'score', padWidth = 5) {
    const el = $(elementId);
    if (el) {
      el.textContent = padNumber(score, padWidth);
    }
  }

  /**
   * Update kills display
   * @param {number} kills - Kill count
   * @param {string} elementId - Element ID
   */
  updateKills(kills, elementId = 'kills') {
    const el = $(elementId);
    if (el) {
      el.textContent = `KILLS: ${kills}`;
    }
  }

  /**
   * Update connection status indicator
   * @param {Object} options
   */
  updateConnectionStatus(options = {}) {
    const {
      connected = false,
      connecting = false,
      peerCount = 0,
      dotId = 'connDot',
      statusId = 'connStatus',
      peersId = 'connPeers'
    } = options;

    const dot = $(dotId);
    const status = $(statusId);
    const peers = $(peersId);

    if (dot) {
      if (connected) {
        dot.className = 'dot on';
      } else if (connecting) {
        dot.className = 'dot pulse';
      } else {
        dot.className = 'dot';
      }
    }

    if (status) {
      if (connected) {
        status.textContent = 'Connected';
      } else if (connecting) {
        status.textContent = 'Connecting...';
      } else {
        status.textContent = 'Disconnected';
      }
    }

    if (peers) {
      const count = peerCount + 1; // Include self
      peers.textContent = `${count} player${count !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Update player list
   * @param {Object} options
   */
  updatePlayerList(options = {}) {
    const {
      myName,
      myTeam = 'gitfox',
      myScore = 0,
      players = new Map(),
      containerId = 'players-list'
    } = options;

    const container = $(containerId);
    if (!container) return;

    const teamColors = {
      gitfox: '#0f0',
      amazon: '#f60',
      neutral: '#0af'
    };

    let html = '';

    // Add self
    const myColor = teamColors[myTeam] || teamColors.gitfox;
    html += `<div class="player-entry">
      <span class="player-dot" style="background:${myColor}"></span>
      <span class="player-name" style="color:${myColor}">${escapeHtml(myName)} (you)</span>
      <span class="player-score">${myScore}</span>
    </div>`;

    // Add remote players
    players.forEach(player => {
      const color = teamColors[player.team] || teamColors.neutral;
      html += `<div class="player-entry">
        <span class="player-dot" style="background:${color}"></span>
        <span class="player-name" style="color:${color}">${escapeHtml(player.name)}</span>
        <span class="player-score">${player.score || 0}</span>
      </div>`;
    });

    container.innerHTML = html;
  }

  /**
   * Add entry to kill feed
   * @param {string} text - Kill feed text
   * @param {string} containerId - Container element ID
   */
  addKillFeed(text, containerId = 'killfeed') {
    const container = $(containerId);
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.textContent = text;
    container.appendChild(entry);

    // Fade out and remove
    setTimeout(() => entry.classList.add('fade'), this.killFeedTimeout - 1000);
    setTimeout(() => entry.remove(), this.killFeedTimeout);

    // Keep only max items
    while (container.children.length > this.maxKillFeedItems) {
      container.firstChild.remove();
    }
  }

  /**
   * Show temporary message
   * @param {string} text - Message text
   * @param {number} duration - Duration in ms
   * @param {string} elementId - Element ID
   */
  showMessage(text, duration = 2000, elementId = 'message') {
    const el = $(elementId);
    if (!el) return;

    el.textContent = text;
    el.style.opacity = 1;
    setTimeout(() => {
      el.style.opacity = 0;
    }, duration);
  }

  /**
   * Show radio message (character dialog)
   * @param {Object} options
   */
  showRadio(options = {}) {
    const {
      face = '🐰',
      text = '',
      duration = 4000,
      faceId = 'radio-face',
      textId = 'radio-text',
      containerId = 'radio'
    } = options;

    const container = $(containerId);
    const faceEl = $(faceId);
    const textEl = $(textId);

    if (faceEl) faceEl.textContent = face;
    if (textEl) textEl.textContent = text;
    if (container) {
      container.style.opacity = 1;
      setTimeout(() => {
        container.style.opacity = 0;
      }, duration);
    }
  }

  /**
   * Update target counter
   * @param {number} current - Current targets hit
   * @param {number} total - Total targets
   * @param {string} elementId - Element ID
   */
  updateTargets(current, total, elementId = 'targets') {
    const el = $(elementId);
    if (el) {
      el.textContent = `TARGETS: ${current}/${total}`;
    }
  }

  /**
   * Show level title
   * @param {string} text - Title text
   * @param {number} fadeInDelay - Delay before fade in
   * @param {number} duration - How long to show
   * @param {string} elementId - Element ID
   */
  showLevelTitle(text, fadeInDelay = 500, duration = 2000, elementId = 'level-title') {
    const el = $(elementId);
    if (!el) return;

    el.textContent = text;

    setTimeout(() => {
      el.style.opacity = 1;
    }, fadeInDelay);

    setTimeout(() => {
      el.style.opacity = 0;
    }, fadeInDelay + duration);
  }

  /**
   * Show/hide lobby
   * @param {boolean} visible - Whether to show lobby
   * @param {string} elementId - Lobby element ID
   */
  setLobbyVisible(visible, elementId = 'lobby') {
    const el = $(elementId);
    if (el) {
      if (visible) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  }

  /**
   * Update lobby status text
   * @param {string} text - Status text
   * @param {string} elementId - Element ID
   */
  updateLobbyStatus(text, elementId = 'lobbyStatus') {
    const el = $(elementId);
    if (el) {
      el.textContent = text;
    }
  }

  /**
   * Show completion screen
   * @param {Object} options
   */
  showComplete(options = {}) {
    const {
      score = 0,
      scoreId = 'final-score',
      containerId = 'complete'
    } = options;

    const container = $(containerId);
    const scoreEl = $(scoreId);

    if (scoreEl) scoreEl.textContent = score;
    if (container) container.style.display = 'block';
  }

  /**
   * Hide completion screen
   * @param {string} containerId - Container element ID
   */
  hideComplete(containerId = 'complete') {
    const el = $(containerId);
    if (el) el.style.display = 'none';
  }
}

/**
 * Chat HUD Manager
 * Manages chat UI for multiplayer games
 */
export class ChatHUD {
  constructor(options = {}) {
    this.containerId = options.containerId || 'chatMessages';
    this.inputId = options.inputId || 'chatInput';
    this.sendButtonId = options.sendButtonId || 'chatSend';
    this.maxMessages = options.maxMessages || 100;

    this.onSend = options.onSend || null;
    this._initInput();
  }

  /**
   * Initialize input handlers
   */
  _initInput() {
    const sendBtn = $(this.sendButtonId);
    const input = $(this.inputId);

    if (sendBtn) {
      sendBtn.onclick = () => this._handleSend();
    }

    if (input) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter') this._handleSend();
      };
    }
  }

  /**
   * Handle send action
   */
  _handleSend() {
    const input = $(this.inputId);
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    if (this.onSend) {
      this.onSend(text);
    }
  }

  /**
   * Add chat message
   * @param {string} name - Sender name
   * @param {string} text - Message text
   * @param {boolean} isSelf - Is this message from self
   */
  addMessage(name, text, isSelf = false) {
    const container = $(this.containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'chat-msg' + (isSelf ? ' self' : '');
    div.innerHTML = `
      <div class="chat-msg-meta">${escapeHtml(name)}</div>
      <div class="chat-msg-text">${escapeHtml(text)}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Limit messages
    while (container.children.length > this.maxMessages) {
      container.firstChild.remove();
    }
  }

  /**
   * Add system message
   * @param {string} text - System message text
   */
  addSystemMessage(text) {
    const container = $(this.containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'chat-msg system';
    div.innerHTML = `<div class="chat-msg-text">${escapeHtml(text)}</div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Clear all messages
   */
  clear() {
    const container = $(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

/**
 * Lobby Manager
 * Manages game lobby UI
 */
export class LobbyManager {
  constructor(options = {}) {
    this.lobbyId = options.lobbyId || 'lobby';
    this.nameInputId = options.nameInputId || 'nameInput';
    this.roomInputId = options.roomInputId || 'roomInput';
    this.joinButtonId = options.joinButtonId || 'joinBtn';
    this.statusId = options.statusId || 'lobbyStatus';

    this.selectedTeam = options.defaultTeam || 'gitfox';
    this.onJoin = options.onJoin || null;

    this._initTeamSelection();
    this._initJoinButton();
  }

  /**
   * Initialize team selection
   */
  _initTeamSelection() {
    document.querySelectorAll('.team-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTeam = btn.dataset.team;
      };
    });
  }

  /**
   * Initialize join button
   */
  _initJoinButton() {
    const joinBtn = $(this.joinButtonId);
    const nameInput = $(this.nameInputId);
    const roomInput = $(this.roomInputId);

    if (joinBtn) {
      joinBtn.onclick = () => this._handleJoin();
    }

    if (nameInput) {
      nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') this._handleJoin();
      };
    }

    if (roomInput) {
      roomInput.onkeydown = (e) => {
        if (e.key === 'Enter') this._handleJoin();
      };
    }
  }

  /**
   * Handle join action
   */
  _handleJoin() {
    const nameInput = $(this.nameInputId);
    const roomInput = $(this.roomInputId);

    const name = nameInput?.value.trim() || '';
    const room = roomInput?.value.trim() || '';

    this.hide();

    if (this.onJoin) {
      this.onJoin({
        name,
        room,
        team: this.selectedTeam
      });
    }
  }

  /**
   * Show lobby
   */
  show() {
    const el = $(this.lobbyId);
    if (el) el.classList.remove('hidden');
  }

  /**
   * Hide lobby
   */
  hide() {
    const el = $(this.lobbyId);
    if (el) el.classList.add('hidden');
  }

  /**
   * Update status text
   * @param {string} text
   */
  setStatus(text) {
    const el = $(this.statusId);
    if (el) el.textContent = text;
  }

  /**
   * Get current name input value
   */
  getName() {
    const el = $(this.nameInputId);
    return el?.value.trim() || '';
  }

  /**
   * Get current room input value
   */
  getRoom() {
    const el = $(this.roomInputId);
    return el?.value.trim() || '';
  }
}

export default { GameHUD, ChatHUD, LobbyManager, HUDThemes };
