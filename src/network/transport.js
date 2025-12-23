/**
 * Transport Module
 * WebRTC and WebSocket transport utilities
 */

import { multiaddr } from '@multiformats/multiaddr'

/**
 * Transport types
 */
export const TransportType = {
  WEBRTC: 'webrtc',
  WEBSOCKET: 'websocket',
  CIRCUIT_RELAY: 'circuit-relay'
}

/**
 * Parse a multiaddr string
 * @param {string} addr
 * @returns {Multiaddr}
 */
export function parseMultiaddr(addr) {
  return multiaddr(addr)
}

/**
 * Determine transport type from multiaddr
 * @param {string|Multiaddr} addr
 * @returns {string}
 */
export function getTransportType(addr) {
  const str = typeof addr === 'string' ? addr : addr.toString()

  if (str.includes('/webrtc')) {
    return TransportType.WEBRTC
  }
  if (str.includes('/p2p-circuit')) {
    return TransportType.CIRCUIT_RELAY
  }
  if (str.includes('/ws') || str.includes('/wss')) {
    return TransportType.WEBSOCKET
  }

  return null
}

/**
 * Check if multiaddr is a relay address
 * @param {string|Multiaddr} addr
 * @returns {boolean}
 */
export function isRelayAddr(addr) {
  const str = typeof addr === 'string' ? addr : addr.toString()
  return str.includes('/p2p-circuit')
}

/**
 * Check if multiaddr is a WebRTC address
 * @param {string|Multiaddr} addr
 * @returns {boolean}
 */
export function isWebRTCAddr(addr) {
  const str = typeof addr === 'string' ? addr : addr.toString()
  return str.includes('/webrtc')
}

/**
 * Check if multiaddr is a WebSocket address
 * @param {string|Multiaddr} addr
 * @returns {boolean}
 */
export function isWebSocketAddr(addr) {
  const str = typeof addr === 'string' ? addr : addr.toString()
  return str.includes('/ws') || str.includes('/wss')
}

/**
 * Extract peer ID from multiaddr
 * @param {string|Multiaddr} addr
 * @returns {string|null}
 */
export function extractPeerId(addr) {
  const str = typeof addr === 'string' ? addr : addr.toString()
  const match = str.match(/\/p2p\/([A-Za-z0-9]+)$/)
  return match ? match[1] : null
}

/**
 * Build a relay multiaddr
 * @param {string} relayAddr - Relay node multiaddr
 * @param {string} targetPeerId - Target peer ID
 * @returns {string}
 */
export function buildRelayAddr(relayAddr, targetPeerId) {
  return `${relayAddr}/p2p-circuit/p2p/${targetPeerId}`
}

/**
 * Build a WebRTC multiaddr
 * @param {string} peerId
 * @returns {string}
 */
export function buildWebRTCAddr(peerId) {
  return `/webrtc/p2p/${peerId}`
}

/**
 * Connection quality monitor
 */
export class ConnectionQuality {
  constructor() {
    this.measurements = []
    this.maxMeasurements = 100
  }

  /**
   * Add a latency measurement
   * @param {number} latency - Latency in ms
   */
  addMeasurement(latency) {
    this.measurements.push({
      latency,
      timestamp: Date.now()
    })

    // Keep only recent measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift()
    }
  }

  /**
   * Get average latency
   * @returns {number}
   */
  getAverageLatency() {
    if (this.measurements.length === 0) return -1
    const sum = this.measurements.reduce((acc, m) => acc + m.latency, 0)
    return Math.round(sum / this.measurements.length)
  }

  /**
   * Get jitter (variance in latency)
   * @returns {number}
   */
  getJitter() {
    if (this.measurements.length < 2) return 0
    const avg = this.getAverageLatency()
    const variance = this.measurements.reduce(
      (acc, m) => acc + Math.pow(m.latency - avg, 2),
      0
    ) / this.measurements.length
    return Math.round(Math.sqrt(variance))
  }

  /**
   * Get quality score (0-100)
   * @returns {number}
   */
  getQualityScore() {
    const latency = this.getAverageLatency()
    const jitter = this.getJitter()

    if (latency < 0) return 0

    // Score based on latency (lower is better)
    let latencyScore = 100 - Math.min(latency / 5, 100)

    // Penalize for jitter
    let jitterPenalty = Math.min(jitter / 2, 30)

    return Math.max(0, Math.round(latencyScore - jitterPenalty))
  }

  /**
   * Get quality label
   * @returns {string}
   */
  getQualityLabel() {
    const score = this.getQualityScore()
    if (score >= 80) return 'excellent'
    if (score >= 60) return 'good'
    if (score >= 40) return 'fair'
    if (score >= 20) return 'poor'
    return 'bad'
  }
}

/**
 * Bandwidth estimator
 */
export class BandwidthEstimator {
  constructor() {
    this.samples = []
    this.maxSamples = 50
  }

  /**
   * Add a transfer sample
   * @param {number} bytes - Bytes transferred
   * @param {number} duration - Duration in ms
   */
  addSample(bytes, duration) {
    if (duration <= 0) return

    const bytesPerSecond = (bytes / duration) * 1000
    this.samples.push({
      bytesPerSecond,
      timestamp: Date.now()
    })

    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
  }

  /**
   * Get estimated bandwidth in bytes/second
   * @returns {number}
   */
  getEstimate() {
    if (this.samples.length === 0) return 0

    // Use 75th percentile for more stable estimate
    const sorted = [...this.samples].sort((a, b) => a.bytesPerSecond - b.bytesPerSecond)
    const idx = Math.floor(sorted.length * 0.75)
    return sorted[idx].bytesPerSecond
  }

  /**
   * Get human-readable bandwidth
   * @returns {string}
   */
  getReadable() {
    const bps = this.getEstimate()
    if (bps >= 1024 * 1024) {
      return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
    }
    if (bps >= 1024) {
      return `${(bps / 1024).toFixed(1)} KB/s`
    }
    return `${Math.round(bps)} B/s`
  }
}

/**
 * Transport manager for handling multiple connections
 */
export class TransportManager {
  constructor(node) {
    this.node = node
    this.qualities = new Map() // peerId -> ConnectionQuality
    this.bandwidth = new BandwidthEstimator()
  }

  /**
   * Get connection quality for a peer
   * @param {string} peerId
   * @returns {ConnectionQuality}
   */
  getQuality(peerId) {
    if (!this.qualities.has(peerId)) {
      this.qualities.set(peerId, new ConnectionQuality())
    }
    return this.qualities.get(peerId)
  }

  /**
   * Record a latency measurement
   * @param {string} peerId
   * @param {number} latency
   */
  recordLatency(peerId, latency) {
    this.getQuality(peerId).addMeasurement(latency)
  }

  /**
   * Record a transfer
   * @param {number} bytes
   * @param {number} duration
   */
  recordTransfer(bytes, duration) {
    this.bandwidth.addSample(bytes, duration)
  }

  /**
   * Get best peers by connection quality
   * @param {number} limit
   * @returns {string[]}
   */
  getBestPeers(limit = 10) {
    const peers = this.node.getConnectedPeers()
    return peers
      .map(peerId => ({
        peerId,
        score: this.getQuality(peerId).getQualityScore()
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(p => p.peerId)
  }

  /**
   * Clean up stale quality data
   * @param {number} maxAge - Max age in ms
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now()
    const connectedPeers = new Set(this.node.getConnectedPeers())

    for (const [peerId, quality] of this.qualities) {
      if (!connectedPeers.has(peerId)) {
        // Remove quality data for disconnected peers after maxAge
        const lastMeasurement = quality.measurements[quality.measurements.length - 1]
        if (!lastMeasurement || now - lastMeasurement.timestamp > maxAge) {
          this.qualities.delete(peerId)
        }
      }
    }
  }
}

export default {
  TransportType,
  parseMultiaddr,
  getTransportType,
  isRelayAddr,
  isWebRTCAddr,
  isWebSocketAddr,
  extractPeerId,
  buildRelayAddr,
  buildWebRTCAddr,
  ConnectionQuality,
  BandwidthEstimator,
  TransportManager
}
