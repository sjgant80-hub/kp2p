/**
 * @file src/sync/index.js
 * @desc Sync module - auto-exports all Y.js/CRDT sync functionality
 */

export * from './provider.js'
export * from './awareness.js'
export * from './room.js'
export * from './persistence.js'

// UDTs
export { SYNC_UDTS } from './udts.js'
