/**
 * @file test/templates/suite.tpl.js
 * @desc Test suite wrapper template
 * @size ~50 tokens
 * @deps runner.js
 * @exports defineSuite, SuiteTemplate
 */

export const SuiteTemplate = {
  name: '',
  csv: '',
  setup: async () => {},
  teardown: async () => {},
  test: async (params, ctx) => {}
}

export function defineSuite(name, config) {
  const suite = { ...SuiteTemplate, name, ...config }

  suite.run = async (params) => {
    const ctx = await suite.setup()
    try {
      await suite.test(params, ctx)
    } finally {
      await suite.teardown(ctx)
    }
  }

  return suite
}

export function createSuites(defs) {
  return Object.entries(defs).map(([name, cfg]) => defineSuite(name, { ...cfg, csv: `./cases/${name}.csv` }))
}
