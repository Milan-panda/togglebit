import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react'],
    treeshake: true,
    minify: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { server: 'src/server.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    treeshake: true,
    minify: true,
    sourcemap: true,
  },
])
