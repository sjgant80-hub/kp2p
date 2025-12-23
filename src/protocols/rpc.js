/**
 * RPC Protocol
 * Request/response pattern for peer communication
 */

import { fromString, toString } from 'uint8arrays'
import { PROTOCOLS } from '../config.js'
import { randomBytes, toHex } from '../core/crypto.js'

/**
 * RPC message types
 */
export const RPCMessageType = {
  REQUEST: 'request',
  RESPONSE: 'response',
  ERROR: 'error',
  NOTIFICATION: 'notification'
}

/**
 * Generate unique request ID
 * @returns {string}
 */
function generateRequestId() {
  return toHex(randomBytes(8))
}

/**
 * RPC error class
 */
export class RPCError extends Error {
  constructor(code, message, data = null) {
    super(message)
    this.code = code
    this.data = data
    this.name = 'RPCError'
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    }
  }
}

/**
 * Standard error codes
 */
export const ErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TIMEOUT: -32000,
  CANCELLED: -32001
}

/**
 * RPC Protocol handler
 */
export class RPCProtocol {
  constructor(node, options = {}) {
    this.node = node
    this.protocol = PROTOCOLS.RPC
    this.timeout = options.timeout || 30000

    this._methods = new Map()
    this._pending = new Map() // requestId -> { resolve, reject, timeout }
    this._started = false
  }

  /**
   * Start RPC protocol
   */
  async start() {
    if (this._started) return
    this._started = true

    await this.node.handle(this.protocol, this._handleStream.bind(this))

    console.log('📞 RPC protocol started')
  }

  /**
   * Stop RPC protocol
   */
  async stop() {
    if (!this._started) return
    this._started = false

    await this.node.unhandle(this.protocol)

    // Reject all pending requests
    for (const [, pending] of this._pending) {
      clearTimeout(pending.timeout)
      pending.reject(new RPCError(ErrorCode.CANCELLED, 'RPC stopped'))
    }
    this._pending.clear()
    this._methods.clear()

    console.log('📞 RPC protocol stopped')
  }

  /**
   * Register a method handler
   * @param {string} method
   * @param {function} handler - async (params, context) => result
   */
  register(method, handler) {
    this._methods.set(method, handler)
  }

  /**
   * Unregister a method
   * @param {string} method
   */
  unregister(method) {
    this._methods.delete(method)
  }

  /**
   * Handle incoming stream
   * @private
   */
  async _handleStream({ stream, connection }) {
    const peerId = connection.remotePeer.toString()

    try {
      const chunks = []
      for await (const chunk of stream.source) {
        chunks.push(chunk)
      }

      if (chunks.length === 0) {
        stream.close()
        return
      }

      const data = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        data.set(chunk, offset)
        offset += chunk.length
      }

      const msg = JSON.parse(toString(data))

      if (msg.type === RPCMessageType.REQUEST) {
        const response = await this._handleRequest(msg, { peerId })
        await stream.sink([fromString(JSON.stringify(response))])
      } else if (msg.type === RPCMessageType.NOTIFICATION) {
        await this._handleNotification(msg, { peerId })
      } else if (msg.type === RPCMessageType.RESPONSE || msg.type === RPCMessageType.ERROR) {
        this._handleResponse(msg)
      }

      stream.close()
    } catch (err) {
      console.warn('RPC stream error:', err.message)

      // Send error response
      try {
        const errorResponse = {
          type: RPCMessageType.ERROR,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: err.message
          }
        }
        await stream.sink([fromString(JSON.stringify(errorResponse))])
      } catch {
        // Ignore send errors
      }

      stream.close()
    }
  }

  /**
   * Handle RPC request
   * @private
   */
  async _handleRequest(msg, context) {
    const { id, method, params } = msg

    const handler = this._methods.get(method)
    if (!handler) {
      return {
        type: RPCMessageType.ERROR,
        id,
        error: {
          code: ErrorCode.METHOD_NOT_FOUND,
          message: `Method not found: ${method}`
        }
      }
    }

    try {
      const result = await handler(params, context)
      return {
        type: RPCMessageType.RESPONSE,
        id,
        result
      }
    } catch (err) {
      return {
        type: RPCMessageType.ERROR,
        id,
        error: err instanceof RPCError ? err.toJSON() : {
          code: ErrorCode.INTERNAL_ERROR,
          message: err.message
        }
      }
    }
  }

  /**
   * Handle notification (no response expected)
   * @private
   */
  async _handleNotification(msg, context) {
    const { method, params } = msg

    const handler = this._methods.get(method)
    if (handler) {
      try {
        await handler(params, context)
      } catch (err) {
        console.warn(`Notification handler error for ${method}:`, err.message)
      }
    }
  }

  /**
   * Handle response to our request
   * @private
   */
  _handleResponse(msg) {
    const { id, result, error } = msg

    const pending = this._pending.get(id)
    if (!pending) return

    clearTimeout(pending.timeout)
    this._pending.delete(id)

    if (error) {
      pending.reject(new RPCError(error.code, error.message, error.data))
    } else {
      pending.resolve(result)
    }
  }

  /**
   * Call a method on a peer
   * @param {string} peerId
   * @param {string} method
   * @param {any} params
   * @returns {Promise<any>}
   */
  async call(peerId, method, params = null) {
    const id = generateRequestId()

    const request = {
      type: RPCMessageType.REQUEST,
      id,
      method,
      params
    }

    return new Promise(async (resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this._pending.delete(id)
        reject(new RPCError(ErrorCode.TIMEOUT, 'Request timeout'))
      }, this.timeout)

      // Store pending request
      this._pending.set(id, { resolve, reject, timeout })

      try {
        const stream = await this.node.dialProtocol(peerId, this.protocol)

        // Send request
        await stream.sink([fromString(JSON.stringify(request))])

        // Read response
        const chunks = []
        for await (const chunk of stream.source) {
          chunks.push(chunk)
        }

        stream.close()

        if (chunks.length > 0) {
          const data = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
          let offset = 0
          for (const chunk of chunks) {
            data.set(chunk, offset)
            offset += chunk.length
          }

          const response = JSON.parse(toString(data))
          this._handleResponse({ ...response, id })
        }
      } catch (err) {
        clearTimeout(timeout)
        this._pending.delete(id)
        reject(new RPCError(ErrorCode.INTERNAL_ERROR, err.message))
      }
    })
  }

  /**
   * Send notification (no response expected)
   * @param {string} peerId
   * @param {string} method
   * @param {any} params
   */
  async notify(peerId, method, params = null) {
    const notification = {
      type: RPCMessageType.NOTIFICATION,
      method,
      params
    }

    try {
      const stream = await this.node.dialProtocol(peerId, this.protocol)
      await stream.sink([fromString(JSON.stringify(notification))])
      stream.close()
    } catch (err) {
      console.warn(`Failed to send notification to ${peerId}:`, err.message)
    }
  }

  /**
   * Broadcast notification to multiple peers
   * @param {string[]} peerIds
   * @param {string} method
   * @param {any} params
   */
  async broadcast(peerIds, method, params = null) {
    await Promise.allSettled(
      peerIds.map(peerId => this.notify(peerId, method, params))
    )
  }

  /**
   * Call method on all connected peers
   * @param {string} method
   * @param {any} params
   * @returns {Promise<Map<string, any>>} - peerId -> result
   */
  async callAll(method, params = null) {
    const peers = this.node.getConnectedPeers()
    const results = new Map()

    await Promise.allSettled(
      peers.map(async peerId => {
        try {
          const result = await this.call(peerId, method, params)
          results.set(peerId, { success: true, result })
        } catch (err) {
          results.set(peerId, { success: false, error: err })
        }
      })
    )

    return results
  }
}

/**
 * RPC client helper for typed method calls
 */
export class RPCClient {
  constructor(rpc, peerId) {
    this.rpc = rpc
    this.peerId = peerId
  }

  /**
   * Call method
   * @param {string} method
   * @param {any} params
   */
  async call(method, params) {
    return this.rpc.call(this.peerId, method, params)
  }

  /**
   * Send notification
   * @param {string} method
   * @param {any} params
   */
  async notify(method, params) {
    return this.rpc.notify(this.peerId, method, params)
  }
}

export default {
  RPCMessageType,
  RPCError,
  ErrorCode,
  RPCProtocol,
  RPCClient
}
