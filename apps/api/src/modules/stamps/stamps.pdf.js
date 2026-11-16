import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const staticDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../web/static');
const SATET_LOGO = join(staticDir, 'satet-sidebar.png');
const GOV_LOGO = join(staticDir, 'gobernacion-blanco.png');

const FOREST = '#0f2e22';
const GREEN = '#1f6b45';
const INK = '#14211a';
const MUTED = '#5c6b62';
const PAPER = '#f7fbf8';
const LINE = '#d5e6db';
const GOLD = '#d4b483';

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

/** @param {string | number | null | undefined} value @param {number} digits */
function money(value, digits) {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return String(value ?? '');
	const [whole, fraction] = amount.toFixed(digits).split('.');
	return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction}`;
}

/** @param {string | null | undefined} iso */
function issuedLabel(iso) {
	const date = new Date(String(iso ?? ''));
	if (Number.isNaN(date.getTime())) return String(iso ?? '');
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'America/Caracas',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);
	const pick = (type) => parts.find((part) => part.type === type)?.value ?? '';
	return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}`;
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {number} pageWidth
 */
function drawHeader(doc, pageWidth) {
	const band = 96;
	doc.rect(0, 0, pageWidth, band).fill(FOREST);
	doc.rect(0, band, pageWidth, 3).fill(GOLD);
	doc.rect(0, band + 3, pageWidth, 4).fill(GREEN);
	const satetHeight = 68;
	const govHeight = 36;
	const govWidth = govHeight * (1600 / 272);
	doc.image(SATET_LOGO, 26, (band - satetHeight) / 2, { height: satetHeight });
	doc.image(GOV_LOGO, pageWidth - 26 - govWidth, (band - govHeight) / 2, { height: govHeight });
	return band + 22;
}

/**
 * @param {{
 *   uuid: string,
 *   rif: string,
 *   taxpayer: string,
 *   concept?: string,
 *   feeCode?: string,
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
			margin: 36,
			compress: false,
			bufferPages: true,
			info: {
				Title: 'Timbre fiscal electrónico',
				Author: 'SATET — Gobernación del Estado Trujillo'
			}
		});
		const chunks = [];
		doc.on('data', (chunk) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		const left = 36;
		const pageWidth = doc.page.width;
		const contentWidth = pageWidth - left * 2;
		let y = drawHeader(doc, pageWidth);

		doc.fillColor(INK).font('Helvetica-Bold').fontSize(18);
		doc.text('Timbre fiscal electrónico', left, y, { width: contentWidth });
		y = doc.y + 4;
		doc.fillColor(MUTED).font('Helvetica').fontSize(10);
		doc.text(
			'Documento de timbre fiscal. El código QR está firmado y permite comprobar su autenticidad.',
			left,
			y,
			{ width: contentWidth }
		);
		y = doc.y + 14;

		const facts = [
			['Serial', stamp.uuid],
			['Estado', STATUS_LABELS[stamp.status] ?? stamp.status],
			['Contribuyente', stamp.taxpayer],
			['RIF', stamp.rif],
			['Concepto', stamp.concept || stamp.feeCode || '—'],
			['Código', stamp.feeCode || '—'],
			['Euros', `${money(stamp.amountEur, 2)} EUR`],
			['Tasa BCV', `${money(stamp.bcvRate, 4)} VED`],
			['Emitido', issuedLabel(stamp.issuedAt)]
		];
		const gap = 8;
		const columnWidth = (contentWidth - gap) / 2;
		for (let index = 0; index < facts.length; index += 2) {
			const pair = facts.slice(index, index + 2);
			const rowHeight = 46;
			pair.forEach(([label, value], column) => {
				const x = left + column * (columnWidth + gap);
				doc.roundedRect(x, y, columnWidth, rowHeight, 8).fill(PAPER);
				doc.roundedRect(x, y, 3, rowHeight, 1).fill(GREEN);
				doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8);
				doc.text(label.toUpperCase(), x + 12, y + 8, { width: columnWidth - 22, lineBreak: false });
				doc.fillColor(INK).font('Helvetica').fontSize(11);
				doc.text(String(value), x + 12, y + 22, { width: columnWidth - 22, lineBreak: false });
			});
			y += rowHeight + gap;
		}

		const qrSize = 148;
		const boxHeight = 176;
		doc.roundedRect(left, y + 6, contentWidth, boxHeight, 10).fill(PAPER);
		doc.image(png, left + 16, y + 20, { width: qrSize });
		const textX = left + qrSize + 40;
		doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8);
		doc.text('MONTO A PAGAR', textX, y + 36, { width: contentWidth - qrSize - 64, lineBreak: false });
		doc.fillColor(FOREST).font('Helvetica-Bold').fontSize(22);
		doc.text(`${money(stamp.amountVed, 2)} VED`, textX, y + 54, {
			width: contentWidth - qrSize - 64
		});
		doc.fillColor(MUTED).font('Helvetica').fontSize(10);
		doc.text('El QR contiene el serial, el RIF y el monto firmados por el SATET.', textX, y + 96, {
			width: contentWidth - qrSize - 64
		});

		doc.page.margins.bottom = 10;
		const footerY = doc.page.height - 32;
		doc.moveTo(left, footerY).lineTo(left + contentWidth, footerY).strokeColor(LINE).lineWidth(0.8).stroke();
		doc.fillColor(MUTED).font('Helvetica').fontSize(8);
		doc.text('Gobernación del Estado Trujillo · SATET', left, footerY + 8, {
			width: contentWidth,
			lineBreak: false
		});
		doc.end();
	});
}

/** @param {Parameters<typeof renderPdf>[0]} stamp */
export async function renderStampPdf(stamp) {
	const png = await createStampQrPng(stamp.qrPayload);
	return renderPdf(stamp, png);
}
