/**
 * Sync Protocol
 * State vector exchange for efficient CRDT sync
 */

import * as Y from 'yjs'
import { fromString, toString } from 'uint8arrays'
import { PROTOCOLS } from '../config.js'

/**
 * Sync protocol message types
 */
export const SyncMessageType = {
  STATE_VECTOR: 0,
  STATE_DIFF: 1,
  UPDATE: 2,
  REQUEST_FULL: 3
}

/**
 * Encode sync message
 * @param {object} msg
 * @returns {Uint8Array}
 */
export function encodeSyncMessage(msg) {
  const json = JSON.stringify({
    type: msg.type,
    data: msg.data ? Array.from(msg.data) : null
  })
  return fromString(json)
}

/**
 * Decode sync message
 * @param {Uint8Array} data
 * @returns {object}
 */
export function decodeSyncMessage(data) {
  const msg = JSON.parse(toString(data))
  if (msg.data) {
    msg.data = new Uint8Array(msg.data)
  }
  return msg
}

/**
 * Sync protocol handler for libp2p streams
 */
export class SyncProtocol {
  constructor(node, doc) {
    this.node = node
    this.doc = doc
    this.protocol = PROTOCOLS.SYNC
    this._started = false
  }

  /**
   * Start protocol handler
   */
  async start() {
    if (this._started) return
    this._started = true

    // Register protocol handler
    await this.node.handle(this.protocol, this._handleStream.bind(this))

    console.log('🔄 Sync protocol started')
  }

  /**
   * Stop protocol handler
   */
  async stop() {
    if (!this._started) return
    this._started = false

    await this.node.unhandle(this.protocol)

    console.log('🔄 Sync protocol stopped')
  }

  /**
   * Handle incoming stream
   * @private
   */
  async _handleStream({ stream }) {
    try {
      // Read message
      const chunks = []
      for await (const chunk of stream.source) {
        chunks.push(chunk)
      }

      const data = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        data.set(chunk, offset)
        offset += chunk.length
      }

      const msg = decodeSyncMessage(data)

      // Process and respond
      const response = this._processMessage(msg)
      if (response) {
        const encoded = encodeSyncMessage(response)
        await stream.sink([encoded])
      }
    } catch (err) {
      console.warn('Sync stream error:', err.message)
    } finally {
      stream.close()
    }
  }

  /**
   * Process sync message
   * @private
   */
  _processMessage(msg) {
    switch (msg.type) {
      case SyncMessageType.STATE_VECTOR:
        // Return state diff
        const diff = Y.encodeStateAsUpdate(this.doc, msg.data)
        return {
          type: SyncMessageType.STATE_DIFF,
          data: diff
        }

      case SyncMessageType.STATE_DIFF:
        // Apply diff
        Y.applyUpdate(this.doc, msg.data, 'sync-protocol')
        return null

      case SyncMessageType.UPDATE:
        // Apply update
        Y.applyUpdate(this.doc, msg.data, 'sync-protocol')
        return null

      case SyncMessageType.REQUEST_FULL:
        // Return full state
        return {
          type: SyncMessageType.STATE_DIFF,
          data: Y.encodeStateAsUpdate(this.doc)
        }

      default:
        return null
    }
  }

  /**
   * Request sync from peer
   * @param {string} peerId
   */
  async syncWithPeer(peerId) {
    try {
      const stream = await this.node.dialProtocol(peerId, this.protocol)

      // Send our state vector
      const stateVector = Y.encodeStateVector(this.doc)
      const msg = encodeSyncMessage({
        type: SyncMessageType.STATE_VECTOR,
        data: stateVector
      })

      await stream.sink([msg])

      // Read response
      const chunks = []
      for await (const chunk of stream.source) {
        chunks.push(chunk)
      }

      if (chunks.length > 0) {
        const data = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          data.set(chunk, offset)
          offset += chunk.length
        }

        const response = decodeSyncMessage(data)
        if (response.type === SyncMessageType.STATE_DIFF) {
          Y.applyUpdate(this.doc, response.data, 'sync-protocol')
        }
      }

      stream.close()
      return true
    } catch (err) {
      console.warn(`Sync with ${peerId} failed:`, err.message)
      return false
    }
  }

  /**
   * Send update to peer
   * @param {string} peerId
   * @param {Uint8Array} update
   */
  async sendUpdate(peerId, update) {
    try {
      const stream = await this.node.dialProtocol(peerId, this.protocol)

      const msg = encodeSyncMessage({
        type: SyncMessageType.UPDATE,
        data: update
      })

      await stream.sink([msg])
      stream.close()
      return true
    } catch (err) {
      console.warn(`Send update to ${peerId} failed:`, err.message)
      return false
    }
  }

  /**
   * Request full state from peer
   * @param {string} peerId
   */
  async requestFullState(peerId) {
    try {
      const stream = await this.node.dialProtocol(peerId, this.protocol)

      const msg = encodeSyncMessage({
        type: SyncMessageType.REQUEST_FULL,
        data: null
      })

      await stream.sink([msg])

      // Read response
      const chunks = []
      for await (const chunk of stream.source) {
        chunks.push(chunk)
      }

      if (chunks.length > 0) {
        const data = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          data.set(chunk, offset)
          offset += chunk.length
        }

        const response = decodeSyncMessage(data)
        if (response.type === SyncMessageType.STATE_DIFF) {
          Y.applyUpdate(this.doc, response.data, 'sync-protocol')
        }
      }

      stream.close()
      return true
    } catch (err) {
      console.warn(`Request full state from ${peerId} failed:`, err.message)
      return false
    }
  }
}

/**
 * State vector comparison utilities
 */
export const StateVectorUtils = {
  /**
   * Compare two state vectors
   * @param {Uint8Array} sv1
   * @param {Uint8Array} sv2
   * @returns {object} - { ahead: [], behind: [], equal: boolean }
   */
  compare(sv1, sv2) {
    const decoded1 = Y.decodeStateVector(sv1)
    const decoded2 = Y.decodeStateVector(sv2)

    const ahead = []
    const behind = []

    // Check what sv1 has that sv2 doesn't
    for (const [client, clock] of decoded1) {
      const otherClock = decoded2.get(client) || 0
      if (clock > otherClock) {
        ahead.push({ client, diff: clock - otherClock })
      }
    }

    // Check what sv2 has that sv1 doesn't
    for (const [client, clock] of decoded2) {
      const otherClock = decoded1.get(client) || 0
      if (clock > otherClock) {
        behind.push({ client, diff: clock - otherClock })
      }
    }

    return {
      ahead,
      behind,
      equal: ahead.length === 0 && behind.length === 0
    }
  },

  /**
   * Merge state vectors
   * @param {Uint8Array[]} vectors
   * @returns {Map}
   */
  merge(vectors) {
    const merged = new Map()

    for (const sv of vectors) {
      const decoded = Y.decodeStateVector(sv)
      for (const [client, clock] of decoded) {
        const existing = merged.get(client) || 0
        merged.set(client, Math.max(existing, clock))
      }
    }

    return merged
  }
}

export default {
  SyncMessageType,
  encodeSyncMessage,
  decodeSyncMessage,
  SyncProtocol,
  StateVectorUtils
}
