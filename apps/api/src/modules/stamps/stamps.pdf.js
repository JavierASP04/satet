import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const STATUS_LABELS = {
	ACTIVO: 'Activo',
	CONSUMIDO: 'Consumido',
	ANULADO: 'Anulado'
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
			['Monto', `${stamp.amountEur} EUR`],
			['Tasa BCV', `${stamp.bcvRate} VED por euro`],
			['Bolívares', `${stamp.amountVed} VED`],
			['Emitido', stamp.issuedAt],
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

/** @param {Parameters<typeof renderPdf>[0]} stamp */
export async function renderStampPdf(stamp) {
	const png = await createStampQrPng(stamp.qrPayload);
	return renderPdf(stamp, png);
}
