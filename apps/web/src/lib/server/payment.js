const MEDIA_TYPES = {
	'image/jpeg': 'image/jpeg',
	'image/jpg': 'image/jpeg',
	'image/pjpeg': 'image/jpeg',
	'image/png': 'image/png',
	'image/x-png': 'image/png',
	'application/pdf': 'application/pdf'
};

/** @param {Buffer} content */
function sniffMediaType(content) {
	if (content.length >= 2 && content[0] === 0xff && content[1] === 0xd8) return 'image/jpeg';
	if (
		content.length >= 8 &&
		content[0] === 0x89 &&
		content[1] === 0x50 &&
		content[2] === 0x4e &&
		content[3] === 0x47
	) {
		return 'image/png';
	}
	if (content.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
	return null;
}

/** @param {FormData} data @param {string} name */
export function text(data, name) {
	return String(data.get(name) ?? '').trim();
}

/**
 * Lee el comprobante del formulario. `error` es un mensaje para el usuario.
 * @param {FormData} data
 */
export async function readVoucherField(data) {
	const file = data.get('voucher');
	if (!(file instanceof File) || file.size === 0) {
		return { error: 'Adjunta el comprobante de pago (JPEG, PNG o PDF).' };
	}
	if (file.size > 2_000_000) {
		return { error: 'El comprobante debe ser una imagen o un PDF de hasta 2 MB.' };
	}
	const content = Buffer.from(await file.arrayBuffer());
	const declared =
		MEDIA_TYPES[
			String(file.type || '')
				.split(';')[0]
				.trim()
				.toLowerCase()
		] ?? null;
	const sniffed = sniffMediaType(content);
	// El celular a veces manda la foto como octet-stream o sin tipo. La firma manda.
	if (!sniffed || (declared && declared !== sniffed)) {
		return { error: 'El comprobante debe ser JPEG, PNG o PDF.' };
	}
	const mediaType = declared ?? sniffed;
	const fileName = (file.name || 'comprobante').replace(/[/\\]/g, '').slice(0, 120);
	return {
		voucher: {
			fileName: fileName || 'comprobante',
			mediaType,
			contentBase64: content.toString('base64')
		}
	};
}
