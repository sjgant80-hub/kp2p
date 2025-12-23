/**
 * Blob Protocol
 * File transfer protocol for binary data
 */

import { fromString, toString } from 'uint8arrays'
import { PROTOCOLS } from '../config.js'

/**
 * Blob message types
 */
export const BlobMessageType = {
  REQUEST: 0,
  METADATA: 1,
  CHUNK: 2,
  ACK: 3,
  COMPLETE: 4,
  ERROR: 5,
  CANCEL: 6
}

/**
 * Default chunk size (64KB)
 */
export const DEFAULT_CHUNK_SIZE = 64 * 1024

/**
 * Blob transfer state
 */
export const TransferState = {
  PENDING: 'pending',
  TRANSFERRING: 'transferring',
  COMPLETE: 'complete',
  ERROR: 'error',
  CANCELLED: 'cancelled'
}

/**
 * Blob metadata
 * @typedef {object} BlobMetadata
 * @property {string} hash - SHA-256 hash
 * @property {number} size - Size in bytes
 * @property {string} [name] - File name
 * @property {string} [type] - MIME type
 * @property {number} chunks - Number of chunks
 */

/**
 * Calculate SHA-256 hash of data
 * @param {Uint8Array} data
 * @returns {Promise<string>}
 */
async function hashData(data) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Blob protocol for file transfers
 */
export class BlobProtocol {
  constructor(node, blobStore, options = {}) {
    this.node = node
    this.store = blobStore
    this.protocol = PROTOCOLS.BLOB
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE

    this._transfers = new Map() // transferId -> TransferInfo
    this._handlers = new Map()
    this._started = false
  }

  /**
   * Start protocol handler
   */
  async start() {
    if (this._started) return
    this._started = true

    await this.node.handle(this.protocol, this._handleStream.bind(this))

    console.log('📦 Blob protocol started')
  }

  /**
   * Stop protocol handler
   */
  async stop() {
    if (!this._started) return
    this._started = false

    await this.node.unhandle(this.protocol)

    // Cancel all active transfers
    for (const [, transfer] of this._transfers) {
      transfer.state = TransferState.CANCELLED
    }
    this._transfers.clear()

    console.log('📦 Blob protocol stopped')
  }

  /**
   * Handle incoming stream
   * @private
   */
  async _handleStream({ stream, connection }) {
    const peerId = connection.remotePeer.toString()

    try {
      // Read request message
      const chunks = []
      for await (const chunk of stream.source) {
        chunks.push(chunk)
        // For the initial request, we only need the first chunk
        break
      }

      if (chunks.length === 0) {
        stream.close()
        return
      }

      const msg = JSON.parse(toString(chunks[0]))

      switch (msg.type) {
        case BlobMessageType.REQUEST:
          await this._handleRequest(stream, msg, peerId)
          break

        case BlobMessageType.METADATA:
          await this._handleMetadata(stream, msg, peerId)
          break

        default:
          stream.close()
      }
    } catch (err) {
      console.warn('Blob stream error:', err.message)
      stream.close()
    }
  }

  /**
   * Handle blob request
   * @private
   */
  async _handleRequest(stream, msg, peerId) {
    const { hash } = msg

    // Check if we have the blob
    const data = await this.store.get(hash)

    if (!data) {
      // Send error
      await stream.sink([fromString(JSON.stringify({
        type: BlobMessageType.ERROR,
        error: 'Blob not found'
      }))])
      stream.close()
      return
    }

    // Send metadata
    const metadata = {
      type: BlobMessageType.METADATA,
      hash,
      size: data.length,
      chunks: Math.ceil(data.length / this.chunkSize)
    }

    await stream.sink([fromString(JSON.stringify(metadata))])

    // Send chunks
    for (let i = 0; i < metadata.chunks; i++) {
      const start = i * this.chunkSize
      const end = Math.min(start + this.chunkSize, data.length)
      const chunk = data.slice(start, end)

      const chunkMsg = {
        type: BlobMessageType.CHUNK,
        index: i,
        data: Array.from(chunk)
      }

      await stream.sink([fromString(JSON.stringify(chunkMsg))])
    }

    // Send complete
    await stream.sink([fromString(JSON.stringify({
      type: BlobMessageType.COMPLETE,
      hash
    }))])

    stream.close()
  }

  /**
   * Handle incoming metadata (receiving)
   * @private
   */
  async _handleMetadata(stream, msg, peerId) {
    // This is handled in requestBlob
    stream.close()
  }

  /**
   * Request a blob from a peer
   * @param {string} peerId
   * @param {string} hash
   * @param {function} [onProgress]
   * @returns {Promise<Uint8Array>}
   */
  async requestBlob(peerId, hash, onProgress) {
    const transferId = `${peerId}:${hash}`

    // Create transfer info
    const transfer = {
      id: transferId,
      hash,
      peerId,
      state: TransferState.PENDING,
      progress: 0,
      chunks: [],
      startTime: Date.now()
    }
    this._transfers.set(transferId, transfer)

    try {
      const stream = await this.node.dialProtocol(peerId, this.protocol)

      // Send request
      const request = {
        type: BlobMessageType.REQUEST,
        hash
      }

      await stream.sink([fromString(JSON.stringify(request))])

      transfer.state = TransferState.TRANSFERRING

      // Read response
      let metadata = null
      const dataChunks = []

      for await (const chunk of stream.source) {
        const msg = JSON.parse(toString(chunk))

        switch (msg.type) {
          case BlobMessageType.ERROR:
            throw new Error(msg.error)

          case BlobMessageType.METADATA:
            metadata = msg
            dataChunks.length = msg.chunks
            break

          case BlobMessageType.CHUNK:
            dataChunks[msg.index] = new Uint8Array(msg.data)
            transfer.progress = (msg.index + 1) / metadata.chunks
            if (onProgress) {
              onProgress(transfer.progress)
            }
            break

          case BlobMessageType.COMPLETE:
            // Assemble chunks
            const totalSize = dataChunks.reduce((acc, c) => acc + c.length, 0)
            const result = new Uint8Array(totalSize)
            let offset = 0
            for (const c of dataChunks) {
              result.set(c, offset)
              offset += c.length
            }

            // Verify hash
            const actualHash = await hashData(result)
            if (actualHash !== hash) {
              throw new Error('Hash mismatch')
            }

            // Store
            await this.store.put(result)

            transfer.state = TransferState.COMPLETE
            transfer.endTime = Date.now()

            stream.close()
            this._transfers.delete(transferId)
            return result
        }
      }

      throw new Error('Transfer incomplete')
    } catch (err) {
      transfer.state = TransferState.ERROR
      transfer.error = err.message
      this._transfers.delete(transferId)
      throw err
    }
  }

  /**
   * Share a blob to the network
   * @param {Uint8Array} data
   * @param {object} [metadata]
   * @returns {Promise<string>} - Hash of the blob
   */
  async share(data, metadata = {}) {
    const hash = await hashData(data)
    await this.store.put(data)
    return hash
  }

  /**
   * Get transfer status
   * @param {string} transferId
   * @returns {object}
   */
  getTransfer(transferId) {
    return this._transfers.get(transferId)
  }

  /**
   * Get all active transfers
   * @returns {Array}
   */
  getActiveTransfers() {
    return Array.from(this._transfers.values())
      .filter(t => t.state === TransferState.TRANSFERRING)
  }

  /**
   * Cancel a transfer
   * @param {string} transferId
   */
  cancelTransfer(transferId) {
    const transfer = this._transfers.get(transferId)
    if (transfer) {
      transfer.state = TransferState.CANCELLED
      this._transfers.delete(transferId)
    }
  }
}

/**
 * Chunked file reader for large files
 */
export class ChunkedReader {
  constructor(file, chunkSize = DEFAULT_CHUNK_SIZE) {
    this.file = file
    this.chunkSize = chunkSize
    this.offset = 0
  }

  /**
   * Get total number of chunks
   */
  get totalChunks() {
    return Math.ceil(this.file.size / this.chunkSize)
  }

  /**
   * Read next chunk
   * @returns {Promise<{done: boolean, value: Uint8Array, index: number}>}
   */
  async next() {
    if (this.offset >= this.file.size) {
      return { done: true }
    }

    const blob = this.file.slice(this.offset, this.offset + this.chunkSize)
    const buffer = await blob.arrayBuffer()
    const value = new Uint8Array(buffer)
    const index = Math.floor(this.offset / this.chunkSize)

    this.offset += this.chunkSize

    return { done: false, value, index }
  }

  /**
   * Reset reader
   */
  reset() {
    this.offset = 0
  }

  /**
   * Async iterator
   */
  [Symbol.asyncIterator]() {
    return {
      next: () => this.next()
    }
  }
}

export default {
  BlobMessageType,
  DEFAULT_CHUNK_SIZE,
  TransferState,
  hashData,
  BlobProtocol,
  ChunkedReader
}
