import type { Handle } from '@sveltejs/kit/hooks';

/** Pendiente (Módulo 01): validar la cookie `satet_session` contra la API y poblar `locals.user`. */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	return resolve(event);
};
