// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Role } from '@satet/shared';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Se poblará en `hooks.server.ts` a partir de la cookie de sesión (Módulo 01). */
			user: { id: string; email: string; role: Role } | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
