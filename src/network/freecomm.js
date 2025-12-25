/**
 * @file src/network/freecomm.js
 * @desc FreeComm - Use ANY available transport for free communication
 *
 * PHILOSOPHY: Communication is a human right. Use every means available.
 *
 * TRANSPORTS (use whatever works):
 * - WiFi Direct / Mesh
 * - Bluetooth Mesh (BLE)
 * - LoRa (long range, low power)
 * - WebRTC (when internet available)
 * - SMS Gateway (piggyback on cell networks)
 * - DTMF/Audio (encode data in sound)
 * - QR Codes (visual sneakernet)
 * - Ham Radio (packet radio)
 * - Satellite (when available)
 * - USB/NFC (physical proximity)
 *
 * MODES:
 * - Real-time: Direct connection when possible
 * - Store-and-Forward: DTN (Delay Tolerant Networking)
 * - Opportunistic: Grab any connection that appears
 * - Sneakernet: Physical message carrying
 */

// =============================================================================
// TRANSPORT TYPES
// =============================================================================

export const TRANSPORT = {
  // Wireless mesh
  WIFI_DIRECT: 'wifi-direct',
  WIFI_MESH: 'wifi-mesh',
  BLUETOOTH: 'bluetooth',
  BLE_MESH: 'ble-mesh',
  LORA: 'lora',
  ZIGBEE: 'zigbee',

  // Internet-based
  WEBRTC: 'webrtc',
  WEBSOCKET: 'websocket',
  HTTP: 'http',
  WEBTORRENT: 'webtorrent',

  // Cellular piggyback
  SMS: 'sms',
  USSD: 'ussd',
  DATA: 'cellular-data',

  // Alternative
  AUDIO: 'audio-modem',
  DTMF: 'dtmf',
  QR_CODE: 'qr-code',
  NFC: 'nfc',
  USB: 'usb',

  // Long range
  HAM_RADIO: 'ham-radio',
  SATELLITE: 'satellite',
  HF_RADIO: 'hf-radio',

  // Physical
  SNEAKERNET: 'sneakernet',
  PAPER: 'paper-code',
};

export const TRANSPORT_CAPS = {
  [TRANSPORT.WIFI_DIRECT]: { range: 100, bandwidth: 'high', realtime: true, cost: 0 },
  [TRANSPORT.WIFI_MESH]: { range: 500, bandwidth: 'high', realtime: true, cost: 0 },
  [TRANSPORT.BLUETOOTH]: { range: 10, bandwidth: 'medium', realtime: true, cost: 0 },
  [TRANSPORT.BLE_MESH]: { range: 100, bandwidth: 'low', realtime: true, cost: 0 },
  [TRANSPORT.LORA]: { range: 15000, bandwidth: 'very-low', realtime: false, cost: 0 },
  [TRANSPORT.WEBRTC]: { range: 'global', bandwidth: 'high', realtime: true, cost: 0 },
  [TRANSPORT.SMS]: { range: 'global', bandwidth: 'very-low', realtime: false, cost: 'per-msg' },
  [TRANSPORT.AUDIO]: { range: 10, bandwidth: 'very-low', realtime: true, cost: 0 },
  [TRANSPORT.HAM_RADIO]: { range: 'global', bandwidth: 'low', realtime: true, cost: 0 },
  [TRANSPORT.SATELLITE]: { range: 'global', bandwidth: 'medium', realtime: true, cost: 'high' },
  [TRANSPORT.SNEAKERNET]: { range: 'unlimited', bandwidth: 'high', realtime: false, cost: 0 },
};

// =============================================================================
// MESSAGE PRIORITY
// =============================================================================

export const PRIORITY = {
  EMERGENCY: 0,    // Life/safety - use ANY transport immediately
  URGENT: 1,       // Time-sensitive - prefer fast transports
  NORMAL: 2,       // Regular messages
  BULK: 3,         // Large data - wait for good connection
  BACKGROUND: 4,   // Sync when convenient
};

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export const MSG_TYPE = {
  // Direct communication
  TEXT: 'text',
  VOICE: 'voice',
  VIDEO: 'video',
  FILE: 'file',

  // Control
  ACK: 'ack',
  PING: 'ping',
  ROUTE: 'route',
  ANNOUNCE: 'announce',

  // Store-and-forward
  BUNDLE: 'bundle',
  FRAGMENT: 'fragment',
  CUSTODY: 'custody',
};

// =============================================================================
// FREE COMM MESSAGE
// =============================================================================

/**
 * Universal message format that works across all transports
 */
export class FreeCommMessage {
  constructor(options = {}) {
    this.id = options.id || crypto.randomUUID();
    this.type = options.type || MSG_TYPE.TEXT;
    this.priority = options.priority ?? PRIORITY.NORMAL;

    // Addressing
    this.from = options.from;
    this.to = options.to;           // Can be peer ID, phone number, callsign, etc.
    this.toGroup = options.toGroup; // For broadcast/multicast

    // Content
    this.payload = options.payload;
    this.encoding = options.encoding || 'utf8';
    this.compressed = options.compressed || false;
    this.encrypted = options.encrypted || false;

    // Routing
    this.hops = options.hops || 0;
    this.maxHops = options.maxHops || 20;
    this.path = options.path || [];
    this.ttl = options.ttl || 86400000; // 24 hours default

    // Timing
    this.created = options.created || Date.now();
    this.expires = options.expires || (Date.now() + this.ttl);

    // Store-and-forward
    this.bundle = options.bundle || null;
    this.fragment = options.fragment || null;
    this.custodyRequired = options.custodyRequired || false;

    // Delivery tracking
    this.delivered = options.delivered || false;
    this.deliveredAt = options.deliveredAt || null;
    this.acks = options.acks || [];
  }

  /**
   * Serialize for any transport
   */
  serialize(format = 'json') {
    const data = {
      i: this.id,
      t: this.type,
      p: this.priority,
      f: this.from,
      o: this.to,
      g: this.toGroup,
      d: this.payload,
      e: this.encoding,
      c: this.compressed,
      x: this.encrypted,
      h: this.hops,
      m: this.maxHops,
      a: this.path,
      r: this.created,
      s: this.expires,
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data);
      case 'msgpack':
        return this._msgpack(data);
      case 'binary':
        return this._toBinary(data);
      case 'base64':
        return btoa(JSON.stringify(data));
      case 'hex':
        return this._toHex(JSON.stringify(data));
      default:
        return JSON.stringify(data);
    }
  }

  /**
   * Deserialize from any format
   */
  static deserialize(data, format = 'json') {
    let obj;
    switch (format) {
      case 'json':
        obj = JSON.parse(data);
        break;
      case 'base64':
        obj = JSON.parse(atob(data));
        break;
      case 'hex':
        obj = JSON.parse(FreeCommMessage._fromHex(data));
        break;
      default:
        obj = JSON.parse(data);
    }

    return new FreeCommMessage({
      id: obj.i,
      type: obj.t,
      priority: obj.p,
      from: obj.f,
      to: obj.o,
      toGroup: obj.g,
      payload: obj.d,
      encoding: obj.e,
      compressed: obj.c,
      encrypted: obj.x,
      hops: obj.h,
      maxHops: obj.m,
      path: obj.a,
      created: obj.r,
      expires: obj.s,
    });
  }

  _toHex(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  }

  static _fromHex(hex) {
    return hex.match(/.{2}/g).map(b => String.fromCharCode(parseInt(b, 16))).join('');
  }

  /**
   * Fragment message for low-bandwidth transports
   */
  fragment(maxSize = 140) { // 140 chars for SMS
    const data = this.serialize('base64');
    const fragments = [];
    const total = Math.ceil(data.length / maxSize);

    for (let i = 0; i < total; i++) {
      const chunk = data.slice(i * maxSize, (i + 1) * maxSize);
      fragments.push(new FreeCommMessage({
        type: MSG_TYPE.FRAGMENT,
        from: this.from,
        to: this.to,
        priority: this.priority,
        payload: chunk,
        fragment: { id: this.id, index: i, total },
      }));
    }

    return fragments;
  }

  /**
   * Reassemble fragments
   */
  static reassemble(fragments) {
    fragments.sort((a, b) => a.fragment.index - b.fragment.index);
    const data = fragments.map(f => f.payload).join('');
    return FreeCommMessage.deserialize(data, 'base64');
  }
}

// =============================================================================
// TRANSPORT ADAPTER (base class)
// =============================================================================

export class TransportAdapter {
  constructor(type, options = {}) {
    this.type = type;
    this.options = options;
    this.available = false;
    this.connected = false;
    this.peers = new Map();
    this.onMessage = null;
    this.onPeer = null;
  }

  async init() { throw new Error('Not implemented'); }
  async send(peerId, message) { throw new Error('Not implemented'); }
  async broadcast(message) { throw new Error('Not implemented'); }
  async discover() { throw new Error('Not implemented'); }
  async destroy() { throw new Error('Not implemented'); }

  getCapabilities() {
    return TRANSPORT_CAPS[this.type] || {};
  }
}

// =============================================================================
// SMS GATEWAY ADAPTER
// =============================================================================

/**
 * Use SMS as a transport - piggyback on cell networks!
 * Works even without data plan, just needs basic cell signal
 */
export class SMSAdapter extends TransportAdapter {
  constructor(options = {}) {
    super(TRANSPORT.SMS, options);
    this.gateway = options.gateway; // SMS gateway API
    this.phoneNumber = options.phoneNumber;
    this.maxMessageSize = 140; // SMS limit
  }

  async init() {
    // Check if SMS is available (Web SMS API or gateway)
    if ('sms' in navigator) {
      this.available = true;
    } else if (this.gateway) {
      this.available = true;
    }
    return this.available;
  }

  async send(phoneNumber, message) {
    if (!this.available) throw new Error('SMS not available');

    // Fragment if too large
    if (message.serialize().length > this.maxMessageSize) {
      const fragments = message.fragment(this.maxMessageSize);
      for (const frag of fragments) {
        await this._sendSMS(phoneNumber, frag.serialize('base64'));
      }
    } else {
      await this._sendSMS(phoneNumber, message.serialize('base64'));
    }
  }

  async _sendSMS(to, body) {
    if (this.gateway) {
      // Use gateway API
      await fetch(this.gateway, {
        method: 'POST',
        body: JSON.stringify({ to, body, from: this.phoneNumber }),
      });
    } else if ('sms' in navigator) {
      // Use Web SMS API (limited availability)
      await navigator.sms.send(to, body);
    }
  }

  handleIncoming(from, body) {
    try {
      const message = FreeCommMessage.deserialize(body, 'base64');
      this.onMessage?.(from, message);
    } catch (e) {
      // Might be a fragment, buffer it
      this._bufferFragment(from, body);
    }
  }

  _fragmentBuffer = new Map();

  _bufferFragment(from, body) {
    // Try to parse as fragment and reassemble
    try {
      const frag = FreeCommMessage.deserialize(body, 'base64');
      if (frag.type === MSG_TYPE.FRAGMENT) {
        const key = `${from}:${frag.fragment.id}`;
        if (!this._fragmentBuffer.has(key)) {
          this._fragmentBuffer.set(key, []);
        }
        const frags = this._fragmentBuffer.get(key);
        frags.push(frag);

        if (frags.length === frag.fragment.total) {
          const complete = FreeCommMessage.reassemble(frags);
          this._fragmentBuffer.delete(key);
          this.onMessage?.(from, complete);
        }
      }
    } catch (e) {
      console.error('Failed to parse fragment:', e);
    }
  }
}

// =============================================================================
// LORA ADAPTER
// =============================================================================

/**
 * LoRa - Long Range, Low Power
 * Can reach 15km+ with just a $20 module!
 */
export class LoRaAdapter extends TransportAdapter {
  constructor(options = {}) {
    super(TRANSPORT.LORA, options);
    this.frequency = options.frequency || 915; // MHz (US)
    this.spreadingFactor = options.sf || 7;
    this.bandwidth = options.bw || 125; // kHz
    this.serialPort = null;
  }

  async init() {
    // Connect to LoRa module via Web Serial API
    if ('serial' in navigator) {
      try {
        this.serialPort = await navigator.serial.requestPort();
        await this.serialPort.open({ baudRate: 115200 });
        this.available = true;
        this._startReading();
      } catch (e) {
        console.error('LoRa init failed:', e);
      }
    }
    return this.available;
  }

  async send(peerId, message) {
    if (!this.serialPort) throw new Error('LoRa not available');

    const data = message.serialize('hex');
    const writer = this.serialPort.writable.getWriter();
    await writer.write(new TextEncoder().encode(`AT+SEND=${peerId},${data}\r\n`));
    writer.releaseLock();
  }

  async broadcast(message) {
    // LoRa broadcast uses address 0 or 255
    return this.send('255', message);
  }

  async _startReading() {
    const reader = this.serialPort.readable.getReader();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);

      // Parse incoming messages
      const lines = buffer.split('\r\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('+RCV=')) {
          const match = line.match(/\+RCV=(\d+),(\d+),(.+)/);
          if (match) {
            const [, from, len, data] = match;
            try {
              const message = FreeCommMessage.deserialize(data, 'hex');
              this.onMessage?.(from, message);
            } catch (e) {
              console.error('Failed to parse LoRa message:', e);
            }
          }
        }
      }
    }
  }

  async destroy() {
    if (this.serialPort) {
      await this.serialPort.close();
    }
  }
}

// =============================================================================
// AUDIO MODEM ADAPTER
// =============================================================================

/**
 * Encode data as audio - works through any speaker/mic!
 * Can work over phone calls, walkie-talkies, PA systems...
 */
export class AudioModemAdapter extends TransportAdapter {
  constructor(options = {}) {
    super(TRANSPORT.AUDIO, options);
    this.sampleRate = 44100;
    this.baseFreq = options.baseFreq || 1000;
    this.freqStep = options.freqStep || 100;
    this.bitDuration = options.bitDuration || 0.1; // 100ms per bit
    this.audioContext = null;
  }

  async init() {
    try {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.available = true;
    } catch (e) {
      console.error('Audio init failed:', e);
    }
    return this.available;
  }

  /**
   * Encode message as audio tones
   */
  async send(peerId, message) {
    const data = message.serialize('hex');
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();

    // Send each hex digit as a different frequency
    for (let i = 0; i < data.length; i++) {
      const digit = parseInt(data[i], 16);
      oscillator.frequency.setValueAtTime(
        this.baseFreq + (digit * this.freqStep),
        this.audioContext.currentTime + (i * this.bitDuration)
      );
    }

    // End tone
    oscillator.frequency.setValueAtTime(
      this.baseFreq - this.freqStep,
      this.audioContext.currentTime + (data.length * this.bitDuration)
    );

    setTimeout(() => oscillator.stop(), (data.length + 1) * this.bitDuration * 1000);
  }

  /**
   * Listen for incoming audio data
   */
  async startListening() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const decode = () => {
      analyser.getByteFrequencyData(dataArray);

      // Find peak frequency
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxValue) {
          maxValue = dataArray[i];
          maxIndex = i;
        }
      }

      const peakFreq = (maxIndex * this.sampleRate) / analyser.fftSize;

      // Decode to hex digit
      if (peakFreq >= this.baseFreq && maxValue > 100) {
        const digit = Math.round((peakFreq - this.baseFreq) / this.freqStep);
        if (digit >= 0 && digit <= 15) {
          this._bufferBit(digit.toString(16));
        }
      }

      requestAnimationFrame(decode);
    };

    decode();
  }

  _receiveBuffer = '';
  _lastBitTime = 0;

  _bufferBit(bit) {
    const now = Date.now();
    if (now - this._lastBitTime > this.bitDuration * 2000) {
      // Gap detected, try to parse buffer
      if (this._receiveBuffer.length > 0) {
        try {
          const message = FreeCommMessage.deserialize(this._receiveBuffer, 'hex');
          this.onMessage?.('audio', message);
        } catch (e) {
          // Invalid message
        }
        this._receiveBuffer = '';
      }
    }
    this._receiveBuffer += bit;
    this._lastBitTime = now;
  }
}

// =============================================================================
// STORE AND FORWARD (DTN)
// =============================================================================

/**
 * Delay Tolerant Networking - messages survive network partitions
 * Like email but for mesh networks
 */
export class StoreAndForward {
  constructor(options = {}) {
    this.nodeId = options.nodeId || crypto.randomUUID();
    this.storage = options.storage || new Map();
    this.maxStorage = options.maxStorage || 100 * 1024 * 1024; // 100MB
    this.currentStorage = 0;
  }

  /**
   * Store a message for later delivery
   */
  async store(message) {
    const key = message.id;
    const data = message.serialize();
    const size = data.length;

    // Check storage limits
    if (this.currentStorage + size > this.maxStorage) {
      await this._evict(size);
    }

    this.storage.set(key, {
      message,
      size,
      storedAt: Date.now(),
      attempts: 0,
      lastAttempt: null,
    });

    this.currentStorage += size;
    return key;
  }

  /**
   * Get messages destined for a peer
   */
  getMessagesFor(peerId) {
    const messages = [];
    for (const [, entry] of this.storage) {
      if (entry.message.to === peerId || entry.message.toGroup) {
        messages.push(entry.message);
      }
    }
    return messages;
  }

  /**
   * Mark message as delivered
   */
  markDelivered(messageId) {
    const entry = this.storage.get(messageId);
    if (entry) {
      this.currentStorage -= entry.size;
      this.storage.delete(messageId);
    }
  }

  /**
   * Get messages to forward (epidemic routing)
   */
  getForwardable(excludePeers = []) {
    const messages = [];
    for (const [, entry] of this.storage) {
      if (!entry.message.delivered && !excludePeers.includes(entry.message.from)) {
        messages.push(entry.message);
      }
    }
    return messages;
  }

  /**
   * Evict old/low-priority messages
   */
  async _evict(needed) {
    const entries = Array.from(this.storage.entries())
      .sort((a, b) => {
        // Sort by priority (higher = less important), then by age
        if (a[1].message.priority !== b[1].message.priority) {
          return b[1].message.priority - a[1].message.priority;
        }
        return a[1].storedAt - b[1].storedAt;
      });

    let freed = 0;
    for (const [key, entry] of entries) {
      if (freed >= needed) break;

      // Don't evict emergency messages
      if (entry.message.priority === PRIORITY.EMERGENCY) continue;

      // Don't evict messages that haven't expired
      if (entry.message.expires > Date.now()) continue;

      freed += entry.size;
      this.currentStorage -= entry.size;
      this.storage.delete(key);
    }
  }

  /**
   * Cleanup expired messages
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.storage) {
      if (entry.message.expires < now) {
        this.currentStorage -= entry.size;
        this.storage.delete(key);
      }
    }
  }
}

// =============================================================================
// FREE COMM NODE
// =============================================================================

/**
 * Main FreeComm node - uses all available transports
 */
export class FreeCommNode {
  constructor(options = {}) {
    this.id = options.id || crypto.randomUUID();
    this.name = options.name || 'Anonymous';

    // All transport adapters
    this.transports = new Map();

    // Store and forward
    this.store = new StoreAndForward({ nodeId: this.id });

    // Known peers
    this.peers = new Map();

    // Message handlers
    this.handlers = new Map();

    // Delivery confirmations
    this.pendingAcks = new Map();

    // Config
    this.config = {
      autoForward: options.autoForward ?? true,
      epidemicRouting: options.epidemicRouting ?? true,
      encryptByDefault: options.encryptByDefault ?? true,
    };
  }

  /**
   * Add a transport adapter
   */
  addTransport(adapter) {
    adapter.onMessage = (peerId, message) => this._handleMessage(peerId, message, adapter.type);
    adapter.onPeer = (peerId) => this._handlePeer(peerId, adapter.type);
    this.transports.set(adapter.type, adapter);
    return this;
  }

  /**
   * Initialize all transports
   */
  async init() {
    const results = await Promise.allSettled(
      Array.from(this.transports.values()).map(t => t.init())
    );

    console.log('[FreeComm] Transport status:');
    for (const [type, transport] of this.transports) {
      console.log(`  ${type}: ${transport.available ? '✓' : '✗'}`);
    }

    // Start periodic tasks
    this._startPeriodicTasks();

    return this;
  }

  /**
   * Send a message - tries all available transports
   */
  async send(to, content, options = {}) {
    const message = new FreeCommMessage({
      from: this.id,
      to,
      type: options.type || MSG_TYPE.TEXT,
      priority: options.priority ?? PRIORITY.NORMAL,
      payload: content,
      encrypted: options.encrypted ?? this.config.encryptByDefault,
    });

    // Try to find a route
    const transport = this._findBestTransport(to, message.priority);

    if (transport && transport.connected) {
      // Direct send
      try {
        await transport.send(to, message);
        return { status: 'sent', transport: transport.type };
      } catch (e) {
        console.error(`Send failed on ${transport.type}:`, e);
      }
    }

    // Store for later delivery
    await this.store.store(message);
    return { status: 'stored', messageId: message.id };
  }

  /**
   * Find best available transport for a peer
   */
  _findBestTransport(peerId, priority) {
    const peer = this.peers.get(peerId);
    if (!peer) return null;

    // Sort transports by preference for this priority
    const available = Array.from(this.transports.values())
      .filter(t => t.available && peer.transports?.includes(t.type))
      .sort((a, b) => {
        const capsA = a.getCapabilities();
        const capsB = b.getCapabilities();

        // Emergency - prefer fastest
        if (priority === PRIORITY.EMERGENCY) {
          if (capsA.realtime !== capsB.realtime) {
            return capsA.realtime ? -1 : 1;
          }
        }

        // Normal - prefer free + reliable
        if (capsA.cost !== capsB.cost) {
          return (capsA.cost || 0) - (capsB.cost || 0);
        }

        return 0;
      });

    return available[0] || null;
  }

  /**
   * Handle incoming message
   */
  _handleMessage(peerId, message, transportType) {
    // Update peer info
    this._updatePeer(peerId, transportType);

    // Check if for us
    if (message.to === this.id) {
      // Deliver locally
      this._deliverLocal(message);

      // Send ACK
      if (message.custodyRequired) {
        this._sendAck(peerId, message.id, transportType);
      }
    } else if (this.config.autoForward) {
      // Forward
      this._forward(message);
    }

    // Epidemic routing - exchange messages with this peer
    if (this.config.epidemicRouting) {
      this._exchangeMessages(peerId, transportType);
    }
  }

  /**
   * Deliver message locally
   */
  _deliverLocal(message) {
    const handler = this.handlers.get(message.type);
    if (handler) {
      handler(message);
    }
    this._emit('message', message);
  }

  /**
   * Forward a message
   */
  async _forward(message) {
    // Don't forward if max hops reached
    if (message.hops >= message.maxHops) return;

    // Increment hop count
    message.hops++;
    message.path.push(this.id);

    // Store for later delivery
    await this.store.store(message);

    // Try to send now if we have a route
    const transport = this._findBestTransport(message.to, message.priority);
    if (transport) {
      try {
        await transport.send(message.to, message);
        this.store.markDelivered(message.id);
      } catch (e) {
        // Will try again later
      }
    }
  }

  /**
   * Exchange messages with a peer (epidemic routing)
   */
  async _exchangeMessages(peerId, transportType) {
    const transport = this.transports.get(transportType);
    if (!transport) return;

    // Get messages this peer might want
    const messages = this.store.getMessagesFor(peerId);

    for (const message of messages) {
      try {
        await transport.send(peerId, message);
        // Don't delete - wait for ACK
      } catch (e) {
        // Will try again later
      }
    }
  }

  /**
   * Update peer info
   */
  _updatePeer(peerId, transportType) {
    if (!this.peers.has(peerId)) {
      this.peers.set(peerId, {
        id: peerId,
        transports: [],
        lastSeen: Date.now(),
      });
    }

    const peer = this.peers.get(peerId);
    peer.lastSeen = Date.now();
    if (!peer.transports.includes(transportType)) {
      peer.transports.push(transportType);
    }
  }

  _handlePeer(peerId, transportType) {
    this._updatePeer(peerId, transportType);
    this._emit('peer', { id: peerId, transport: transportType });
  }

  /**
   * Register message handler
   */
  on(type, handler) {
    this.handlers.set(type, handler);
    return this;
  }

  /**
   * Periodic maintenance
   */
  _startPeriodicTasks() {
    // Cleanup expired messages
    setInterval(() => this.store.cleanup(), 60000);

    // Try to deliver stored messages
    setInterval(() => this._tryDeliverStored(), 30000);

    // Discover peers
    setInterval(() => this._discover(), 60000);
  }

  async _tryDeliverStored() {
    for (const [peerId, peer] of this.peers) {
      const messages = this.store.getMessagesFor(peerId);
      if (messages.length === 0) continue;

      for (const transportType of peer.transports) {
        const transport = this.transports.get(transportType);
        if (!transport?.available) continue;

        for (const message of messages) {
          try {
            await transport.send(peerId, message);
            this.store.markDelivered(message.id);
          } catch (e) {
            // Try next transport
            break;
          }
        }
      }
    }
  }

  async _discover() {
    for (const transport of this.transports.values()) {
      if (transport.available && transport.discover) {
        try {
          await transport.discover();
        } catch (e) {
          // Discovery failed
        }
      }
    }
  }

  // Events
  _listeners = new Map();

  _emit(event, data) {
    const handlers = this._listeners.get(event) || [];
    handlers.forEach(h => h(data));
  }

  onEvent(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(handler);
    return () => {
      const handlers = this._listeners.get(event);
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    };
  }

  /**
   * Cleanup
   */
  async destroy() {
    for (const transport of this.transports.values()) {
      await transport.destroy?.();
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default FreeCommNode;
