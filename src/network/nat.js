/**
 * NAT Traversal Module
 * Hole punching, ICE, and connection strategies
 */

import { isRelayAddr, isWebRTCAddr, isWebSocketAddr, buildRelayAddr } from './transport.js'

/**
 * Connection strategy priority
 */
export const ConnectionStrategy = {
  DIRECT: 'direct',
  HOLE_PUNCH: 'hole-punch',
  RELAY: 'relay',
  TURN: 'turn'
}

/**
 * NAT type detection
 */
export const NATType = {
  UNKNOWN: 'unknown',
  OPEN: 'open',
  FULL_CONE: 'full-cone',
  RESTRICTED: 'restricted',
  PORT_RESTRICTED: 'port-restricted',
  SYMMETRIC: 'symmetric'
}

/**
 * NAT Traversal manager
 */
export class NATManager {
  constructor(node, options = {}) {
    this.node = node
    this.relayManager = options.relayManager
    this.timeout = options.timeout || 10000

    this.natType = NATType.UNKNOWN
    this.publicAddrs = []
    this._connectionAttempts = new Map()
  }

  /**
   * Connect to a peer using best available strategy
   * @param {string} peerId
   * @param {string[]} addrs - Known addresses for peer
   * @returns {Promise<{success: boolean, strategy: string}>}
   */
  async connect(peerId, addrs = []) {
    // Track attempt
    const attempt = {
      peerId,
      startTime: Date.now(),
      strategies: []
    }
    this._connectionAttempts.set(peerId, attempt)

    try {
      // Strategy 1: Direct connection
      const directResult = await this._tryDirect(peerId, addrs)
      if (directResult.success) {
        attempt.strategies.push({ type: ConnectionStrategy.DIRECT, success: true })
        return { success: true, strategy: ConnectionStrategy.DIRECT }
      }
      attempt.strategies.push({ type: ConnectionStrategy.DIRECT, success: false })

      // Strategy 2: Hole punching via WebRTC
      const holePunchResult = await this._tryHolePunch(peerId)
      if (holePunchResult.success) {
        attempt.strategies.push({ type: ConnectionStrategy.HOLE_PUNCH, success: true })
        return { success: true, strategy: ConnectionStrategy.HOLE_PUNCH }
      }
      attempt.strategies.push({ type: ConnectionStrategy.HOLE_PUNCH, success: false })

      // Strategy 3: Circuit relay
      if (this.relayManager) {
        const relayResult = await this._tryRelay(peerId)
        if (relayResult.success) {
          attempt.strategies.push({ type: ConnectionStrategy.RELAY, success: true })
          return { success: true, strategy: ConnectionStrategy.RELAY }
        }
        attempt.strategies.push({ type: ConnectionStrategy.RELAY, success: false })
      }

      return { success: false, strategy: null }
    } finally {
      attempt.endTime = Date.now()
      attempt.duration = attempt.endTime - attempt.startTime
    }
  }

  /**
   * Try direct connection to addresses
   * @private
   */
  async _tryDirect(peerId, addrs) {
    // Filter to direct addresses (not relay)
    const directAddrs = addrs.filter(a => !isRelayAddr(a))

    // Prioritize: WebSocket > WebRTC
    const prioritized = directAddrs.sort((a, b) => {
      if (isWebSocketAddr(a) && !isWebSocketAddr(b)) return -1
      if (!isWebSocketAddr(a) && isWebSocketAddr(b)) return 1
      return 0
    })

    for (const addr of prioritized) {
      try {
        await Promise.race([
          this.node.dial(addr),
          this._timeoutPromise()
        ])
        return { success: true, addr }
      } catch (err) {
        // Try next address
      }
    }

    return { success: false }
  }

  /**
   * Try hole punching via WebRTC
   * @private
   */
  async _tryHolePunch(peerId) {
    // WebRTC hole punching is handled by libp2p/webrtc
    // We just need to try dialing with /webrtc
    try {
      const webrtcAddr = `/webrtc/p2p/${peerId}`
      await Promise.race([
        this.node.dial(webrtcAddr),
        this._timeoutPromise()
      ])
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Try relay connection
   * @private
   */
  async _tryRelay(peerId) {
    if (!this.relayManager) {
      return { success: false, error: 'No relay manager' }
    }

    try {
      const success = await this.relayManager.connectViaRelay(peerId)
      return { success }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Create a timeout promise
   * @private
   */
  _timeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), this.timeout)
    })
  }

  /**
   * Detect NAT type (simplified)
   * @returns {Promise<string>}
   */
  async detectNATType() {
    // In browser, we can't fully detect NAT type
    // But we can infer from connection patterns

    const addrs = this.node.multiaddrs
    const hasPublicAddr = addrs.some(a => {
      const str = a.toString ? a.toString() : a
      // Check for public IP patterns
      return !str.includes('127.0.0.1') &&
             !str.includes('/ip4/10.') &&
             !str.includes('/ip4/192.168.') &&
             !str.includes('/ip4/172.')
    })

    if (hasPublicAddr) {
      this.natType = NATType.OPEN
    } else {
      // Assume restricted NAT in browser environment
      this.natType = NATType.RESTRICTED
    }

    return this.natType
  }

  /**
   * Check if we're behind NAT
   * @returns {boolean}
   */
  isBehindNAT() {
    return this.natType !== NATType.OPEN && this.natType !== NATType.UNKNOWN
  }

  /**
   * Get connection stats
   * @returns {object}
   */
  getConnectionStats() {
    const stats = {
      attempts: this._connectionAttempts.size,
      successful: 0,
      failed: 0,
      byStrategy: {}
    }

    for (const [, attempt] of this._connectionAttempts) {
      const lastStrategy = attempt.strategies[attempt.strategies.length - 1]
      if (lastStrategy?.success) {
        stats.successful++
        stats.byStrategy[lastStrategy.type] = (stats.byStrategy[lastStrategy.type] || 0) + 1
      } else {
        stats.failed++
      }
    }

    return stats
  }

  /**
   * Get average connection time
   * @returns {number}
   */
  getAverageConnectionTime() {
    let total = 0
    let count = 0

    for (const [, attempt] of this._connectionAttempts) {
      if (attempt.duration) {
        total += attempt.duration
        count++
      }
    }

    return count > 0 ? Math.round(total / count) : 0
  }

  /**
   * Clean up old connection attempts
   * @param {number} maxAge
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now()
    for (const [peerId, attempt] of this._connectionAttempts) {
      if (attempt.endTime && now - attempt.endTime > maxAge) {
        this._connectionAttempts.delete(peerId)
      }
    }
  }
}

/**
 * ICE candidate handler for WebRTC
 */
export class ICEManager {
  constructor() {
    this.candidates = new Map() // peerId -> candidates[]
    this.stunServers = [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:global.stun.twilio.com:3478'
    ]
  }

  /**
   * Get ICE servers configuration
   * @returns {RTCIceServer[]}
   */
  getIceServers() {
    return this.stunServers.map(url => ({ urls: [url] }))
  }

  /**
   * Add ICE candidate for a peer
   * @param {string} peerId
   * @param {RTCIceCandidate} candidate
   */
  addCandidate(peerId, candidate) {
    if (!this.candidates.has(peerId)) {
      this.candidates.set(peerId, [])
    }
    this.candidates.get(peerId).push(candidate)
  }

  /**
   * Get candidates for a peer
   * @param {string} peerId
   * @returns {RTCIceCandidate[]}
   */
  getCandidates(peerId) {
    return this.candidates.get(peerId) || []
  }

  /**
   * Clear candidates for a peer
   * @param {string} peerId
   */
  clearCandidates(peerId) {
    this.candidates.delete(peerId)
  }

  /**
   * Analyze candidate types
   * @param {string} peerId
   * @returns {object}
   */
  analyzeCandidates(peerId) {
    const candidates = this.getCandidates(peerId)
    const analysis = {
      host: 0,
      srflx: 0,
      relay: 0,
      prflx: 0
    }

    for (const candidate of candidates) {
      const type = candidate.type || 'unknown'
      if (analysis[type] !== undefined) {
        analysis[type]++
      }
    }

    return analysis
  }
}

export default {
  ConnectionStrategy,
  NATType,
  NATManager,
  ICEManager
}
