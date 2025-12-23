import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'

const production = !process.env.ROLLUP_WATCH

export default [
  // Main bundle
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/konomi-p2p.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/konomi-p2p.min.js',
        format: 'esm',
        plugins: [terser()],
        sourcemap: true
      },
      {
        file: 'dist/konomi-p2p.umd.js',
        format: 'umd',
        name: 'KonomiP2P',
        sourcemap: true
      }
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      json()
    ],
    external: []
  },

  // Service worker bundle (separate)
  {
    input: 'src/sw/service-worker.js',
    output: {
      file: 'dist/service-worker.js',
      format: 'iife',
      sourcemap: true
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      production && terser()
    ].filter(Boolean)
  }
]
