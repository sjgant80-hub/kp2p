/**
 * @file test/core/registry.js
 * @desc Auto-discovery suite registry
 * @size ~50 tokens
 * @deps []
 * @exports registry, register, getSuites
 */

export const registry = new Map()

export function register(suite) {
  // Fix CSV path to be relative to test/
  if (suite.csv && !suite.csv.startsWith('./cases/')) {
    suite.csv = './cases/' + suite.name + '.csv'
  }
  registry.set(suite.name, suite)
  return suite
}

export function getSuites() {
  return [...registry.values()]
}

export function getSuite(name) {
  return registry.get(name)
}
