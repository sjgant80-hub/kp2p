/**
 * @file src/core/index.js
 * @desc Core module - auto-exports all core functionality
 */

export * from './identity.js'
export * from './peer.js'
export * from './crypto.js'
export * from './store.js'
export * from './protocol.js'
export * from './sandbox.js'

// UDTs
export { CORE_UDTS } from './udts.js'

// Paths - token-optimized path registry
export { P, F, resolve, shorten, listPaths, listFiles, PATH_UDTS } from './paths.js'
