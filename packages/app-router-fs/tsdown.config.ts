import { type Options, defineConfig } from 'tsdown'

const config: Options = {
  entry: ['./src/**/!(*.test).ts'],
  outDir: './dist',
  format: ['esm'],
  target: 'es2020',
  ignoreWatch: ['**/dist/**', '**/node_modules/**', '*.test.ts'],
  clean: true,
  // minify: false,
  bundle: false,
  dts: true,
  sourcemap: true,
  treeshake: true,
  skipNodeModulesBundle: true,
  external: ['node_modules'],
  // @ts-expect-error - splitting is not supported by tsdown yet, but it's WIP
  splitting: true,
}

export default defineConfig([config])
