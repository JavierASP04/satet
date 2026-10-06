import type { LayoutServerLoad } from './$types';

/** Pendiente (Módulo 01): redirigir a /login si `locals.user` es null. */
export const load: LayoutServerLoad = async ({ locals }) => {
	return { user: locals.user };
};
