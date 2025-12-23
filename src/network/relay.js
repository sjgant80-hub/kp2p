/**
 * Relay Module
 * Circuit relay client for NAT traversal
 */

import { PROTOCOLS } from '../config.js'

/**
 * Relay reservation status
 */
export const ReservationStatus = {
  NONE: 'none',
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  FAILED: 'failed'
}

/**
 * Relay manager for circuit relay connections
 */
export class RelayManager {
  constructor(node, options = {}) {
    this.node = node
    this.maxReservations = options.maxReservations || 3
    this.reservationTTL = options.reservationTTL || 3600000 // 1 hour

    this.reservations = new Map() // relayPeerId -> ReservationInfo
    this.relayAddrs = new Map() // relayPeerId -> multiaddr
    this._checkTimer = null
    this._started = false
  }

  /**
   * Start relay manager
   */
  async start() {
    if (this._started) return
    this._started = true

    // Periodically check reservation status
    this._checkTimer = setInterval(() => {
      this._checkReservations()
    }, 60000)

    console.log('📡 Relay manager started')
  }

  /**
   * Stop relay manager
   */
  async stop() {
    if (!this._started) return
    this._started = false

    if (this._checkTimer) {
      clearInterval(this._checkTimer)
      this._checkTimer = null
    }

    // Clear reservations
    this.reservations.clear()
    this.relayAddrs.clear()

    console.log('📡 Relay manager stopped')
  }

  /**
   * Add a relay peer
   * @param {string} relayPeerId
   * @param {string} relayAddr
   */
  addRelay(relayPeerId, relayAddr) {
    this.relayAddrs.set(relayPeerId, relayAddr)
  }

  /**
   * Remove a relay peer
   * @param {string} relayPeerId
   */
  removeRelay(relayPeerId) {
    this.relayAddrs.delete(relayPeerId)
    this.reservations.delete(relayPeerId)
  }

  /**
   * Request a reservation from a relay
   * @param {string} relayPeerId
   * @returns {Promise<boolean>}
   */
  async requestReservation(relayPeerId) {
    if (this.reservations.size >= this.maxReservations) {
      // Find and remove oldest reservation
      let oldest = null
      let oldestTime = Infinity

      for (const [peerId, info] of this.reservations) {
        if (info.createdAt < oldestTime) {
          oldest = peerId
          oldestTime = info.createdAt
        }
      }

      if (oldest) {
        this.reservations.delete(oldest)
      }
    }

    // Mark as pending
    this.reservations.set(relayPeerId, {
      status: ReservationStatus.PENDING,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.reservationTTL
    })

    try {
      // The reservation happens automatically with circuit-relay-v2
      // when we connect to a relay peer
      const relayAddr = this.relayAddrs.get(relayPeerId)
      if (relayAddr) {
        await this.node.dial(relayAddr)
      }

      this.reservations.set(relayPeerId, {
        status: ReservationStatus.ACTIVE,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.reservationTTL
      })

      return true
    } catch (err) {
      this.reservations.set(relayPeerId, {
        status: ReservationStatus.FAILED,
        createdAt: Date.now(),
        error: err.message
      })

      return false
    }
  }

  /**
   * Get relay address for a target peer
   * @param {string} targetPeerId
   * @returns {string|null}
   */
  getRelayAddrFor(targetPeerId) {
    // Find an active relay
    for (const [relayPeerId, info] of this.reservations) {
      if (info.status === ReservationStatus.ACTIVE) {
        const relayAddr = this.relayAddrs.get(relayPeerId)
        if (relayAddr) {
          return `${relayAddr}/p2p-circuit/p2p/${targetPeerId}`
        }
      }
    }

    return null
  }

  /**
   * Get active reservations
   * @returns {string[]}
   */
  getActiveRelays() {
    const active = []
    for (const [relayPeerId, info] of this.reservations) {
      if (info.status === ReservationStatus.ACTIVE) {
        active.push(relayPeerId)
      }
    }
    return active
  }

  /**
   * Check and update reservation status
   * @private
   */
  _checkReservations() {
    const now = Date.now()

    for (const [relayPeerId, info] of this.reservations) {
      if (info.status === ReservationStatus.ACTIVE && info.expiresAt < now) {
        // Mark as expired
        this.reservations.set(relayPeerId, {
          ...info,
          status: ReservationStatus.EXPIRED
        })

        // Try to renew
        this.requestReservation(relayPeerId)
      }
    }
  }

  /**
   * Connect to a peer through relay
   * @param {string} targetPeerId
   * @returns {Promise<boolean>}
   */
  async connectViaRelay(targetPeerId) {
    const relayAddr = this.getRelayAddrFor(targetPeerId)
    if (!relayAddr) {
      console.warn('No active relay available')
      return false
    }

    try {
      await this.node.dial(relayAddr)
      return true
    } catch (err) {
      console.warn('Relay connection failed:', err.message)
      return false
    }
  }

  /**
   * Auto-discover and connect to relays from bootstrap
   */
  async autoConnect() {
    const peers = this.node.getConnectedPeers()

    for (const peerId of peers) {
      // Check if peer supports relay
      const connections = this.node.getConnections()
      for (const conn of connections) {
        if (conn.remotePeer.toString() === peerId) {
          const addr = conn.remoteAddr.toString()
          // If connected via WebSocket, they might be a relay
          if (addr.includes('/ws') || addr.includes('/wss')) {
            this.addRelay(peerId, addr)
            await this.requestReservation(peerId)
          }
          break
        }
      }
    }
  }

  /**
   * Get stats about relay connections
   * @returns {object}
   */
  getStats() {
    const stats = {
      total: this.reservations.size,
      active: 0,
      pending: 0,
      expired: 0,
      failed: 0
    }

    for (const [, info] of this.reservations) {
      switch (info.status) {
        case ReservationStatus.ACTIVE:
          stats.active++
          break
        case ReservationStatus.PENDING:
          stats.pending++
          break
        case ReservationStatus.EXPIRED:
          stats.expired++
          break
        case ReservationStatus.FAILED:
          stats.failed++
          break
      }
    }

    return stats
  }
}

export default {
  ReservationStatus,
  RelayManager
}
