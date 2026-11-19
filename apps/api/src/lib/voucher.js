import { ERROR_CODES } from '@satet/shared';
import { HttpError } from './http.js';

const MAX_BYTES = 2_000_000;

const CANONICAL_TYPES = new Map([
	['image/jpeg', 'image/jpeg'],
	['image/jpg', 'image/jpeg'],
	['image/pjpeg', 'image/jpeg'],
	['image/png', 'image/png'],
	['image/x-png', 'image/png'],
	['application/pdf', 'application/pdf']
]);

/**
 * `image/jpg` y `image/pjpeg` son el mismo JPEG. El resto de alias vuelve al tipo canónico.
 * @param {string} mediaType
 * @returns {'image/jpeg' | 'image/png' | 'application/pdf' | null}
 */
export function normalizeVoucherMediaType(mediaType) {
	const raw = String(mediaType ?? '')
		.split(';')[0]
		.trim()
		.toLowerCase();
	return CANONICAL_TYPES.get(raw) ?? null;
}

/**
 * @param {string} contentBase64
 */
function decodeContent(contentBase64) {
	let raw = String(contentBase64 ?? '').trim();
	const marker = ';base64,';
	if (raw.startsWith('data:')) {
		const at = raw.indexOf(marker);
		if (at !== -1) raw = raw.slice(at + marker.length);
	}
	return Buffer.from(raw, 'base64');
}

/**
 * @param {{ fileName: string, mediaType: string, contentBase64: string }} voucher
 */
export function readVoucher(voucher) {
	const fileName = voucher.fileName.replace(/[/\\]/g, '').replace(/^\.+/, '').slice(0, 120);
	if (!fileName) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El comprobante no tiene un nombre válido.'
		);
	}

	const content = decodeContent(voucher.contentBase64);
	if (content.length === 0 || content.length > MAX_BYTES) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El comprobante debe ser una imagen o un PDF de hasta 2 MB.'
		);
	}
	const mediaType = normalizeVoucherMediaType(voucher.mediaType);
	if (!mediaType || !matches(mediaType, content)) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El comprobante no coincide con el tipo indicado (JPEG, PNG o PDF).'
		);
	}

	return { fileName, mediaType, content };
}

/** @param {string} mediaType @param {Buffer} content */
function matches(mediaType, content) {
	if (mediaType === 'application/pdf') return content.subarray(0, 4).toString() === '%PDF';
	if (mediaType === 'image/png') {
		return content.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
	}
	if (mediaType === 'image/jpeg') return content[0] === 0xff && content[1] === 0xd8;
	return false;
}
