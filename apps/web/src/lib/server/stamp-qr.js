import QRCode from 'qrcode';

/**
 * PNG del QR que ya firmó la API. El navegador no vuelve a firmar el texto.
 * @param {unknown} payload
 */
export async function stampQrDataUrl(payload) {
	if (typeof payload !== 'string' || !payload) return null;
	try {
		return await QRCode.toDataURL(payload, {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 280
		});
	} catch {
		return null;
	}
}
