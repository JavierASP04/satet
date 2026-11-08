import { sessionCookieOptions } from './session.js';

const COOKIE = 'satet_issued_stamps';
const MAX = 6;

/**
 * Timbres emitidos en esta sesión. La API no tiene listado de la cuenta.
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export function readIssuedStamps(cookies) {
	const raw = cookies.get(COOKIE);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isIssuedStamp);
	} catch {
		return [];
	}
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {URL} url
 * @param {Record<string, unknown>} stamp
 */
export function rememberIssuedStamp(cookies, url, stamp) {
	const next = slim(stamp);
	if (!next) return;
	const kept = readIssuedStamps(cookies).filter((item) => item.uuid !== next.uuid);
	cookies.set(COOKIE, JSON.stringify([next, ...kept].slice(0, MAX)), sessionCookieOptions(url));
}

/** @param {import('@sveltejs/kit').Cookies} cookies @param {URL} url */
export function clearIssuedStamps(cookies, url) {
	cookies.delete(COOKIE, { path: '/', secure: url.protocol === 'https:' });
}

/** @param {unknown} value */
function isIssuedStamp(value) {
	if (!value || typeof value !== 'object') return false;
	const stamp = /** @type {Record<string, unknown>} */ (value);
	return (
		typeof stamp.uuid === 'string' &&
		typeof stamp.amountEur === 'string' &&
		typeof stamp.amountVed === 'string' &&
		typeof stamp.status === 'string'
	);
}

/** @param {Record<string, unknown>} stamp */
function slim(stamp) {
	if (typeof stamp.uuid !== 'string' || typeof stamp.amountEur !== 'string') return null;
	return {
		uuid: stamp.uuid,
		feeCode: typeof stamp.feeCode === 'string' ? stamp.feeCode : '',
		concept: typeof stamp.concept === 'string' ? stamp.concept.slice(0, 160) : '',
		amountEur: stamp.amountEur,
		amountVed: typeof stamp.amountVed === 'string' ? stamp.amountVed : '',
		bcvRate: typeof stamp.bcvRate === 'string' ? stamp.bcvRate : '',
		issuedAt: typeof stamp.issuedAt === 'string' ? stamp.issuedAt : '',
		status: typeof stamp.status === 'string' ? stamp.status : 'ACTIVO',
		rif: typeof stamp.rif === 'string' ? stamp.rif : '',
		taxpayer: typeof stamp.taxpayer === 'string' ? stamp.taxpayer.slice(0, 120) : ''
	};
}
