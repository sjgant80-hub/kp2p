/**
 * @file test/suites/index.js
 * @desc Auto-load all test suites
 * @size ~30 tokens
 * @deps registry.js, *.suite.js
 * @exports suites
 */

import { getSuites } from '../core/registry.js'

// Import all suites (they self-register)
import './crypto.suite.js'
import './store.suite.js'
import './sync.suite.js'
import './network.suite.js'
import './e2e.suite.js'

// Export registered suites
export const suites = getSuites()
export { getSuites, getSuite } from '../core/registry.js'
