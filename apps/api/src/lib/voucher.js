import { ERROR_CODES } from '@satet/shared';
import { HttpError } from './http.js';

const MAX_BYTES = 2_000_000;

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

	const content = Buffer.from(voucher.contentBase64, 'base64');
	if (content.length === 0 || content.length > MAX_BYTES) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El comprobante debe ser una imagen o un PDF de hasta 2 MB.'
		);
	}
	if (!matches(voucher.mediaType, content)) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El comprobante no coincide con el tipo indicado (JPEG, PNG o PDF).'
		);
	}

	return { fileName, mediaType: voucher.mediaType, content };
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
