import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/reducer/immer.ts', 'src/jotai/atomWithReducerify.ts'],
  format: ['esm'],
  fixedExtension: false,
  outExtensions() {
    return { js: '.js', dts: '.d.ts' };
  },
});
