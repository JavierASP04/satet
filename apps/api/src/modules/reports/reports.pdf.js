import PDFDocument from 'pdfkit';

/**
 * Informe de gestión con las mismas cifras del resumen.
 * La meta proyectada no está en la especificación: el texto lo dice y no imprime una cifra.
 * @param {{
 *   currency: string,
 *   totalVed: string,
 *   byBranch: { label: string, totalVed: string }[],
 *   months: { month: string, totalVed: string, byBranch: { label: string, totalVed: string }[] }[]
 * }} summary
 */
export function renderManagementPdf(summary) {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A4', margin: 48, compress: false });
		/** @type {Buffer[]} */
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
		doc.font('Helvetica-Bold').fontSize(18).fillColor('#14281f').text('Informe de gestión');
		doc.moveDown(0.3);
		doc
			.font('Helvetica')
			.fontSize(11)
			.fillColor('#333333')
			.text(
				'Recaudación de los pagos verificados, en bolívares. La especificación no define la meta proyectada. Este informe no la compara.'
			);
		doc.moveDown(0.8);
		doc
			.font('Helvetica-Bold')
			.fontSize(12)
			.fillColor('#14281f')
			.text(`Total acumulado: ${summary.totalVed} ${summary.currency}`);
		doc.moveDown(0.6);
		doc.font('Helvetica-Bold').fontSize(11).fillColor('#1b4d3e').text('Por ramo');
		doc.moveDown(0.2);
		for (const branch of summary.byBranch) {
			doc
				.font('Helvetica')
				.fontSize(11)
				.fillColor('#14281f')
				.text(`${branch.label}: ${branch.totalVed} ${summary.currency}`);
		}
		doc.moveDown(0.6);
		doc.font('Helvetica-Bold').fontSize(11).fillColor('#1b4d3e').text('Por mes');
		doc.moveDown(0.2);
		if (summary.months.length === 0) {
			doc.font('Helvetica').fontSize(11).fillColor('#14281f').text('Sin pagos verificados.');
		}
		for (const month of summary.months) {
			const parts = month.byBranch
				.map((branch) => `${branch.label} ${branch.totalVed}`)
				.join(' · ');
			doc
				.font('Helvetica')
				.fontSize(11)
				.fillColor('#14281f')
				.text(`${month.month}: ${month.totalVed} ${summary.currency} (${parts})`);
		}
		doc.end();
	});
}
