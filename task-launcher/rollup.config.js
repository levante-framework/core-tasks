import commonjs from '@rollup/plugin-commonjs';
import dsv from '@rollup/plugin-dsv';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.js',
  plugins: [
    postcss({
      extract: 'resources/core-tasks.css',
    }),
    dsv(),
    json(),
    nodeResolve({
      preferBuiltins: true,
    }),
    terser(),
    commonjs(),
  ],
  output: [
    {
      dir: 'lib',
      name: 'core-tasks',
      entryFileNames: '[name].[hash].js',
      chunkFileNames: '[name].[hash].js',
      format: 'es',
    },
  ],
};
