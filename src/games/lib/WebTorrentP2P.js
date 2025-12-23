/**
 * @file src/games/lib/WebTorrentP2P.js
 * @desc WebTorrent-based P2P networking abstraction for multiplayer games
 *       Eliminates ~350 lines of boilerplate per game file
 */

/**
 * WebTorrent P2P Manager
 * Handles peer-to-peer connections via WebTorrent tracker protocol
 */
export class WebTorrentP2P extends EventTarget {
  /**
   * @param {Object} options
   * @param {string} options.trackerUrl - WebSocket tracker URL
   * @param {string} options.appPrefix - App prefix for room hashing (e.g., 'gitfox')
   * @param {Object} options.iceServers - ICE server configuration
   * @param {number} options.numOffers - Number of offers to generate (default: 5)
   */
  constructor(options = {}) {
    super();

    this.trackerUrl = options.trackerUrl || 'wss://tracker.openwebtorrent.com';
    this.appPrefix = options.appPrefix || 'app';
    this.iceConfig = {
      iceServers: options.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    this.numOffers = options.numOffers || 5;

    // Generate unique peer ID (20 bytes for WebTorrent compatibility)
    this.peerId = this._generatePeerId(options.peerIdPrefix || '-P2P001-');

    // State
    this.ws = null;
    this.infoHash = null;
    this.currentRoom = '';
    this.dataChannels = new Map();
    this.pendingOffers = new Map();
    this.peers = new Map();
    this.connected = false;
    this.reconnectTimeout = null;
    this.reconnectDelay = 5000;
  }

  /**
   * Generate a WebTorrent-compatible peer ID
   */
  _generatePeerId(prefix) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return prefix + hex;
  }

  /**
   * Get short ID for display purposes
   */
  get shortId() {
    return this.peerId.slice(-4);
  }

  /**
   * Hash room name to info_hash using SHA-1
   */
  async _roomToHash(roomName) {
    const data = new TextEncoder().encode(`${this.appPrefix}:${roomName}`);
    const hash = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate WebRTC offers for peer connections
   */
  async _generateOffers(count) {
    const offers = [];

    for (let i = 0; i < count; i++) {
      const pc = new RTCPeerConnection(this.iceConfig);
      const dc = pc.createDataChannel('data');
      const offerId = crypto.randomUUID();

      // Wait for ICE gathering to complete
      await new Promise(resolve => {
        pc.onicecandidate = e => {
          if (!e.candidate) resolve();
        };
        pc.createOffer().then(o => pc.setLocalDescription(o));
      });

      offers.push({
        offer_id: offerId,
        offer: { type: 'offer', sdp: pc.localDescription.sdp }
      });

      this.pendingOffers.set(offerId, { pc, dc });
      this._setupPeerConnection(pc, dc, offerId);
    }

    return offers;
  }

  /**
   * Setup peer connection event handlers
   */
  _setupPeerConnection(pc, dc, id) {
    dc.onopen = () => {
      this.dataChannels.set(id, dc);
      this._emit('peerconnect', { peerId: id, channel: dc });
    };

    dc.onclose = () => {
      this.dataChannels.delete(id);
      const peer = this.peers.get(id);
      if (peer) {
        this.peers.delete(id);
        this._emit('peerdisconnect', { peerId: id, peer });
      }
    };

    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this._emit('message', { peerId: id, message: msg, channel: dc });
      } catch (err) {
        this._emit('error', { type: 'parse', error: err, data: e.data });
      }
    };

    dc.onerror = (err) => {
      this._emit('error', { type: 'channel', error: err, peerId: id });
    };
  }

  /**
   * Handle incoming offer from another peer
   */
  async _handleOffer(msg) {
    const pc = new RTCPeerConnection(this.iceConfig);
    const peerId = msg.peer_id;

    pc.ondatachannel = (e) => {
      const dc = e.channel;
      this._setupPeerConnection(pc, dc, peerId);
    };

    await pc.setRemoteDescription(msg.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicecandidate = e => {
          if (!e.candidate) resolve();
        };
      }
    });

    // Send answer back via tracker
    this.ws.send(JSON.stringify({
      action: 'announce',
      info_hash: this.infoHash,
      peer_id: this.peerId,
      to_peer_id: peerId,
      answer: { type: 'answer', sdp: pc.localDescription.sdp },
      offer_id: msg.offer_id
    }));
  }

  /**
   * Handle answer to our offer
   */
  async _handleAnswer(msg) {
    const pending = this.pendingOffers.get(msg.offer_id);
    if (pending) {
      await pending.pc.setRemoteDescription(msg.answer);
    }
  }

  /**
   * Re-announce to tracker to find more peers
   */
  async _reannounce() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const offers = await this._generateOffers(this.numOffers);
    this.ws.send(JSON.stringify({
      action: 'announce',
      info_hash: this.infoHash,
      peer_id: this.peerId,
      numwant: 20,
      offers
    }));
  }

  /**
   * Emit custom event
   */
  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Join a room
   * @param {string} roomName - Room name to join
   */
  async join(roomName) {
    // Cleanup existing connection
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.dataChannels.clear();
    this.pendingOffers.clear();
    this.peers.clear();

    this.currentRoom = roomName;
    this.infoHash = await this._roomToHash(roomName);

    this._emit('connecting', { room: roomName });

    const offers = await this._generateOffers(this.numOffers);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.trackerUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this._emit('connected', { room: roomName });

        // Announce to tracker
        this.ws.send(JSON.stringify({
          action: 'announce',
          info_hash: this.infoHash,
          peer_id: this.peerId,
          numwant: 20,
          uploaded: 0,
          downloaded: 0,
          left: 1,
          offers
        }));

        resolve();
      };

      this.ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.offer && msg.peer_id !== this.peerId) {
            await this._handleOffer(msg);
          }

          if (msg.answer && msg.offer_id) {
            await this._handleAnswer(msg);
          }

          if (msg.interval) {
            setTimeout(() => this._reannounce(), msg.interval * 1000);
          }
        } catch (err) {
          this._emit('error', { type: 'tracker', error: err });
        }
      };

      this.ws.onerror = (err) => {
        this.connected = false;
        this._emit('error', { type: 'websocket', error: err });
        reject(err);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._emit('disconnected', { room: roomName });

        // Auto-reconnect
        this.reconnectTimeout = setTimeout(() => {
          this.join(this.currentRoom);
        }, this.reconnectDelay);
      };
    });
  }

  /**
   * Leave current room
   */
  leave() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.dataChannels.forEach(dc => dc.close());
    this.dataChannels.clear();
    this.pendingOffers.clear();
    this.peers.clear();
    this.connected = false;
  }

  /**
   * Broadcast message to all connected peers
   * @param {Object} msg - Message object to send
   */
  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const dc of this.dataChannels.values()) {
      if (dc.readyState === 'open') {
        dc.send(data);
      }
    }
  }

  /**
   * Send message to specific peer
   * @param {string} peerId - Peer ID to send to
   * @param {Object} msg - Message object to send
   */
  send(peerId, msg) {
    const dc = this.dataChannels.get(peerId);
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(msg));
    }
  }

  /**
   * Get number of connected peers
   */
  get peerCount() {
    return this.dataChannels.size;
  }

  /**
   * Check if connected to tracker
   */
  get isConnected() {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Register a peer with metadata
   * @param {string} peerId - Peer ID
   * @param {Object} data - Peer metadata
   */
  registerPeer(peerId, data) {
    this.peers.set(peerId, data);
    this._emit('peerregistered', { peerId, data });
  }

  /**
   * Get peer metadata
   * @param {string} peerId - Peer ID
   */
  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  /**
   * Get all peers
   */
  getAllPeers() {
    return new Map(this.peers);
  }
}

export default WebTorrentP2P;
