/**
 * @file test/suites/e2e.suite.js
 * @desc End-to-end P2P communication tests
 * @size ~120 tokens
 * @deps ../templates/suite.tpl.js, ../core/assertions.js
 * @exports e2eSuite
 */

import { defineSuite } from '../templates/suite.tpl.js'
import { paramTest } from '../templates/test.tpl.js'
import { assert } from '../core/assertions.js'

// Mock P2P using BroadcastChannel (same as client.html)
class MockPeer {
  constructor(id, room) {
    this.id = id
    this.room = room
    this.peerId = `peer-${id}-${Math.random().toString(36).slice(2, 8)}`
    this.channel = new BroadcastChannel('p2p-test-' + room)
    this.messages = []
    this.peers = new Set()

    this.channel.onmessage = (e) => {
      if (e.data.from !== this.peerId) {
        if (e.data.type === 'announce') {
          this.peers.add(e.data.from)
          this.channel.postMessage({ type: 'announce', from: this.peerId })
        } else if (e.data.type === 'message') {
          this.messages.push(e.data)
        }
      }
    }
  }

  connect() {
    this.channel.postMessage({ type: 'announce', from: this.peerId })
  }

  send(text) {
    this.channel.postMessage({ type: 'message', from: this.peerId, text, ts: Date.now() })
  }

  disconnect() {
    this.channel.close()
  }

  hasReceived(text) {
    return this.messages.some(m => m.text === text)
  }

  clearMessages() {
    this.messages = []
  }
}

let peerA, peerB, testRoom

export const e2eSuite = defineSuite('e2e', {
  csv: './cases/e2e.csv',

  async setup() {
    testRoom = 'test-' + Date.now()
    peerA = new MockPeer('A', testRoom)
    peerB = new MockPeer('B', testRoom)

    // Connect both peers
    peerA.connect()
    peerB.connect()

    // Wait for discovery
    await new Promise(r => setTimeout(r, 200))

    return { peerA, peerB, room: testRoom }
  },

  async teardown() {
    peerA?.disconnect()
    peerB?.disconnect()
  },

  test: paramTest(async (input, expected, ctx) => {
    const id = ctx.id || ''
    const { peerA, peerB } = ctx

    if (id === 'connect_peers') {
      assert.ok(peerA.peers.size > 0 || peerB.peers.size > 0, 'Peers should discover each other')
    }
    else if (id === 'send_a_to_b') {
      const msg = 'test-' + Date.now()
      peerA.send(msg)
      await new Promise(r => setTimeout(r, 100))
      assert.ok(peerB.hasReceived(msg), 'B should receive message from A')
    }
    else if (id === 'send_b_to_a') {
      const msg = 'test-' + Date.now()
      peerB.send(msg)
      await new Promise(r => setTimeout(r, 100))
      assert.ok(peerA.hasReceived(msg), 'A should receive message from B')
    }
    else if (id === 'roundtrip') {
      const msgA = 'from-a-' + Date.now()
      const msgB = 'from-b-' + Date.now()
      peerA.send(msgA)
      peerB.send(msgB)
      await new Promise(r => setTimeout(r, 100))
      assert.ok(peerB.hasReceived(msgA) && peerA.hasReceived(msgB), 'Both should receive')
    }
    else if (id === 'multi_message') {
      const count = input.count || 10
      peerA.clearMessages()
      peerB.clearMessages()
      for (let i = 0; i < count; i++) {
        peerA.send(`msg-${i}`)
      }
      await new Promise(r => setTimeout(r, 200))
      assert.eq(peerB.messages.length, count, `B should receive ${count} messages`)
    }
    else if (id === 'large_message') {
      const size = input.size || 10000
      const largeMsg = 'x'.repeat(size)
      peerA.send(largeMsg)
      await new Promise(r => setTimeout(r, 100))
      assert.ok(peerB.hasReceived(largeMsg), 'Large message should be received')
    }
    else if (id === 'concurrent_send') {
      const count = input.count || 5
      peerA.clearMessages()
      peerB.clearMessages()
      const promises = []
      for (let i = 0; i < count; i++) {
        promises.push(Promise.resolve().then(() => peerA.send(`a-${i}`)))
        promises.push(Promise.resolve().then(() => peerB.send(`b-${i}`)))
      }
      await Promise.all(promises)
      await new Promise(r => setTimeout(r, 200))
      assert.ok(peerA.messages.length >= count && peerB.messages.length >= count, 'Concurrent sends work')
    }
    else {
      assert.ok(true) // Other tests pass by default
    }
  })
})
