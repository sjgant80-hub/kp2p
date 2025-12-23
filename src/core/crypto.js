/**
 * Crypto Module
 * Encryption, decryption, signing, verification using tweetnacl
 */

import nacl from 'tweetnacl'
import { fromString, toString } from 'uint8arrays'
import { CRYPTO_CONFIG } from '../config.js'

/**
 * Generate a new Ed25519 keypair for signing
 * @returns {{publicKey: Uint8Array, secretKey: Uint8Array}}
 */
export function generateSigningKeyPair() {
  return nacl.sign.keyPair()
}

/**
 * Generate a new X25519 keypair for encryption
 * @returns {{publicKey: Uint8Array, secretKey: Uint8Array}}
 */
export function generateBoxKeyPair() {
  return nacl.box.keyPair()
}

/**
 * Derive a shared secret from private and public keys (X25519)
 * @param {Uint8Array} mySecretKey - My secret key
 * @param {Uint8Array} theirPublicKey - Their public key
 * @returns {Uint8Array} - Shared secret (32 bytes)
 */
export function deriveSharedSecret(mySecretKey, theirPublicKey) {
  return nacl.scalarMult(mySecretKey, theirPublicKey)
}

/**
 * Generate a random nonce for encryption
 * @returns {Uint8Array} - Random nonce (24 bytes)
 */
export function generateNonce() {
  return nacl.randomBytes(CRYPTO_CONFIG.nonceLength)
}

/**
 * Encrypt a message using a shared secret (symmetric)
 * @param {Uint8Array|string} message - Message to encrypt
 * @param {Uint8Array} secret - Shared secret
 * @returns {{nonce: Uint8Array, ciphertext: Uint8Array}}
 */
export function encrypt(message, secret) {
  const messageBytes = typeof message === 'string'
    ? fromString(message)
    : message
  const nonce = generateNonce()
  const ciphertext = nacl.secretbox(messageBytes, nonce, secret)

  if (!ciphertext) {
    throw new Error('Encryption failed')
  }

  return { nonce, ciphertext }
}

/**
 * Decrypt a message using a shared secret (symmetric)
 * @param {{nonce: Uint8Array, ciphertext: Uint8Array}} encrypted - Encrypted payload
 * @param {Uint8Array} secret - Shared secret
 * @returns {Uint8Array|null} - Decrypted message or null if failed
 */
export function decrypt(encrypted, secret) {
  const { nonce, ciphertext } = encrypted
  return nacl.secretbox.open(ciphertext, nonce, secret)
}

/**
 * Decrypt and return as string
 * @param {{nonce: Uint8Array, ciphertext: Uint8Array}} encrypted
 * @param {Uint8Array} secret
 * @returns {string|null}
 */
export function decryptToString(encrypted, secret) {
  const decrypted = decrypt(encrypted, secret)
  return decrypted ? toString(decrypted) : null
}

/**
 * Encrypt using public-key cryptography (box)
 * @param {Uint8Array|string} message - Message to encrypt
 * @param {Uint8Array} recipientPublicKey - Recipient's public key
 * @param {Uint8Array} senderSecretKey - Sender's secret key
 * @returns {{nonce: Uint8Array, ciphertext: Uint8Array}}
 */
export function encryptBox(message, recipientPublicKey, senderSecretKey) {
  const messageBytes = typeof message === 'string'
    ? fromString(message)
    : message
  const nonce = generateNonce()
  const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey)

  if (!ciphertext) {
    throw new Error('Box encryption failed')
  }

  return { nonce, ciphertext }
}

/**
 * Decrypt using public-key cryptography (box)
 * @param {{nonce: Uint8Array, ciphertext: Uint8Array}} encrypted
 * @param {Uint8Array} senderPublicKey - Sender's public key
 * @param {Uint8Array} recipientSecretKey - Recipient's secret key
 * @returns {Uint8Array|null}
 */
export function decryptBox(encrypted, senderPublicKey, recipientSecretKey) {
  const { nonce, ciphertext } = encrypted
  return nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey)
}

/**
 * Sign a message
 * @param {Uint8Array|string} message - Message to sign
 * @param {Uint8Array} secretKey - Signing secret key (64 bytes)
 * @returns {Uint8Array} - Detached signature (64 bytes)
 */
export function sign(message, secretKey) {
  const messageBytes = typeof message === 'string'
    ? fromString(message)
    : message
  return nacl.sign.detached(messageBytes, secretKey)
}

/**
 * Verify a signature
 * @param {Uint8Array|string} message - Original message
 * @param {Uint8Array} signature - Detached signature
 * @param {Uint8Array} publicKey - Signer's public key
 * @returns {boolean}
 */
export function verify(message, signature, publicKey) {
  const messageBytes = typeof message === 'string'
    ? fromString(message)
    : message
  return nacl.sign.detached.verify(messageBytes, signature, publicKey)
}

/**
 * Hash data using SHA-512 (tweetnacl's hash)
 * @param {Uint8Array|string} data
 * @returns {Uint8Array} - 64-byte hash
 */
export function hash(data) {
  const dataBytes = typeof data === 'string'
    ? fromString(data)
    : data
  return nacl.hash(dataBytes)
}

/**
 * Generate random bytes
 * @param {number} length
 * @returns {Uint8Array}
 */
export function randomBytes(length) {
  return nacl.randomBytes(length)
}

/**
 * Encode bytes to base64
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toBase64(bytes) {
  return toString(bytes, 'base64')
}

/**
 * Decode base64 to bytes
 * @param {string} str
 * @returns {Uint8Array}
 */
export function fromBase64(str) {
  return fromString(str, 'base64')
}

/**
 * Encode bytes to hex
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toHex(bytes) {
  return toString(bytes, 'base16')
}

/**
 * Decode hex to bytes
 * @param {string} str
 * @returns {Uint8Array}
 */
export function fromHex(str) {
  return fromString(str, 'base16')
}

/**
 * Create a KeyPair object with utility methods
 */
export class KeyPair {
  constructor(signingKeyPair, boxKeyPair = null) {
    this.signing = signingKeyPair
    this.box = boxKeyPair || generateBoxKeyPair()
  }

  static generate() {
    return new KeyPair(generateSigningKeyPair(), generateBoxKeyPair())
  }

  static fromSecretKey(signingSecretKey, boxSecretKey = null) {
    const signingKeyPair = nacl.sign.keyPair.fromSecretKey(signingSecretKey)
    const boxKeyPair = boxSecretKey
      ? nacl.box.keyPair.fromSecretKey(boxSecretKey)
      : generateBoxKeyPair()
    return new KeyPair(signingKeyPair, boxKeyPair)
  }

  sign(message) {
    return sign(message, this.signing.secretKey)
  }

  verify(message, signature, publicKey) {
    return verify(message, signature, publicKey || this.signing.publicKey)
  }

  encrypt(message, recipientPublicKey) {
    return encryptBox(message, recipientPublicKey, this.box.secretKey)
  }

  decrypt(encrypted, senderPublicKey) {
    return decryptBox(encrypted, senderPublicKey, this.box.secretKey)
  }

  deriveSecret(theirPublicKey) {
    return deriveSharedSecret(this.box.secretKey, theirPublicKey)
  }

  toJSON() {
    return {
      signing: {
        publicKey: toBase64(this.signing.publicKey),
        secretKey: toBase64(this.signing.secretKey)
      },
      box: {
        publicKey: toBase64(this.box.publicKey),
        secretKey: toBase64(this.box.secretKey)
      }
    }
  }

  static fromJSON(json) {
    return new KeyPair(
      {
        publicKey: fromBase64(json.signing.publicKey),
        secretKey: fromBase64(json.signing.secretKey)
      },
      {
        publicKey: fromBase64(json.box.publicKey),
        secretKey: fromBase64(json.box.secretKey)
      }
    )
  }
}

export default {
  generateSigningKeyPair,
  generateBoxKeyPair,
  deriveSharedSecret,
  generateNonce,
  encrypt,
  decrypt,
  decryptToString,
  encryptBox,
  decryptBox,
  sign,
  verify,
  hash,
  randomBytes,
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  KeyPair
}
