/**
 * @file test/core/assertions.js
 * @desc Assertion helpers for tests
 * @size ~60 tokens
 * @deps []
 * @exports assert, eq, neq, ok, throws, deep
 */

export class AssertionError extends Error {
  constructor(msg, actual, expected) {
    super(msg)
    this.name = 'AssertionError'
    this.actual = actual
    this.expected = expected
  }
}

export const assert = {
  ok: (v, msg = 'Expected truthy') => {
    if (!v) throw new AssertionError(msg, v, true)
  },
  eq: (a, b, msg = `Expected ${a} === ${b}`) => {
    if (a !== b) throw new AssertionError(msg, a, b)
  },
  neq: (a, b, msg = `Expected ${a} !== ${b}`) => {
    if (a === b) throw new AssertionError(msg, a, b)
  },
  deep: (a, b, msg = 'Deep equality failed') => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw new AssertionError(msg, a, b)
  },
  throws: async (fn, msg = 'Expected to throw') => {
    try { await fn(); throw new AssertionError(msg) }
    catch (e) { if (e instanceof AssertionError) throw e }
  },
  type: (v, t, msg) => {
    if (typeof v !== t) throw new AssertionError(msg || `Expected type ${t}`, typeof v, t)
  }
}

export const { ok, eq, neq, deep, throws, type } = assert
