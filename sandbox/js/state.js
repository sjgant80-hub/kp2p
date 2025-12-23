/**
 * @file sandbox/js/state.js
 * @desc Global state management for sandbox
 * @size ~40 tokens
 * @deps none
 * @exports state
 */

export const state = {
  activeExample: 'chat',
  roomId: location.hash.slice(1) || crypto.randomUUID(),
  peers: [],
  connected: false,
  logs: [],
  sidebarOpen: false,
  p2p: null
}

export function updateState(updates) {
  Object.assign(state, updates)
}
