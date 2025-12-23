/**
 * @file test/templates/state.tpl.js
 * @desc State definition template
 * @size ~40 tokens
 * @deps []
 * @exports defineState, StateTemplate
 */

export const StateTemplate = {
  name: '',
  enter: async (ctx) => {},
  exit: async (ctx) => {},
  transitions: {}
}

export function defineState(name, config = {}) {
  return {
    ...StateTemplate,
    name,
    ...config,
    transitions: { ...StateTemplate.transitions, ...config.transitions }
  }
}

export function createStates(defs) {
  return Object.fromEntries(
    Object.entries(defs).map(([k, v]) => [k, defineState(k, v)])
  )
}
