/**
 * @file src/core/protocol.js
 * @desc Agent messaging protocol - envelope format and validation
 *
 * MESSAGE TYPES:
 * - request:  ask peer to do something, expects response
 * - response: reply to a request
 * - stream:   ongoing data (no response expected)
 * - event:    broadcast notification
 */

import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import { encode as msgpackEncode, decode as msgpackDecode } from 'https://esm.sh/msgpack-lite@0.1.26';

/**
 * Message types
 */
export const MSG_TYPE = {
  REQUEST: 'req',
  RESPONSE: 'res',
  STREAM: 'stream',
  EVENT: 'event',
};

/**
 * Create a unique message ID
 */
export function createId() {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a message envelope
 *
 * @param {Object} opts
 * @param {string} opts.type - Message type (req/res/stream/event)
 * @param {string} opts.from - Sender peer ID
 * @param {string} opts.to - Recipient peer ID (optional for events)
 * @param {string} opts.action - Action name (for requests)
 * @param {any} opts.payload - Message payload
 * @param {string} opts.replyTo - Original message ID (for responses)
 * @param {Uint8Array} opts.secretKey - Sender's secret key (for signing)
 */
export function createMessage(opts) {
  const msg = {
    id: createId(),
    v: 1, // protocol version
    type: opts.type || MSG_TYPE.REQUEST,
    from: opts.from,
    to: opts.to || null,
    action: opts.action || null,
    payload: opts.payload,
    replyTo: opts.replyTo || null,
    ts: Date.now(),
    sig: null,
  };

  // Sign if key provided
  if (opts.secretKey) {
    const data = msgpackEncode({
      id: msg.id,
      v: msg.v,
      type: msg.type,
      from: msg.from,
      to: msg.to,
      action: msg.action,
      payload: msg.payload,
      replyTo: msg.replyTo,
      ts: msg.ts,
    });
    msg.sig = nacl.sign.detached(data, opts.secretKey);
  }

  return msg;
}

/**
 * Verify message signature
 *
 * @param {Object} msg - Message to verify
 * @param {Uint8Array} publicKey - Sender's public key
 */
export function verifyMessage(msg, publicKey) {
  if (!msg.sig) return false;

  const data = msgpackEncode({
    id: msg.id,
    v: msg.v,
    type: msg.type,
    from: msg.from,
    to: msg.to,
    action: msg.action,
    payload: msg.payload,
    replyTo: msg.replyTo,
    ts: msg.ts,
  });

  return nacl.sign.detached.verify(data, msg.sig, publicKey);
}

/**
 * Encode message for transport (msgpack + optional compression)
 */
export function encodeMessage(msg) {
  return msgpackEncode(msg);
}

/**
 * Decode message from transport
 */
export function decodeMessage(data) {
  return msgpackDecode(data);
}

/**
 * Validate message structure
 */
export function validateMessage(msg) {
  const errors = [];

  if (!msg.id || typeof msg.id !== 'string') {
    errors.push('missing or invalid id');
  }

  if (!msg.v || msg.v !== 1) {
    errors.push('unsupported protocol version');
  }

  if (!Object.values(MSG_TYPE).includes(msg.type)) {
    errors.push('invalid message type');
  }

  if (!msg.from || typeof msg.from !== 'string') {
    errors.push('missing or invalid from');
  }

  if (msg.type === MSG_TYPE.REQUEST && !msg.action) {
    errors.push('request missing action');
  }

  if (msg.type === MSG_TYPE.RESPONSE && !msg.replyTo) {
    errors.push('response missing replyTo');
  }

  if (!msg.ts || typeof msg.ts !== 'number') {
    errors.push('missing or invalid timestamp');
  }

  // Check timestamp freshness (within 5 minutes)
  const age = Date.now() - msg.ts;
  if (Math.abs(age) > 5 * 60 * 1000) {
    errors.push('message timestamp too old or future');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create request helper
 */
export function request(from, to, action, payload, secretKey = null) {
  return createMessage({
    type: MSG_TYPE.REQUEST,
    from,
    to,
    action,
    payload,
    secretKey,
  });
}

/**
 * Create response helper
 */
export function response(from, to, replyTo, payload, secretKey = null) {
  return createMessage({
    type: MSG_TYPE.RESPONSE,
    from,
    to,
    replyTo,
    payload,
    secretKey,
  });
}

/**
 * Create event helper (broadcast)
 */
export function event(from, action, payload, secretKey = null) {
  return createMessage({
    type: MSG_TYPE.EVENT,
    from,
    action,
    payload,
    secretKey,
  });
}

/**
 * Create stream message helper
 */
export function stream(from, to, payload, secretKey = null) {
  return createMessage({
    type: MSG_TYPE.STREAM,
    from,
    to,
    payload,
    secretKey,
  });
}

/**
 * Protocol handler - manages pending requests and routing
 */
export class Protocol {
  constructor(peerId, options = {}) {
    this.peerId = peerId;
    this.timeout = options.timeout || 30000;
    this.pending = new Map(); // pending requests
    this.handlers = new Map(); // action handlers
    this.onSend = options.onSend || (() => {}); // how to send messages
    this.keyPair = options.keyPair || null;
  }

  /**
   * Register action handler
   */
  on(action, handler) {
    this.handlers.set(action, handler);
  }

  /**
   * Remove action handler
   */
  off(action) {
    this.handlers.delete(action);
  }

  /**
   * Send request and wait for response
   */
  async call(to, action, payload) {
    const msg = request(
      this.peerId,
      to,
      action,
      payload,
      this.keyPair?.secretKey
    );

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(msg.id);
        reject(new Error(`Request timeout: ${action}`));
      }, this.timeout);

      this.pending.set(msg.id, {
        resolve: (result) => { clearTimeout(timer); resolve(result); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });

      this.onSend(msg);
    });
  }

  /**
   * Send event (no response expected)
   */
  emit(action, payload) {
    const msg = event(
      this.peerId,
      action,
      payload,
      this.keyPair?.secretKey
    );
    this.onSend(msg);
  }

  /**
   * Handle incoming message
   */
  async receive(msg) {
    const validation = validateMessage(msg);
    if (!validation.valid) {
      console.warn('Invalid message:', validation.errors);
      return;
    }

    // Handle response
    if (msg.type === MSG_TYPE.RESPONSE) {
      const pending = this.pending.get(msg.replyTo);
      if (pending) {
        this.pending.delete(msg.replyTo);
        if (msg.payload?.error) {
          pending.reject(new Error(msg.payload.error));
        } else {
          pending.resolve(msg.payload);
        }
      }
      return;
    }

    // Handle request
    if (msg.type === MSG_TYPE.REQUEST) {
      const handler = this.handlers.get(msg.action);
      if (!handler) {
        // Send error response
        const reply = response(
          this.peerId,
          msg.from,
          msg.id,
          { error: `Unknown action: ${msg.action}` },
          this.keyPair?.secretKey
        );
        this.onSend(reply);
        return;
      }

      try {
        const result = await handler(msg.payload, msg);
        const reply = response(
          this.peerId,
          msg.from,
          msg.id,
          result,
          this.keyPair?.secretKey
        );
        this.onSend(reply);
      } catch (err) {
        const reply = response(
          this.peerId,
          msg.from,
          msg.id,
          { error: err.message },
          this.keyPair?.secretKey
        );
        this.onSend(reply);
      }
      return;
    }

    // Handle event
    if (msg.type === MSG_TYPE.EVENT) {
      const handler = this.handlers.get(msg.action);
      if (handler) {
        try {
          await handler(msg.payload, msg);
        } catch (err) {
          console.error('Event handler error:', err);
        }
      }
      return;
    }

    // Handle stream
    if (msg.type === MSG_TYPE.STREAM) {
      const handler = this.handlers.get('__stream__');
      if (handler) {
        try {
          await handler(msg.payload, msg);
        } catch (err) {
          console.error('Stream handler error:', err);
        }
      }
    }
  }
}

export default Protocol;
