import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const staticDir = join(dirname(fileURLToPath(import.meta.url)), '../../../web/static');
const SATET_LOGO = join(staticDir, 'satet-sidebar.png');
const GOV_LOGO = join(staticDir, 'gobernacion-blanco.png');

const FOREST = '#0f2e22';
const GREEN = '#1f6b45';
const INK = '#14211a';
const MUTED = '#5c6b62';
const SOFT = '#e8f4ee';
const LINE = '#d5e6db';
const PAPER = '#f7fbf8';
const GOLD = '#d4b483';
const DANGER = '#9b1c1c';
const DANGER_SOFT = '#fdeceb';

/**
 * @param {{
 *   title: string,
 *   intro: string,
 *   facts: [string, string][],
 *   lines?: { title?: string, head: string[], rows: string[][], widths?: number[], align?: string[], empty?: string },
 *   tables?: { title?: string, head: string[], rows: string[][], widths?: number[], align?: string[], empty?: string }[],
 *   totalLabel: string,
 *   total: string,
 *   late?: boolean
 * }} input
 */
export function renderPlanilla(input) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margin: 36,
			compress: false,
			bufferPages: true
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
		doc.text(input.title, left, y, { width: contentWidth, lineGap: 1 });
		y = doc.y + 6;
		doc.fillColor(MUTED).font('Helvetica').fontSize(10);
		doc.text(input.intro, left, y, { width: contentWidth, lineGap: 1 });
		y = doc.y + 10;

		if (input.late) {
			const banner = 'Fuera de tiempo';
			doc.font('Helvetica-Bold').fontSize(11);
			const bannerWidth = doc.widthOfString(banner) + 22;
			doc.roundedRect(left, y, bannerWidth, 22, 6).fill(DANGER_SOFT);
			doc.fillColor(DANGER).text(banner, left + 11, y + 5, { width: bannerWidth - 16, lineBreak: false });
			y += 34;
		}

		y = drawFacts(doc, input.facts, left, y, contentWidth);
		const tables = [...(input.lines ? [input.lines] : []), ...(input.tables ?? [])];
		for (const table of tables) {
			if (table.rows.length > 0 || table.empty) {
				y = drawLines(doc, table, left, y + 8, contentWidth);
			}
		}
		drawTotal(doc, input.totalLabel, input.total, left, y + 14, contentWidth);
		stampFooters(doc, left, contentWidth);
		doc.end();
	});
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
 * @param {PDFKit.PDFDocument} doc
 * @param {[string, string][]} facts
 * @param {number} left
 * @param {number} y
 * @param {number} contentWidth
 */
function drawFacts(doc, facts, left, y, contentWidth) {
	const gap = 8;
	const columnWidth = (contentWidth - gap) / 2;
	for (let index = 0; index < facts.length; index += 2) {
		const pair = facts.slice(index, index + 2);
		const heights = pair.map(([, value]) => cellHeight(doc, value, columnWidth - 20, 11) + 28);
		const rowHeight = Math.max(...heights, 48);
		if (y + rowHeight > doc.page.height - 64) {
			doc.addPage();
			y = 36;
		}
		pair.forEach(([label, value], column) => {
			const x = left + column * (columnWidth + gap);
			doc.roundedRect(x, y, columnWidth, rowHeight, 8).fill(PAPER);
			doc.roundedRect(x, y, 3, rowHeight, 1).fill(GREEN);
			doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8);
			doc.text(label.toUpperCase(), x + 10, y + 8, { width: columnWidth - 20, lineBreak: false });
			doc.fillColor(INK).font('Helvetica').fontSize(11);
			doc.text(String(value ?? ''), x + 10, y + 22, { width: columnWidth - 20, lineGap: 1 });
		});
		y += rowHeight + gap;
	}
	return y;
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {{ title?: string, head: string[], rows: string[][], widths?: number[], align?: string[] }} lines
 * @param {number} left
 * @param {number} y
 * @param {number} contentWidth
 */
function drawLines(doc, lines, left, y, contentWidth) {
	const columns = columnWidths(lines.head.length, contentWidth, lines.widths);
	const title = lines.title || 'Detalle';
	if (y + 70 > doc.page.height - 64) {
		doc.addPage();
		y = 36;
	}
	doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8);
	doc.text(title.toUpperCase(), left, y, { width: contentWidth, characterSpacing: 0.6 });
	y = doc.y + 6;
	if (lines.rows.length === 0) {
		doc.fillColor(MUTED).font('Helvetica').fontSize(11);
		doc.text(lines.empty || 'Sin registros.', left, y, { width: contentWidth });
		return doc.y;
	}
	y = drawTableHead(doc, lines.head, columns, lines.align, left, y);
	lines.rows.forEach((row, index) => {
		const height = tableRowHeight(doc, row, columns);
		if (y + height > doc.page.height - 64) {
			doc.addPage();
			y = 36;
			y = drawTableHead(doc, lines.head, columns, lines.align, left, y);
		}
		doc.rect(left, y, contentWidth, height).fill(index % 2 === 0 ? SOFT : PAPER);
		doc.moveTo(left, y + height).lineTo(left + contentWidth, y + height).strokeColor(LINE).lineWidth(0.6).stroke();
		let x = left;
		row.forEach((cell, column) => {
			doc.fillColor(INK).font('Helvetica').fontSize(9);
			doc.text(String(cell ?? ''), x + 6, y + 7, {
				width: columns[column] - 12,
				align: lines.align?.[column] === 'right' ? 'right' : 'left',
				lineGap: 1
			});
			x += columns[column];
		});
		y += height;
	});
	return y;
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {string[]} head
 * @param {number[]} columns
 * @param {string[] | undefined} align
 * @param {number} left
 * @param {number} y
 */
function drawTableHead(doc, head, columns, align, left, y) {
	const width = columns.reduce((sum, column) => sum + column, 0);
	doc.rect(left, y, width, 24).fill(FOREST);
	let x = left;
	head.forEach((label, column) => {
		doc.fillColor('#f4faf6').font('Helvetica-Bold').fontSize(8);
		doc.text(label.toUpperCase(), x + 6, y + 8, {
			width: columns[column] - 12,
			align: align?.[column] === 'right' ? 'right' : 'left',
			lineBreak: false
		});
		x += columns[column];
	});
	return y + 24;
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {string} label
 * @param {string} total
 * @param {number} left
 * @param {number} y
 * @param {number} contentWidth
 */
function drawTotal(doc, label, total, left, y, contentWidth) {
	if (y + 58 > doc.page.height - 48) {
		doc.addPage();
		y = 36;
	}
	doc.roundedRect(left, y, contentWidth, 52, 10).fill(FOREST);
	doc.fillColor('#c5d5cb').font('Helvetica').fontSize(9);
	doc.text(label.toUpperCase(), left + 16, y + 18, { width: contentWidth * 0.4, lineBreak: false });
	doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18);
	doc.text(total, left + contentWidth * 0.38, y + 15, {
		width: contentWidth * 0.6 - 14,
		align: 'right',
		lineBreak: false
	});
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {number} left
 * @param {number} contentWidth
 */
function stampFooters(doc, left, contentWidth) {
	const issued = new Intl.DateTimeFormat('es-VE', {
		timeZone: 'America/Caracas',
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	}).format(new Date());
	const range = doc.bufferedPageRange();
	for (let index = 0; index < range.count; index += 1) {
		doc.switchToPage(index);
		doc.page.margins.bottom = 10;
		const y = doc.page.height - 32;
		doc.moveTo(left, y).lineTo(left + contentWidth, y).strokeColor(LINE).lineWidth(0.8).stroke();
		doc.fillColor(MUTED).font('Helvetica').fontSize(8);
		doc.text(`Gobernación del Estado Trujillo · SATET · ${issued}`, left, y + 8, {
			width: contentWidth - 70,
			lineBreak: false
		});
		doc.text(`${index + 1} / ${range.count}`, left + contentWidth - 60, y + 8, {
			width: 60,
			align: 'right',
			lineBreak: false
		});
	}
}

/**
 * @param {number} count
 * @param {number} total
 * @param {number[] | undefined} weights
 */
function columnWidths(count, total, weights) {
	const source = weights && weights.length === count ? weights : Array.from({ length: count }, () => 1);
	const sum = source.reduce((acc, weight) => acc + weight, 0) || 1;
	return source.map((weight) => (total * weight) / sum);
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {string} value
 * @param {number} width
 * @param {number} size
 */
function cellHeight(doc, value, width, size) {
	doc.font('Helvetica').fontSize(size);
	return doc.heightOfString(String(value ?? ' '), { width, lineGap: 1 });
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {string[]} row
 * @param {number[]} columns
 */
function tableRowHeight(doc, row, columns) {
	doc.font('Helvetica').fontSize(9);
	const tallest = row.reduce((max, cell, column) => {
		const height = doc.heightOfString(String(cell ?? ' '), {
			width: Math.max(12, columns[column] - 12),
			lineGap: 1
		});
		return Math.max(max, height);
	}, 12);
	return Math.max(26, tallest + 14);
}

/**
 * @param {import('express').Response} res
 * @param {Buffer} pdf
 * @param {string} filename
 * @param {boolean} [inline]
 */
export function sendPdf(res, pdf, filename, inline = false) {
	res.status(200);
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);
	res.setHeader('Content-Length', String(pdf.length));
	res.send(pdf);
}
