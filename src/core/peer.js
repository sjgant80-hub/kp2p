/**
 * Peer Module
 * PeerId and PeerInfo types and utilities
 */

import { toString, fromString } from 'uint8arrays'
import { hash, toBase64, fromBase64 } from './crypto.js'

/**
 * Create a PeerId from a public key
 * @param {Uint8Array} publicKey
 * @returns {string} - Base58-encoded peer ID
 */
export function createPeerId(publicKey) {
  const hashed = hash(publicKey)
  // Use first 32 bytes of hash as peer ID
  return toBase58(hashed.slice(0, 32))
}

/**
 * Base58 alphabet (Bitcoin-style)
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Encode bytes to Base58
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toBase58(bytes) {
  if (bytes.length === 0) return ''

  // Count leading zeros
  let zeros = 0
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    zeros++
  }

  // Convert to base58
  const size = Math.ceil(bytes.length * 138 / 100) + 1
  const b58 = new Uint8Array(size)

  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = size - 1; j >= 0; j--) {
      carry += 256 * b58[j]
      b58[j] = carry % 58
      carry = Math.floor(carry / 58)
    }
  }

  // Skip leading zeros in b58
  let start = 0
  while (start < size && b58[start] === 0) {
    start++
  }

  // Build result
  let result = '1'.repeat(zeros)
  for (let i = start; i < size; i++) {
    result += BASE58_ALPHABET[b58[i]]
  }

  return result
}

/**
 * Decode Base58 to bytes
 * @param {string} str
 * @returns {Uint8Array}
 */
export function fromBase58(str) {
  if (str.length === 0) return new Uint8Array(0)

  // Count leading ones (zeros in bytes)
  let zeros = 0
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    zeros++
  }

  // Allocate enough space
  const size = Math.ceil(str.length * 733 / 1000) + 1
  const bytes = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    const ch = BASE58_ALPHABET.indexOf(str[i])
    if (ch === -1) {
      throw new Error(`Invalid base58 character: ${str[i]}`)
    }

    let carry = ch
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * bytes[j]
      bytes[j] = carry % 256
      carry = Math.floor(carry / 256)
    }
  }

  // Skip leading zeros in bytes
  let start = 0
  while (start < size && bytes[start] === 0) {
    start++
  }

  // Build result with leading zeros
  const result = new Uint8Array(zeros + (size - start))
  for (let i = start; i < size; i++) {
    result[zeros + (i - start)] = bytes[i]
  }

  return result
}

/**
 * Validate a peer ID format
 * @param {string} peerId
 * @returns {boolean}
 */
export function isValidPeerId(peerId) {
  if (typeof peerId !== 'string' || peerId.length < 20) {
    return false
  }
  try {
    const decoded = fromBase58(peerId)
    return decoded.length === 32
  } catch {
    return false
  }
}

/**
 * PeerInfo class representing information about a peer
 */
export class PeerInfo {
  constructor(options) {
    this.id = options.id
    this.publicKey = options.publicKey || null
    this.addrs = options.addrs || []
    this.protocols = options.protocols || []
    this.seen = options.seen || Date.now()
    this.latency = options.latency || -1
    this.score = options.score || 0
    this.trusted = options.trusted || false
    this.blocked = options.blocked || false
    this.metadata = options.metadata || {}
  }

  /**
   * Update last seen timestamp
   */
  touch() {
    this.seen = Date.now()
  }

  /**
   * Update latency measurement
   * @param {number} ms
   */
  updateLatency(ms) {
    if (this.latency < 0) {
      this.latency = ms
    } else {
      // Exponential moving average
      this.latency = Math.round(this.latency * 0.8 + ms * 0.2)
    }
  }

  /**
   * Add score points
   * @param {number} points
   */
  addScore(points) {
    this.score = Math.max(-1000, Math.min(1000, this.score + points))
  }

  /**
   * Check if peer is stale (not seen recently)
   * @param {number} timeout - Timeout in ms
   * @returns {boolean}
   */
  isStale(timeout = 60000) {
    return Date.now() - this.seen > timeout
  }

  /**
   * Add a multiaddr
   * @param {string} addr
   */
  addAddr(addr) {
    if (!this.addrs.includes(addr)) {
      this.addrs.push(addr)
    }
  }

  /**
   * Add a protocol
   * @param {string} protocol
   */
  addProtocol(protocol) {
    if (!this.protocols.includes(protocol)) {
      this.protocols.push(protocol)
    }
  }

  /**
   * Check if peer supports a protocol
   * @param {string} protocol
   * @returns {boolean}
   */
  supportsProtocol(protocol) {
    return this.protocols.includes(protocol)
  }

  toJSON() {
    return {
      id: this.id,
      publicKey: this.publicKey ? toBase64(this.publicKey) : null,
      addrs: this.addrs,
      protocols: this.protocols,
      seen: this.seen,
      latency: this.latency,
      score: this.score,
      trusted: this.trusted,
      blocked: this.blocked,
      metadata: this.metadata
    }
  }

  static fromJSON(json) {
    return new PeerInfo({
      ...json,
      publicKey: json.publicKey ? fromBase64(json.publicKey) : null
    })
  }
}

/**
 * PeerStore for managing known peers
 */
export class PeerStore {
  constructor() {
    this.peers = new Map()
  }

  /**
   * Add or update a peer
   * @param {PeerInfo} peerInfo
   */
  add(peerInfo) {
    const existing = this.peers.get(peerInfo.id)
    if (existing) {
      // Merge info
      existing.touch()
      peerInfo.addrs.forEach(addr => existing.addAddr(addr))
      peerInfo.protocols.forEach(proto => existing.addProtocol(proto))
      if (peerInfo.latency >= 0) {
        existing.updateLatency(peerInfo.latency)
      }
    } else {
      this.peers.set(peerInfo.id, peerInfo)
    }
  }

  /**
   * Get a peer by ID
   * @param {string} peerId
   * @returns {PeerInfo|undefined}
   */
  get(peerId) {
    return this.peers.get(peerId)
  }

  /**
   * Remove a peer
   * @param {string} peerId
   */
  remove(peerId) {
    this.peers.delete(peerId)
  }

  /**
   * Check if peer exists
   * @param {string} peerId
   * @returns {boolean}
   */
  has(peerId) {
    return this.peers.has(peerId)
  }

  /**
   * Get all peers
   * @returns {PeerInfo[]}
   */
  all() {
    return Array.from(this.peers.values())
  }

  /**
   * Get peers sorted by score
   * @param {number} limit
   * @returns {PeerInfo[]}
   */
  topPeers(limit = 10) {
    return this.all()
      .filter(p => !p.blocked && p.score > -100)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Get trusted peers
   * @returns {PeerInfo[]}
   */
  trustedPeers() {
    return this.all().filter(p => p.trusted && !p.blocked)
  }

  /**
   * Remove stale peers
   * @param {number} timeout
   */
  pruneStale(timeout = 3600000) {
    for (const [id, peer] of this.peers) {
      if (peer.isStale(timeout) && !peer.trusted) {
        this.peers.delete(id)
      }
    }
  }

  /**
   * Get count of peers
   * @returns {number}
   */
  get size() {
    return this.peers.size
  }

  toJSON() {
    return Array.from(this.peers.values()).map(p => p.toJSON())
  }

  static fromJSON(json) {
    const store = new PeerStore()
    json.forEach(p => store.add(PeerInfo.fromJSON(p)))
    return store
  }
}

export default {
  createPeerId,
  toBase58,
  fromBase58,
  isValidPeerId,
  PeerInfo,
  PeerStore
}
