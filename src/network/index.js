/**
 * @file src/network/index.js
 * @desc Network module - auto-exports all network functionality
 */

export * from './libp2p.js'
export * from './transport.js'
export * from './discovery.js'
export * from './relay.js'
export * from './nat.js'

// Telephony
export * from './cell.js'
export * from './konotel.js'
export * from './freecomm.js'

// UDTs
export { NETWORK_UDTS } from './udts.js'
