import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { 'host/index': 'src/host/index.ts' },
    format: ['esm'],
    outDir: 'lib',
    outExtension: () => ({ js: '.mjs' }),
    platform: 'node',
    target: 'node22',
    bundle: true,
    clean: true,
    sourcemap: false,
  },
  {
    entry: { 'client/index': 'src/client/index.ts' },
    format: ['cjs'],
    outDir: 'lib',
    outExtension: () => ({ js: '.js' }),
    platform: 'browser',
    target: 'es2022',
    bundle: true,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    sourcemap: false,
  },
])
