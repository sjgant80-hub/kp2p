/**
 * @file sandbox/js/p2p.js
 * @desc P2P status initialization
 * @size ~50 tokens
 * @deps state
 * @exports initP2PStatus
 */

import { state } from './state.js'
import { addLog } from './actions.js'

export async function initP2PStatus() {
  try {
    const { injectP2P } = await import('../../src/index.js')
    state.p2p = await injectP2P({
      roomId: state.roomId,
      showUI: false,
      user: { name: 'Sandbox', color: '#4facfe' }
    })
    state.connected = true
    addLog('success', '🌐 P2P connected: ' + state.p2p.peerId.slice(0, 12) + '...')
    return true
  } catch (e) {
    addLog('warn', '⚠ P2P unavailable: ' + e.message)
    return false
  }
}

export function updatePeerStatus() {
  if (state.p2p) {
    state.peers = state.p2p.getPeers()
  }
}
