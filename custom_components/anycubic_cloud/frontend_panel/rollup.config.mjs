import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';

export default {
  plugins: [
    resolve(),
    commonjs({
      include: 'node_modules/**'
    }),
    typescript(),
    json(),
    babel(),
    terser({
      ecma: 2021,
      module: true,
      warnings: true,
    }),
  ],
  input: 'src/anycubic-cloud-panel.ts',
  output: {
    dir: 'dist',
    format: 'iife',
    sourcemap: false
  },
  context: 'window',
  preserveEntrySignatures: 'strict',
};