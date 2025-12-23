/**
 * @file test/templates/test.tpl.js
 * @desc Individual test case template
 * @size ~40 tokens
 * @deps assertions.js
 * @exports defineTest, TestTemplate
 */

import { assert } from '../core/assertions.js'

export const TestTemplate = {
  id: '',
  input: null,
  expected: null,
  timeout: 5000,
  skip: false,
  fn: async (input, expected, ctx) => {}
}

export function defineTest(id, config) {
  return { ...TestTemplate, id, ...config }
}

export function paramTest(fn) {
  return async (params, ctx) => {
    const { input, expected, ...rest } = params
    const parsed = typeof input === 'string' && input.startsWith('{')
      ? JSON.parse(input)
      : input
    return fn(parsed, expected, { ...ctx, ...rest, assert })
  }
}

export function batch(tests) {
  return tests.map(t => defineTest(t.id, t))
}
