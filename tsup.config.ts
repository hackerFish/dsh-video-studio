import { defineConfig } from 'tsup'
import { fileURLToPath } from 'node:url'

const JSX_SHIM = fileURLToPath(new URL('./src/client/jsx-runtime-shim.ts', import.meta.url)).replace(/\\/g, '/')

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
    external: ['react', 'react-dom'], // react/jsx-runtime 由 alias 指向本地 shim
    noExternal: ['@xyflow/react'], // React Flow 打进客户端包（宿主只提供 react）
    esbuildOptions: (options) => {
      options.alias = { ...(options.alias ?? {}), 'react/jsx-runtime': JSX_SHIM }
    },
    sourcemap: false,
  },
])
