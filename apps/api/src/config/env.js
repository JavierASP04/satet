import { z } from 'zod';
import { DEFAULT_SESSION_COOKIE } from '@satet/shared';
import { durationToMs } from '../lib/duration.js';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	API_PORT: z.coerce.number().int().positive().default(4390),
	WEB_ORIGIN: z.url().default('http://localhost:5390'),
	DATABASE_URL: z.string().default('postgres://satet:satet@localhost:5433/satet'),
	REDIS_URL: z.string().default('redis://localhost:6380'),
	JWT_SECRET: z.string().min(1).default('dev-only-secret'),
	JWT_EXPIRES_IN: z
		.string()
		.default('8h')
		.refine((value) => durationToMs(value) !== null, {
			error: 'Use segundos enteros o un número con sufijo s, m, h o d (ejemplo: 8h).'
		}),
	SESSION_COOKIE_NAME: z.string().min(1).default(DEFAULT_SESSION_COOKIE),
	SESSION_COOKIE_SECURE: z
		.enum(['true', 'false'])
		.default('false')
		.transform((value) => value === 'true')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('[api] Variables de entorno inválidas:', z.prettifyError(parsed.error));
	process.exit(1);
}

export const env = parsed.data;
