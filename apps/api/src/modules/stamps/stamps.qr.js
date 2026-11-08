import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { formatFixed } from '../../lib/present.js';

const KEYS = ['uuid', 'rif', 'taxpayer', 'amount_eur', 'bcv_rate', 'amount_ved', 'issued_at'];

/**
 * JSON canónico del timbre, sin firma. El orden de las claves es el de la especificación.
 * @param {{
 *   uuid: string,
 *   rif: string,
 *   taxpayer: string,
 *   amountEur: string | number,
 *   bcvRate: string | number,
 *   amountVed: string | number,
 *   issuedAt: string
 * }} fields
 */
export function canonicalStampJson(fields) {
	return JSON.stringify({
		uuid: fields.uuid,
		rif: fields.rif,
		taxpayer: fields.taxpayer,
		amount_eur: Number(formatFixed(fields.amountEur, 2)),
		bcv_rate: Number(formatFixed(fields.bcvRate, 4)),
		amount_ved: Number(formatFixed(fields.amountVed, 2)),
		issued_at: fields.issuedAt
	});
}

/** @param {Parameters<typeof canonicalStampJson>[0]} fields */
export function signStampQr(fields) {
	const payload = canonicalStampJson(fields);
	const sig = createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
	const document = JSON.parse(payload);
	document.sig = sig;
	return JSON.stringify(document);
}

/**
 * Devuelve los campos firmados, o null si el texto no es un QR íntegro.
 * @param {string} qrText
 */
export function verifyStampQr(qrText) {
	let parsed;
	try {
		parsed = JSON.parse(qrText);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	if (typeof parsed.sig !== 'string' || parsed.sig.length === 0) return null;

	const extra = Object.keys(parsed).filter((key) => key !== 'sig' && !KEYS.includes(key));
	if (extra.length > 0) return null;
	for (const key of KEYS) {
		if (!(key in parsed)) return null;
	}
	if (
		typeof parsed.uuid !== 'string' ||
		typeof parsed.rif !== 'string' ||
		typeof parsed.taxpayer !== 'string' ||
		typeof parsed.issued_at !== 'string'
	) {
		return null;
	}
	const amounts = [parsed.amount_eur, parsed.bcv_rate, parsed.amount_ved];
	if (!amounts.every((value) => typeof value === 'number' && Number.isFinite(value))) return null;

	let payload;
	try {
		payload = canonicalStampJson({
			uuid: parsed.uuid,
			rif: parsed.rif,
			taxpayer: parsed.taxpayer,
			amountEur: parsed.amount_eur,
			bcvRate: parsed.bcv_rate,
			amountVed: parsed.amount_ved,
			issuedAt: parsed.issued_at
		});
	} catch {
		return null;
	}

	const expected = createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
	const left = Buffer.from(parsed.sig);
	const right = Buffer.from(expected);
	if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
	return JSON.parse(payload);
}
