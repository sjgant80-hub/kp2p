/**
 * Awareness Module
 * Presence and cursor tracking for real-time collaboration
 */

import { SYNC_CONFIG } from '../config.js'

/**
 * User presence states
 */
export const PresenceState = {
  ACTIVE: 'active',
  IDLE: 'idle',
  AWAY: 'away',
  OFFLINE: 'offline'
}

/**
 * Default user colors for collaboration
 */
export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  '#FF69B4', '#7FFF00', '#FF4500', '#1E90FF'
]

/**
 * Generate a random user color
 * @returns {string}
 */
export function getRandomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

/**
 * Awareness state manager
 */
export class AwarenessManager {
  /**
   * Create awareness manager
   * @param {Awareness} awareness - Yjs Awareness instance
   * @param {object} options
   */
  constructor(awareness, options = {}) {
    this.awareness = awareness
    this.timeout = options.timeout || SYNC_CONFIG.awarenessTimeout

    this._user = null
    this._idleTimeout = null
    this._awayTimeout = null
    this._lastActivity = Date.now()

    // Bind methods
    this._onActivity = this._onActivity.bind(this)
    this._checkIdle = this._checkIdle.bind(this)
  }

  /**
   * Set user info
   * @param {object} user - User info (name, color, avatar)
   */
  setUser(user) {
    this._user = {
      name: user.name || 'Anonymous',
      color: user.color || getRandomColor(),
      avatar: user.avatar || null,
      ...user
    }

    this._updateAwareness()
  }

  /**
   * Get current user info
   * @returns {object}
   */
  getUser() {
    return this._user
  }

  /**
   * Set cursor position
   * @param {object} cursor - Cursor info (x, y, or selection)
   */
  setCursor(cursor) {
    this._updateAwareness({ cursor })
    this._onActivity()
  }

  /**
   * Set selection (for text editing)
   * @param {object} selection - Selection info (anchor, head)
   */
  setSelection(selection) {
    this._updateAwareness({ selection })
    this._onActivity()
  }

  /**
   * Set custom state
   * @param {object} state
   */
  setCustomState(state) {
    this._updateAwareness({ custom: state })
    this._onActivity()
  }

  /**
   * Update awareness state
   * @private
   */
  _updateAwareness(updates = {}) {
    const currentState = this.awareness.getLocalState() || {}

    this.awareness.setLocalState({
      user: this._user,
      state: this._getPresenceState(),
      lastActive: this._lastActivity,
      ...currentState,
      ...updates
    })
  }

  /**
   * Get current presence state
   * @private
   */
  _getPresenceState() {
    const elapsed = Date.now() - this._lastActivity

    if (elapsed > 300000) { // 5 minutes
      return PresenceState.AWAY
    }
    if (elapsed > 60000) { // 1 minute
      return PresenceState.IDLE
    }
    return PresenceState.ACTIVE
  }

  /**
   * Handle user activity
   * @private
   */
  _onActivity() {
    this._lastActivity = Date.now()
    this._updateAwareness()
  }

  /**
   * Start activity tracking
   */
  startTracking() {
    // Track mouse movement
    if (typeof document !== 'undefined') {
      document.addEventListener('mousemove', this._onActivity)
      document.addEventListener('keypress', this._onActivity)
      document.addEventListener('click', this._onActivity)
      document.addEventListener('scroll', this._onActivity)
    }

    // Check for idle periodically
    this._idleInterval = setInterval(this._checkIdle, 30000)
  }

  /**
   * Stop activity tracking
   */
  stopTracking() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousemove', this._onActivity)
      document.removeEventListener('keypress', this._onActivity)
      document.removeEventListener('click', this._onActivity)
      document.removeEventListener('scroll', this._onActivity)
    }

    if (this._idleInterval) {
      clearInterval(this._idleInterval)
    }
  }

  /**
   * Check for idle state
   * @private
   */
  _checkIdle() {
    this._updateAwareness()
  }

  /**
   * Get all users
   * @returns {Array}
   */
  getUsers() {
    const states = this.awareness.getStates()
    const users = []

    for (const [clientId, state] of states) {
      if (state?.user) {
        users.push({
          clientId,
          ...state.user,
          state: state.state || PresenceState.ACTIVE,
          cursor: state.cursor,
          selection: state.selection,
          lastActive: state.lastActive
        })
      }
    }

    return users
  }

  /**
   * Get active users (not offline/away)
   * @returns {Array}
   */
  getActiveUsers() {
    return this.getUsers().filter(u =>
      u.state === PresenceState.ACTIVE || u.state === PresenceState.IDLE
    )
  }

  /**
   * Get user count
   * @returns {number}
   */
  getUserCount() {
    return this.getUsers().length
  }

  /**
   * Remove stale users
   */
  removeStaleUsers() {
    const now = Date.now()
    const states = this.awareness.getStates()

    for (const [clientId, state] of states) {
      if (state?.lastActive && now - state.lastActive > this.timeout) {
        this.awareness.setLocalStateField(clientId, null)
      }
    }
  }

  /**
   * Add awareness change listener
   * @param {function} handler
   */
  onChange(handler) {
    this.awareness.on('change', handler)
  }

  /**
   * Remove awareness change listener
   * @param {function} handler
   */
  offChange(handler) {
    this.awareness.off('change', handler)
  }
}

/**
 * Cursor overlay renderer
 */
export class CursorOverlay {
  constructor(container, awarenessManager) {
    this.container = container
    this.awareness = awarenessManager
    this.cursors = new Map() // clientId -> cursor element
  }

  /**
   * Start rendering cursors
   */
  start() {
    this.awareness.onChange(this._update.bind(this))
    this._update()
  }

  /**
   * Stop rendering cursors
   */
  stop() {
    this.cursors.forEach(el => el.remove())
    this.cursors.clear()
  }

  /**
   * Update cursor display
   * @private
   */
  _update() {
    const users = this.awareness.getActiveUsers()
    const localClientId = this.awareness.awareness.clientID

    // Update or create cursor elements
    for (const user of users) {
      if (user.clientId === localClientId) continue
      if (!user.cursor) continue

      let el = this.cursors.get(user.clientId)

      if (!el) {
        el = this._createCursorElement(user)
        this.container.appendChild(el)
        this.cursors.set(user.clientId, el)
      }

      this._updateCursorElement(el, user)
    }

    // Remove old cursors
    const activeClientIds = new Set(users.map(u => u.clientId))
    for (const [clientId, el] of this.cursors) {
      if (!activeClientIds.has(clientId)) {
        el.remove()
        this.cursors.delete(clientId)
      }
    }
  }

  /**
   * Create cursor DOM element
   * @private
   */
  _createCursorElement(user) {
    const el = document.createElement('div')
    el.className = 'konomi-cursor'
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="${user.color}">
        <path d="M5.65 0L18.15 12.5L12.4 12.5L18.15 22.5L15.4 24L9.65 14L5.65 18.5L5.65 0Z"/>
      </svg>
      <span class="konomi-cursor-label" style="background: ${user.color}">${user.name}</span>
    `
    el.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 9999;
      transition: transform 0.1s ease-out;
    `
    return el
  }

  /**
   * Update cursor element position
   * @private
   */
  _updateCursorElement(el, user) {
    if (user.cursor) {
      el.style.transform = `translate(${user.cursor.x}px, ${user.cursor.y}px)`
      el.style.display = 'block'
    } else {
      el.style.display = 'none'
    }
  }
}

export default {
  PresenceState,
  USER_COLORS,
  getRandomColor,
  AwarenessManager,
  CursorOverlay
}
