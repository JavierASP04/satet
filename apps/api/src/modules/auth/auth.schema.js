import { z } from 'zod';
import { DOC_TYPES, RIF_REGEX } from '@satet/shared';

const emailSchema = z.string().trim().toLowerCase().max(255).email('Correo inválido.');

const passwordSchema = z
	.string()
	.min(8, 'La contraseña debe tener al menos 8 caracteres.')
	.max(72, 'La contraseña no puede superar 72 caracteres.');

const rifSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(RIF_REGEX, 'RIF inválido. Use el formato J-12345678-9, G-12345678-9 o V-12345678-9.');

const docTypeSchema = z.enum(
	[DOC_TYPES.RIF_JURIDICO, DOC_TYPES.RIF_NATURAL, DOC_TYPES.CEDULA, DOC_TYPES.PASAPORTE],
	{ error: 'Tipo de documento inválido.' }
);

/** @param {number} max */
function requiredText(max) {
	return z.string().trim().min(1, 'Campo obligatorio.').max(max);
}

const commercialDenominationSchema = z
	.union([z.string().trim().max(255), z.null()])
	.optional()
	.transform((value) => (value ? value : null));

export const taxpayerProfileSchema = z.object({
	docType: docTypeSchema,
	rifNumber: rifSchema,
	companyName: requiredText(255),
	commercialDenomination: commercialDenominationSchema,
	fiscalAddress: requiredText(2000),
	phoneNumber: requiredText(20),
	legalRepresentativeName: requiredText(255),
	legalRepresentativeDna: requiredText(20)
});

export const registerSchema = taxpayerProfileSchema.extend({
	email: emailSchema,
	password: passwordSchema
});

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'La contraseña es obligatoria.').max(72)
});
