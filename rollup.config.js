import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
// import { terser } from 'rollup-plugin-terser';

import webWorkerLoader from 'rollup-plugin-web-worker-loader';

// const path = require('path');
// const packageJson = require('./package.json');
const eslint = require('rollup-plugin-eslint').eslint;

const production = !process.env.ROLLUP_WATCH;
const ver = 'forest_1.0';
// const outputName = `${packageJson.name}_${packageJson.version}`;
//const JS_OUTPUT = `${outputName}.js`;

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'public/' + ver + '.js'
	},
	plugins: [
		svelte({
			// enable run-time checks when not in production
			dev: !production,
			// we'll extract any component CSS out into
			// a separate file — better for performance
			css: css => {
				css.write('public/' + ver + '.css');
			}
		}),
        webWorkerLoader({
			// sourcemap?: boolean,        // when inlined, should a source map be included in the final output. Default: false
			// inline?: boolean,           // should the worker code be inlined (Base64). Default: true
			// preserveSource?: boolean,   // when inlined and this option is enabled, the full source code is included in the
										// built file, otherwise it's embedded as a base64 string. Default: false
			loadPath: 'src/worker'           // this options is useful when the worker scripts need to be loaded from another folder.
										// Default: ''
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration —
		// consult the documentation for details:
		// https://github.com/rollup/rollup-plugin-commonjs
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),
        // eslint(),
		commonjs(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		// production && terser()
	],
	watch: {
		clearScreen: false
	}
};
