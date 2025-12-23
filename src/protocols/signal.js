/**
 * Signal Protocol
 * WebRTC signaling via pubsub
 */

import { fromString, toString } from 'uint8arrays'
import { TOPICS } from '../config.js'

/**
 * Signal message types
 */
export const SignalType = {
  OFFER: 'offer',
  ANSWER: 'answer',
  CANDIDATE: 'candidate',
  RENEGOTIATE: 'renegotiate',
  CLOSE: 'close'
}

/**
 * Signal manager for WebRTC signaling over pubsub
 */
export class SignalManager {
  constructor(node, options = {}) {
    this.node = node
    this.timeout = options.timeout || 30000

    this._handlers = new Map() // peerId -> handler
    this._pending = new Map() // peerId -> pending signals
    this._messageHandler = null
    this._started = false
  }

  /**
   * Start signal manager
   */
  async start() {
    if (this._started) return
    this._started = true

    // Subscribe to our own signal topic
    const myTopic = TOPICS.SIGNAL_PREFIX + this.node.peerId
    this.node.subscribe(myTopic)

    // Listen for messages
    this._messageHandler = (evt) => this._onMessage(evt)
    this.node.on('message', this._messageHandler)

    console.log('📶 Signal manager started')
  }

  /**
   * Stop signal manager
   */
  async stop() {
    if (!this._started) return
    this._started = false

    const myTopic = TOPICS.SIGNAL_PREFIX + this.node.peerId
    this.node.unsubscribe(myTopic)

    if (this._messageHandler) {
      this.node.off('message', this._messageHandler)
    }

    this._handlers.clear()
    this._pending.clear()

    console.log('📶 Signal manager stopped')
  }

  /**
   * Handle incoming message
   * @private
   */
  _onMessage(evt) {
    const myTopic = TOPICS.SIGNAL_PREFIX + this.node.peerId
    if (evt.detail.topic !== myTopic) return

    try {
      const msg = JSON.parse(toString(evt.detail.data))
      this._handleSignal(msg)
    } catch (err) {
      console.warn('Failed to parse signal message:', err.message)
    }
  }

  /**
   * Handle a signal message
   * @private
   */
  _handleSignal(msg) {
    const handler = this._handlers.get(msg.from)

    if (handler) {
      handler(msg)
    } else {
      // Queue for later
      if (!this._pending.has(msg.from)) {
        this._pending.set(msg.from, [])
      }
      this._pending.get(msg.from).push(msg)
    }
  }

  /**
   * Send signal to peer
   * @param {string} targetPeerId
   * @param {object} signal
   */
  async send(targetPeerId, signal) {
    const topic = TOPICS.SIGNAL_PREFIX + targetPeerId

    const msg = {
      type: signal.type,
      from: this.node.peerId,
      to: targetPeerId,
      sdp: signal.sdp,
      candidate: signal.candidate,
      ts: Date.now()
    }

    try {
      await this.node.publish(topic, fromString(JSON.stringify(msg)))
    } catch (err) {
      console.warn('Failed to send signal:', err.message)
      throw err
    }
  }

  /**
   * Send an offer
   * @param {string} targetPeerId
   * @param {RTCSessionDescriptionInit} offer
   */
  async sendOffer(targetPeerId, offer) {
    await this.send(targetPeerId, {
      type: SignalType.OFFER,
      sdp: offer.sdp
    })
  }

  /**
   * Send an answer
   * @param {string} targetPeerId
   * @param {RTCSessionDescriptionInit} answer
   */
  async sendAnswer(targetPeerId, answer) {
    await this.send(targetPeerId, {
      type: SignalType.ANSWER,
      sdp: answer.sdp
    })
  }

  /**
   * Send ICE candidate
   * @param {string} targetPeerId
   * @param {RTCIceCandidate} candidate
   */
  async sendCandidate(targetPeerId, candidate) {
    await this.send(targetPeerId, {
      type: SignalType.CANDIDATE,
      candidate: candidate.toJSON()
    })
  }

  /**
   * Register signal handler for a peer
   * @param {string} peerId
   * @param {function} handler
   */
  onSignal(peerId, handler) {
    this._handlers.set(peerId, handler)

    // Process any pending signals
    const pending = this._pending.get(peerId)
    if (pending) {
      this._pending.delete(peerId)
      for (const msg of pending) {
        handler(msg)
      }
    }
  }

  /**
   * Unregister signal handler
   * @param {string} peerId
   */
  offSignal(peerId) {
    this._handlers.delete(peerId)
    this._pending.delete(peerId)
  }

  /**
   * Wait for signal from peer
   * @param {string} peerId
   * @param {string} type - Expected signal type
   * @returns {Promise<object>}
   */
  waitForSignal(peerId, type) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.offSignal(peerId)
        reject(new Error('Signal timeout'))
      }, this.timeout)

      this.onSignal(peerId, (msg) => {
        if (!type || msg.type === type) {
          clearTimeout(timeout)
          this.offSignal(peerId)
          resolve(msg)
        }
      })
    })
  }
}

/**
 * WebRTC connection negotiator
 */
export class RTCNegotiator {
  constructor(signalManager, peerId, options = {}) {
    this.signal = signalManager
    this.peerId = peerId
    this.isInitiator = options.isInitiator || false

    this.pc = null
    this.dataChannel = null
    this._handlers = new Map()
  }

  /**
   * Create peer connection
   */
  createConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signal.sendCandidate(this.peerId, event.candidate)
      }
    }

    // Handle connection state
    this.pc.onconnectionstatechange = () => {
      this._emit('connectionState', this.pc.connectionState)
    }

    // Handle data channel
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel
      this._setupDataChannel()
    }

    // Listen for signals
    this.signal.onSignal(this.peerId, (msg) => this._handleSignal(msg))

    return this.pc
  }

  /**
   * Handle incoming signal
   * @private
   */
  async _handleSignal(msg) {
    try {
      switch (msg.type) {
        case SignalType.OFFER:
          await this.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
          const answer = await this.pc.createAnswer()
          await this.pc.setLocalDescription(answer)
          await this.signal.sendAnswer(this.peerId, answer)
          break

        case SignalType.ANSWER:
          await this.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
          break

        case SignalType.CANDIDATE:
          if (msg.candidate) {
            await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          }
          break
      }
    } catch (err) {
      console.error('Signal handling error:', err)
    }
  }

  /**
   * Start negotiation (as initiator)
   */
  async negotiate() {
    if (!this.isInitiator) return

    // Create data channel
    this.dataChannel = this.pc.createDataChannel('konomi', {
      ordered: true
    })
    this._setupDataChannel()

    // Create and send offer
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    await this.signal.sendOffer(this.peerId, offer)
  }

  /**
   * Setup data channel handlers
   * @private
   */
  _setupDataChannel() {
    if (!this.dataChannel) return

    this.dataChannel.onopen = () => {
      this._emit('open')
    }

    this.dataChannel.onclose = () => {
      this._emit('close')
    }

    this.dataChannel.onmessage = (event) => {
      this._emit('message', event.data)
    }

    this.dataChannel.onerror = (error) => {
      this._emit('error', error)
    }
  }

  /**
   * Send data
   * @param {string|ArrayBuffer} data
   */
  send(data) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(data)
    }
  }

  /**
   * Close connection
   */
  close() {
    this.signal.offSignal(this.peerId)

    if (this.dataChannel) {
      this.dataChannel.close()
    }

    if (this.pc) {
      this.pc.close()
    }
  }

  /**
   * Add event handler
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set())
    }
    this._handlers.get(event).add(handler)
  }

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    if (this._handlers.has(event)) {
      for (const handler of this._handlers.get(event)) {
        handler(data)
      }
    }
  }
}

export default {
  SignalType,
  SignalManager,
  RTCNegotiator
}
