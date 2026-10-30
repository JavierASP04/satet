import PDFDocument from 'pdfkit';

/**
 * @param {{
 *   title: string,
 *   intro: string,
 *   facts: [string, string][],
 *   lines?: { head: string[], rows: string[][] },
 *   totalLabel: string,
 *   total: string,
 *   late?: boolean
 * }} input
 */
export function renderPlanilla(input) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A4', margin: 48, compress: false });
		const chunks = [];
		doc.on('data', (chunk) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc
			.font('Helvetica-Bold')
			.fontSize(11)
			.fillColor('#1b4d3e')
			.text('GOBERNACIÓN DEL ESTADO TRUJILLO');
		doc.font('Helvetica').fontSize(10).fillColor('#333333').text('SATET');
		doc.moveDown(0.4);
		doc.font('Helvetica-Bold').fontSize(18).fillColor('#14281f').text(input.title);
		doc.moveDown(0.3);
		doc.font('Helvetica').fontSize(11).fillColor('#333333').text(input.intro);
		if (input.late) {
			doc.moveDown(0.6);
			doc.font('Helvetica-Bold').fontSize(16).fillColor('#9b1c1c').text('Fuera de tiempo');
		}
		doc.moveDown(0.8);

		for (const [label, value] of input.facts) {
			doc.font('Helvetica-Bold').fontSize(10).fillColor('#1b4d3e').text(label);
			doc.font('Helvetica').fontSize(12).fillColor('#14281f').text(value);
			doc.moveDown(0.35);
		}

		if (input.lines && input.lines.rows.length > 0) {
			doc.moveDown(0.4);
			doc
				.font('Helvetica-Bold')
				.fontSize(10)
				.fillColor('#1b4d3e')
				.text(input.lines.head.join('   ·   '));
			doc.moveDown(0.2);
			for (const row of input.lines.rows) {
				doc.font('Helvetica').fontSize(11).fillColor('#14281f').text(row.join('   ·   '));
			}
		}

		doc.moveDown(0.8);
		doc
			.font('Helvetica-Bold')
			.fontSize(12)
			.fillColor('#14281f')
			.text(`${input.totalLabel}: ${input.total}`);
		doc.end();
	});
}

/**
 * @param {import('express').Response} res
 * @param {Buffer} pdf
 * @param {string} filename
 */
export function sendPdf(res, pdf, filename) {
	res.status(200);
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.setHeader('Content-Length', String(pdf.length));
	res.send(pdf);
}
