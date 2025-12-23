/**
 * @file test/core/runner.js
 * @desc Test executor with state machine
 * @size ~150 tokens
 * @deps state-machine.js, csv-loader.js, assertions.js
 * @exports TestRunner, TestResult
 */

import { StateMachine, TestStates } from './state-machine.js'
import { loadCSV } from './csv-loader.js'

export class TestResult {
  constructor(id, passed, duration, error = null) {
    Object.assign(this, { id, passed, duration, error, ts: Date.now() })
  }
}

export class TestRunner {
  constructor() {
    this.sm = new StateMachine()
    this.suites = new Map()
    this.results = []
    this.listeners = new Set()
  }

  async register(name, csvPath, testFn) {
    this.sm.transition('load')
    try {
      const params = await loadCSV(csvPath)
      this.suites.set(name, { params, testFn })
      if ([...this.suites.values()].every(s => s.params)) this.sm.transition('ready')
    } catch (e) { this.sm.transition('error'); throw e }
  }

  async runAll() {
    this.sm.transition('run')
    this.results = []

    for (const [name, { params, testFn }] of this.suites) {
      for (const row of params) {
        if (row.skip) continue
        const start = performance.now()
        try {
          await Promise.race([
            testFn(row),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), row.timeout || 5000))
          ])
          this.results.push(new TestResult(`${name}:${row.id}`, true, performance.now() - start))
        } catch (e) {
          this.results.push(new TestResult(`${name}:${row.id}`, false, performance.now() - start, e))
        }
        this.emit('result', this.results.at(-1))
      }
    }

    const allPassed = this.results.every(r => r.passed)
    this.sm.transition(allPassed ? 'pass' : 'fail')
    this.emit('done', this.results)
    return this.results
  }

  on(evt, fn) { this.listeners.add({ evt, fn }) }
  emit(evt, data) { this.listeners.forEach(l => l.evt === evt && l.fn(data)) }
  get state() { return this.sm.state }
  get stats() {
    const p = this.results.filter(r => r.passed).length
    return { total: this.results.length, passed: p, failed: this.results.length - p }
  }
}
