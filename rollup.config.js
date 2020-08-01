import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2'
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";

import pkg from './package.json'

const config = {
    input: './index.ts',
    external: ['fs', 'util', 'events', 'url', 'assert', 'stream', 'path', 'os', 'tty', 'timers', 'crypto'],
    output: [
        {
            file: pkg.main,
            format: 'cjs'
        },
    ],
    plugins: [
        typescript({
            tsconfig: 'tsconfig.json',
            clean: true
        }),
        nodeResolve({
            preferBuiltins: true
        }),
        commonjs(),
    ],
    onwarn: (warning, rollupWarn) => {
        if (warning.code !== 'CIRCULAR_DEPENDENCY') {
          rollupWarn(warning);
        }
    }
}

if (process.env.NODE_ENV === 'production') {
    config.plugins.push(terser());
}

export default config