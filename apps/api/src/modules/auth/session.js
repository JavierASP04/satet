import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { durationToMs } from '../../lib/duration.js';

const SAME_SITE = 'lax';

function cookieOptions() {
	return {
		httpOnly: true,
		secure: env.SESSION_COOKIE_SECURE,
		sameSite: SAME_SITE,
		path: '/'
	};
}

/** @param {string} userId */
export function signSessionToken(userId) {
	return jwt.sign({}, env.JWT_SECRET, {
		subject: userId,
		expiresIn: env.JWT_EXPIRES_IN,
		algorithm: 'HS256'
	});
}

/** @param {string} token */
export function verifySessionToken(token) {
	return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

/** @param {import('express').Response} res @param {string} token */
export function setSessionCookie(res, token) {
	const maxAge = durationToMs(env.JWT_EXPIRES_IN);
	res.cookie(env.SESSION_COOKIE_NAME, token, {
		...cookieOptions(),
		maxAge: maxAge ?? undefined
	});
}

/** @param {import('express').Response} res */
export function clearSessionCookie(res) {
	res.clearCookie(env.SESSION_COOKIE_NAME, cookieOptions());
}

/** @param {import('express').Request} req */
export function readSessionToken(req) {
	const header = req.headers.cookie;
	if (!header) return null;

	for (const part of header.split(';')) {
		const separator = part.indexOf('=');
		if (separator === -1) continue;
		const key = part.slice(0, separator).trim();
		if (key !== env.SESSION_COOKIE_NAME) continue;

		const raw = part.slice(separator + 1).trim();
		if (!raw) return null;
		try {
			return decodeURIComponent(raw);
		} catch {
			return raw;
		}
	}

	return null;
}
