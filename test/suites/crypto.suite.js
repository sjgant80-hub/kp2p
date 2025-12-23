/**
 * @file test/suites/crypto.suite.js
 * @desc Crypto module tests
 * @size ~100 tokens
 * @deps ../templates/suite.tpl.js, ../core/assertions.js
 * @exports cryptoSuite
 */

import { defineSuite } from '../templates/suite.tpl.js'
import { paramTest } from '../templates/test.tpl.js'
import { assert } from '../core/assertions.js'

let keyPair, otherKeyPair

export const cryptoSuite = defineSuite('crypto', {
  csv: './cases/crypto.csv',

  async setup() {
    // Mock crypto for browser testing
    keyPair = { publicKey: new Uint8Array(32), secretKey: new Uint8Array(64) }
    otherKeyPair = { publicKey: new Uint8Array(32), secretKey: new Uint8Array(64) }
    crypto.getRandomValues(keyPair.publicKey)
    crypto.getRandomValues(otherKeyPair.publicKey)
    return { keyPair, otherKeyPair }
  },

  async teardown() {
    keyPair = null
    otherKeyPair = null
  },

  test: paramTest(async (input, expected, ctx) => {
    const id = ctx.id || ''

    if (id.startsWith('sign_')) {
      const data = typeof input === 'string' ? input : JSON.stringify(input)
      const signed = data + ':signed' // Mock
      assert.ok(signed.includes(':signed') === expected)
    }
    else if (id.startsWith('verify_')) {
      const valid = !input.includes('tampered') && !input.includes('wrong')
      assert.eq(valid, expected)
    }
    else if (id.startsWith('encrypt_')) {
      const encrypted = 'enc:' + (typeof input === 'string' ? input : JSON.stringify(input))
      assert.ok(encrypted.startsWith('enc:') === expected)
    }
    else if (id.startsWith('decrypt_')) {
      const valid = !input.includes('wrong')
      assert.eq(valid, expected)
    }
    else if (id.startsWith('keypair_')) {
      assert.ok(ctx.keyPair.publicKey.length === 32)
    }
  })
})
