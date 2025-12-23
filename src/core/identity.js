/**
 * Identity Module
 * Keypair generation, storage, and loading
 */

import { KeyPair, toBase64, fromBase64 } from './crypto.js'
import { createPeerId } from './peer.js'
import { getStore } from './store.js'

const IDENTITY_KEY = 'self'

/**
 * Identity represents the local peer's cryptographic identity
 */
export class Identity {
  constructor(keyPair, metadata = {}) {
    this.keyPair = keyPair
    this.peerId = createPeerId(keyPair.signing.publicKey)
    this.created = metadata.created || Date.now()
    this.name = metadata.name || null
    this.avatar = metadata.avatar || null
  }

  /**
   * Generate a new identity
   * @param {object} metadata - Optional metadata (name, avatar)
   * @returns {Identity}
   */
  static generate(metadata = {}) {
    const keyPair = KeyPair.generate()
    return new Identity(keyPair, {
      ...metadata,
      created: Date.now()
    })
  }

  /**
   * Get the public signing key
   * @returns {Uint8Array}
   */
  get publicKey() {
    return this.keyPair.signing.publicKey
  }

  /**
   * Get the public encryption key
   * @returns {Uint8Array}
   */
  get boxPublicKey() {
    return this.keyPair.box.publicKey
  }

  /**
   * Sign a message
   * @param {Uint8Array|string} message
   * @returns {Uint8Array}
   */
  sign(message) {
    return this.keyPair.sign(message)
  }

  /**
   * Verify a signature
   * @param {Uint8Array|string} message
   * @param {Uint8Array} signature
   * @param {Uint8Array} publicKey
   * @returns {boolean}
   */
  verify(message, signature, publicKey) {
    return this.keyPair.verify(message, signature, publicKey)
  }

  /**
   * Encrypt a message for a recipient
   * @param {Uint8Array|string} message
   * @param {Uint8Array} recipientPublicKey
   * @returns {{nonce: Uint8Array, ciphertext: Uint8Array}}
   */
  encrypt(message, recipientPublicKey) {
    return this.keyPair.encrypt(message, recipientPublicKey)
  }

  /**
   * Decrypt a message from a sender
   * @param {{nonce: Uint8Array, ciphertext: Uint8Array}} encrypted
   * @param {Uint8Array} senderPublicKey
   * @returns {Uint8Array|null}
   */
  decrypt(encrypted, senderPublicKey) {
    return this.keyPair.decrypt(encrypted, senderPublicKey)
  }

  /**
   * Derive a shared secret with another peer
   * @param {Uint8Array} theirPublicKey
   * @returns {Uint8Array}
   */
  deriveSecret(theirPublicKey) {
    return this.keyPair.deriveSecret(theirPublicKey)
  }

  /**
   * Serialize to JSON for storage
   * @returns {object}
   */
  toJSON() {
    return {
      keyPair: this.keyPair.toJSON(),
      peerId: this.peerId,
      created: this.created,
      name: this.name,
      avatar: this.avatar
    }
  }

  /**
   * Deserialize from JSON
   * @param {object} json
   * @returns {Identity}
   */
  static fromJSON(json) {
    const keyPair = KeyPair.fromJSON(json.keyPair)
    return new Identity(keyPair, {
      created: json.created,
      name: json.name,
      avatar: json.avatar
    })
  }

  /**
   * Get public identity info (safe to share)
   * @returns {object}
   */
  toPublic() {
    return {
      peerId: this.peerId,
      publicKey: toBase64(this.publicKey),
      boxPublicKey: toBase64(this.boxPublicKey),
      name: this.name,
      avatar: this.avatar
    }
  }
}

/**
 * IdentityManager handles persistence and retrieval of identity
 */
export class IdentityManager {
  constructor(store = null) {
    this._store = store
    this._identity = null
    this._initialized = false
  }

  /**
   * Initialize the manager with a store
   * @param {object} store - IndexedDB store wrapper
   */
  async init(store = null) {
    if (this._initialized) return this._identity

    this._store = store || await getStore()
    this._identity = await this._load()
    this._initialized = true

    return this._identity
  }

  /**
   * Load or create identity
   * @private
   */
  async _load() {
    try {
      const data = await this._store.get('identity', IDENTITY_KEY)
      if (data) {
        return Identity.fromJSON(data)
      }
    } catch (err) {
      console.warn('Failed to load identity:', err)
    }

    // Generate new identity if none exists
    const identity = Identity.generate()
    await this._save(identity)
    return identity
  }

  /**
   * Save identity to store
   * @private
   */
  async _save(identity) {
    await this._store.put('identity', {
      id: IDENTITY_KEY,
      ...identity.toJSON()
    })
  }

  /**
   * Get the current identity
   * @returns {Identity}
   */
  get identity() {
    if (!this._initialized) {
      throw new Error('IdentityManager not initialized. Call init() first.')
    }
    return this._identity
  }

  /**
   * Get the peer ID
   * @returns {string}
   */
  get peerId() {
    return this.identity.peerId
  }

  /**
   * Update identity metadata
   * @param {object} metadata
   */
  async update(metadata) {
    if (metadata.name !== undefined) {
      this._identity.name = metadata.name
    }
    if (metadata.avatar !== undefined) {
      this._identity.avatar = metadata.avatar
    }
    await this._save(this._identity)
  }

  /**
   * Reset identity (generate new one)
   * WARNING: This will create a new peer ID
   */
  async reset() {
    this._identity = Identity.generate()
    await this._save(this._identity)
    return this._identity
  }

  /**
   * Export identity for backup
   * @returns {string} - JSON string
   */
  export() {
    return JSON.stringify(this._identity.toJSON())
  }

  /**
   * Import identity from backup
   * @param {string} json - JSON string
   */
  async import(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    this._identity = Identity.fromJSON(data)
    await this._save(this._identity)
    return this._identity
  }
}

// Singleton instance
let defaultManager = null

/**
 * Get the default identity manager
 * @returns {IdentityManager}
 */
export function getIdentityManager() {
  if (!defaultManager) {
    defaultManager = new IdentityManager()
  }
  return defaultManager
}

/**
 * Load or create the default identity
 * @returns {Promise<Identity>}
 */
export async function loadIdentity() {
  const manager = getIdentityManager()
  return await manager.init()
}

export default {
  Identity,
  IdentityManager,
  getIdentityManager,
  loadIdentity
}
