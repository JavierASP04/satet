/** Pendiente (Módulo 01): redirigir a /login si `locals.user` es null. */
export const load = async ({ locals }) => {
	return { user: locals.user };
};
