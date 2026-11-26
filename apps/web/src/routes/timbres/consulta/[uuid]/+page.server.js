import { API_URL } from '$app/env/private';
import { API_PREFIX } from '@satet/shared';
import { error } from '@sveltejs/kit';

export const load = async ({ fetch, params }) => {
	const response = await fetch(`${API_URL}${API_PREFIX}/stamps/public/${params.uuid}`);
	if (!response.ok) error(response.status, 'No se encontró el timbre.');
	return { stamp: await response.json() };
};
