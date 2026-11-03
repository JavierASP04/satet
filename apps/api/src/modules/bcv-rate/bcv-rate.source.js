import https from 'node:https';
import tls from 'node:tls';
import { readFileSync } from 'node:fs';
import { BCV_RATE_SOURCE_URL, CURRENCY } from '@satet/shared';
import { bcvQuoteSchema } from './bcv-rate.schema.js';

/**
 * El sitio del BCV presenta un certificado de Sectigo pero no envía el intermedio
 * "Sectigo Public Server Authentication CA DV R36" (válido hasta 2036-03-21,
 * SHA-256 8C:54:C3:34:B6:6B:A4:E4:26:77:2A:F4:A3:F9:13:6C:19:A1:AE:C7:29:FD:B2:8C:53:5C:07:A5:A4:EF:22:E0).
 * Se confía en ese intermedio público junto con las raíces del sistema. No se desactiva la verificación TLS.
 */
const ISSUER_PEM = readFileSync(
	new URL('./certs/sectigo-public-server-authentication-ca-dv-r36.pem', import.meta.url),
	'utf8'
);

const trustedCa = [...tls.rootCertificates, ISSUER_PEM];
const MAX_BODY_BYTES = 2_000_000;

/**
 * Convierte el texto publicado por el BCV a 4 decimales.
 * El BCV usa coma decimal. Si hay punto, se trata como separador de miles.
 * @param {string} raw
 */
export function normalizeBcvRate(raw) {
	const trimmed = String(raw).trim().replace(/\s/g, '');
	if (!trimmed) throw new Error('La tasa BCV está vacía.');

	let normalized;
	if (trimmed.includes(',')) {
		if (!/^\d{1,3}(?:\.\d{3})*,\d+$|^\d+,\d+$/.test(trimmed)) {
			throw new Error('La tasa BCV no tiene un formato numérico reconocible.');
		}
		normalized = trimmed.replace(/\./g, '').replace(',', '.');
	} else if (!/^\d+(\.\d+)?$/.test(trimmed)) {
		throw new Error('La tasa BCV no tiene un formato numérico reconocible.');
	} else {
		normalized = trimmed;
	}

	const [wholeRaw, fracRaw = ''] = normalized.split('.');
	if (wholeRaw.length > 8) {
		throw new Error('La tasa BCV excede la precisión de bcv_rates.rate_in_ved.');
	}

	const digits = `${fracRaw}00000`.slice(0, 5);
	let frac = BigInt(digits.slice(0, 4));
	let whole = BigInt(wholeRaw);
	if (digits[4] >= '5') {
		frac += 1n;
		if (frac === 10000n) {
			frac = 0n;
			whole += 1n;
		}
	}
	if (whole.toString().length > 8) {
		throw new Error('La tasa BCV excede la precisión de bcv_rates.rate_in_ved.');
	}

	const rateInVed = `${whole}.${frac.toString().padStart(4, '0')}`;
	const parsed = bcvQuoteSchema.safeParse({ currency: CURRENCY.EUR, rateInVed });
	if (!parsed.success) throw new Error('La tasa BCV debe ser mayor que cero.');
	return parsed.data.rateInVed;
}

/**
 * Lee el bloque `#euro` de la página del BCV.
 * @param {string} html
 * @returns {{ currency: 'EUR', rateInVed: string }}
 */
export function parseBcvEuroHtml(html) {
	if (typeof html !== 'string' || html.length === 0) {
		throw new Error('La respuesta del BCV está vacía.');
	}
	const marker = html.search(/id=["']euro["']/i);
	if (marker < 0) throw new Error('El BCV no publicó el bloque de la tasa euro.');

	const slice = html.slice(marker, marker + 2500).replace(/&nbsp;|\u00a0/g, ' ');
	const strong = slice.match(
		/<strong[^>]*>\s*([0-9][0-9.]*,[0-9]+|[0-9]+(?:\.[0-9]+)?)\s*<\/strong>/i
	);
	if (!strong) throw new Error('El BCV no publicó un monto para el euro.');

	return { currency: CURRENCY.EUR, rateInVed: normalizeBcvRate(strong[1]) };
}

/**
 * GET de texto contra el BCV, con el intermedio que falta en el handshake.
 * @param {string} url
 */
export function getBcvText(url) {
	return new Promise((resolve, reject) => {
		let settled = false;
		const fail = (err) => {
			if (settled) return;
			settled = true;
			reject(err);
		};
		const succeed = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const req = https.get(
			url,
			{
				ca: trustedCa,
				headers: {
					accept: 'text/html',
					'user-agent': 'SATET/1.0 (consulta tasa EUR)'
				},
				timeout: 20_000
			},
			(res) => {
				const chunks = [];
				let size = 0;
				res.on('data', (chunk) => {
					size += chunk.length;
					if (size > MAX_BODY_BYTES) {
						req.destroy(new Error('La respuesta del BCV supera el tamaño admitido.'));
						return;
					}
					chunks.push(chunk);
				});
				res.on('end', () => {
					if (size > MAX_BODY_BYTES) {
						fail(new Error('La respuesta del BCV supera el tamaño admitido.'));
						return;
					}
					succeed({
						ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
						status: res.statusCode ?? 0,
						body: Buffer.concat(chunks).toString('utf8')
					});
				});
				res.on('error', fail);
			}
		);
		req.on('timeout', () => {
			req.destroy(new Error('Tiempo de espera agotado al consultar el BCV.'));
		});
		req.on('error', fail);
	});
}

/**
 * Consulta la tasa oficial. Las pruebas pueden pasar `html` o `requestImpl` y no usan la red.
 * @param {{ html?: string, requestImpl?: (url: string) => Promise<{ ok: boolean, status: number, body?: string, text?: () => Promise<string> }>, url?: string }} [options]
 */
export async function fetchOfficialBcvEuroRate(options = {}) {
	const requestImpl = options.requestImpl ?? getBcvText;
	const url = options.url ?? BCV_RATE_SOURCE_URL;
	let body = options.html;
	if (body == null) {
		const response = await requestImpl(url);
		if (!response.ok) throw new Error(`El BCV respondió HTTP ${response.status}.`);
		if (typeof response.body === 'string') body = response.body;
		else if (typeof response.text === 'function') body = await response.text();
		else throw new Error('La respuesta del BCV no tiene cuerpo.');
	}
	return parseBcvEuroHtml(body);
}
