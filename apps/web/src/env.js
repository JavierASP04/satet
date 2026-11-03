import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	API_URL: {
		description: 'URL base de la API de SATET, usada desde el servidor de SvelteKit.',
		schema: (value) => value || 'http://localhost:4390'
	}
});
