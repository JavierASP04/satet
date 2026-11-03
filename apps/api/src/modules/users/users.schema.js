import { z } from 'zod';

export const createVerifierSchema = z.object({
	email: z.string().trim().toLowerCase().max(255).email('Correo inválido.'),
	password: z
		.string()
		.min(8, 'La contraseña debe tener al menos 8 caracteres.')
		.max(72, 'La contraseña no puede superar 72 caracteres.')
});
