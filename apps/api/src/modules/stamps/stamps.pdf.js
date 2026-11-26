import { STAMP_VALIDITY_DAYS } from '@satet/shared';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const STATUS_LABELS = {
	SOLICITADO: 'Solicitado',
	ACTIVO: 'Activo',
	CONSUMIDO: 'Consumido',
	ANULADO: 'Anulado',
	RECHAZADO: 'Rechazado'
};

/** @param {string} payload */
export function createStampQrPng(payload) {
	return QRCode.toBuffer(payload, {
		type: 'png',
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 280
	});
}

/**
 * @param {{
 *   uuid: string,
 *   rif: string,
 *   taxpayer: string,
 *   amountEur: string,
 *   bcvRate: string,
 *   amountVed: string,
 *   issuedAt: string,
 *   status: string,
 *   qrPayload: string
 * }} stamp
 * @param {Buffer} png
 */
function renderPdf(stamp, png) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margin: 56,
			compress: false,
			info: {
				Title: 'Timbre fiscal electrónico',
				Author: 'SATET — Gobernación del Estado Trujillo'
			}
		});
		const chunks = [];
		doc.on('data', (chunk) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc
			.font('Helvetica-Bold')
			.fontSize(12)
			.fillColor('#6e2430')
			.text('GOBERNACIÓN DEL ESTADO TRUJILLO');
		doc.moveDown(0.35);
		doc.font('Helvetica-Bold').fontSize(20).fillColor('#1c1c1c').text('Timbre fiscal electrónico');
		doc.moveDown(0.25);
		doc
			.font('Helvetica')
			.fontSize(11)
			.fillColor('#444444')
			.text(
				'Documento de timbre fiscal. El código QR está firmado y permite comprobar su autenticidad.'
			);
		doc.moveDown(1);

		const rows = [
			['Serial', stamp.uuid],
			['Contribuyente', stamp.taxpayer],
			['RIF', stamp.rif],
			...(stamp.concept ? [['Concepto', stamp.concept]] : []),
			['Monto', `${stamp.amountEur} EUR`],
			['Tasa BCV', `${stamp.bcvRate} VED por euro`],
			['Bolívares', `${stamp.amountVed} VED`],
			['Emitido', stamp.issuedAt],
			['Caducidad', expiryLabel(stamp.issuedAt)],
			['Vigencia', `${STAMP_VALIDITY_DAYS} días`],
			['Estado', STATUS_LABELS[stamp.status] ?? stamp.status]
		];
		for (const [label, value] of rows) {
			doc.font('Helvetica-Bold').fontSize(10).fillColor('#6e2430').text(label);
			doc.font('Helvetica').fontSize(12).fillColor('#1c1c1c').text(String(value));
			doc.moveDown(0.4);
		}

		doc.moveDown(0.3);
		doc.image(png, { width: 180 });
		doc.end();
	});
}

/**
 * La vigencia corre 15 días desde el instante de emisión.
 * @param {string} issuedAt
 * @param {Date} [now]
 */
export function stampValidity(issuedAt, now = new Date()) {
	const issued = new Date(issuedAt);
	const expires = new Date(issued.getTime() + STAMP_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
	const remainingMs = expires.getTime() - now.getTime();
	return {
		expiresAt: expires.toISOString(),
		daysRemaining: remainingMs <= 0 ? 0 : Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
		validityDays: STAMP_VALIDITY_DAYS,
		expiresLabel: expiryLabel(issuedAt),
		expired: remainingMs <= 0
	};
}

/** @param {string} issuedAt */
function expiryLabel(issuedAt) {
	const expires = new Date(new Date(issuedAt).getTime() + STAMP_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
	return new Intl.DateTimeFormat('es-VE', {
		dateStyle: 'long',
		timeZone: 'America/Caracas'
	}).format(expires);
}

/**
 * @param {Parameters<typeof renderPdf>[0]} stamp
 * @param {string} [qrText]
 */
export async function renderStampPdf(stamp, qrText = stamp.qrPayload) {
	const png = await createStampQrPng(qrText);
	return renderPdf(stamp, png);
}
