const MEDIA_TYPES = {
	'image/jpeg': 'image/jpeg',
	'image/jpg': 'image/jpeg',
	'image/png': 'image/png',
	'application/pdf': 'application/pdf'
};

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
	const mediaType = MEDIA_TYPES[file.type];
	if (!mediaType) {
		return { error: 'El comprobante debe ser JPEG, PNG o PDF.' };
	}
	const content = Buffer.from(await file.arrayBuffer());
	const fileName = (file.name || 'comprobante').replace(/[/\\]/g, '').slice(0, 120);
	return {
		voucher: {
			fileName: fileName || 'comprobante',
			mediaType,
			contentBase64: content.toString('base64')
		}
	};
}
