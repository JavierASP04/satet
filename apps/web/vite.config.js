import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// El .env compartido vive en la raíz del monorepo.
			env: { dir: '../..' }
		})
	],
	server: { host: '0.0.0.0', port: 5390, strictPort: true },
	preview: { host: '0.0.0.0', port: 5390, strictPort: true }
});
