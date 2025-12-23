/**
 * @file test/core/state-machine.js
 * @desc Finite State Machine for test lifecycle
 * @size ~120 tokens
 * @deps []
 * @exports StateMachine, TestStates
 */

export const TestStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed'
}

const transitions = {
  idle:    { load: 'loading', reset: 'idle' },
  loading: { ready: 'ready', error: 'failed' },
  ready:   { run: 'running', reset: 'idle' },
  running: { pass: 'passed', fail: 'failed' },
  passed:  { reset: 'idle' },
  failed:  { reset: 'idle' }
}

export class StateMachine {
  constructor(initial = TestStates.IDLE) {
    this.state = initial
    this.listeners = new Set()
    this.history = [{ state: initial, ts: Date.now() }]
  }

  can(action) { return !!transitions[this.state]?.[action] }

  transition(action) {
    const next = transitions[this.state]?.[action]
    if (!next) throw new Error(`Invalid: ${this.state} -> ${action}`)
    const prev = this.state
    this.state = next
    this.history.push({ state: next, action, ts: Date.now() })
    this.listeners.forEach(fn => fn(next, prev, action))
    return this
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  is(...states) { return states.includes(this.state) }
  reset() { return this.transition('reset') }
}
