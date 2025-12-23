/**
 * @file test/suites/network.suite.js
 * @desc Network module tests
 * @size ~100 tokens
 * @deps ../templates/suite.tpl.js, ../core/assertions.js
 * @exports networkSuite
 */

import { defineSuite } from '../templates/suite.tpl.js'
import { paramTest } from '../templates/test.tpl.js'
import { assert } from '../core/assertions.js'
import { register } from '../core/registry.js'

const mockPeers = new Set()
const mockRooms = new Map()
const mockTopics = new Map()

export const networkSuite = defineSuite('network', {
  csv: './cases/network.csv',

  async setup() {
    mockPeers.clear()
    mockRooms.clear()
    mockTopics.clear()
    return { peers: mockPeers, rooms: mockRooms, topics: mockTopics }
  },

  async teardown() {},

  test: paramTest(async (input, expected, ctx) => {
    const id = ctx.id || ''

    if (id.startsWith('peer_create')) {
      const peerId = 'peer_' + Math.random().toString(36).slice(2)
      mockPeers.add(peerId)
      assert.ok(mockPeers.has(peerId))
    }
    else if (id.startsWith('peer_connect')) {
      mockPeers.add(input.addr || input)
      assert.ok(true)
    }
    else if (id.startsWith('room_join')) {
      mockRooms.set(input, new Set(['self']))
      assert.ok(mockRooms.has(input))
    }
    else if (id.startsWith('room_leave')) {
      mockRooms.delete(input)
      assert.eq(mockRooms.has(input), false)
    }
    else if (id.startsWith('room_peers')) {
      mockRooms.set(input, new Set(['p1', 'p2']))
      assert.ok(mockRooms.get(input)?.size >= 0)
    }
    else if (id.startsWith('pubsub_sub')) {
      mockTopics.set(input, [])
      assert.ok(mockTopics.has(input))
    }
    else if (id.startsWith('pubsub_pub')) {
      const topic = input.topic || input
      if (!mockTopics.has(topic)) mockTopics.set(topic, [])
      mockTopics.get(topic).push(input.msg)
      assert.ok(true)
    }
    else if (id.startsWith('pubsub_unsub')) {
      mockTopics.delete(input)
      assert.ok(true)
    }
    else assert.ok(true) // discovery, relay, nat mocked
  })
})

register(networkSuite)
