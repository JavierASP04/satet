import { crc32 } from 'node:zlib';

/**
 * Libro .xlsx de una hoja, sin dependencias. Las celdas van como texto
 * para conservar ceros a la izquierda y los dos decimales del monto.
 * @param {string} sheetName
 * @param {string[][]} rows
 */
export function buildXlsx(sheetName, rows) {
	const safeName = sheetName.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Hoja';
	const files = [
		{ name: '[Content_Types].xml', data: contentTypes() },
		{ name: '_rels/.rels', data: rootRels() },
		{ name: 'xl/workbook.xml', data: workbook(safeName) },
		{ name: 'xl/_rels/workbook.xml.rels', data: workbookRels() },
		{ name: 'xl/styles.xml', data: styles() },
		{ name: 'xl/worksheets/sheet1.xml', data: worksheet(rows) }
	];
	return zipStore(files);
}

function contentTypes() {
	return xmlDoc(
		`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
			`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
			`<Default Extension="xml" ContentType="application/xml"/>` +
			`<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
			`<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
			`<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
			`</Types>`
	);
}

function rootRels() {
	return xmlDoc(
		`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
			`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
			`</Relationships>`
	);
}

/** @param {string} sheetName */
function workbook(sheetName) {
	return xmlDoc(
		`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
			`<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
			`</workbook>`
	);
}

function workbookRels() {
	return xmlDoc(
		`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
			`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
			`<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
			`</Relationships>`
	);
}

function styles() {
	return xmlDoc(
		`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
			`<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
			`<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
			`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
			`<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
			`</styleSheet>`
	);
}

/** @param {string[][]} rows */
function worksheet(rows) {
	const body = rows
		.map((row, rowIndex) => {
			const cells = row
				.map((value, columnIndex) => {
					const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
					return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
				})
				.join('');
			return `<row r="${rowIndex + 1}">${cells}</row>`;
		})
		.join('');
	return xmlDoc(
		`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
	);
}

/** @param {number} index */
function columnName(index) {
	let n = index + 1;
	let name = '';
	while (n > 0) {
		const rem = (n - 1) % 26;
		name = String.fromCharCode(65 + rem) + name;
		n = Math.floor((n - 1) / 26);
	}
	return name;
}

/** @param {string} value */
function escapeXml(value) {
	return String(value)
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/** @param {string} body */
function xmlDoc(body) {
	return Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`, 'utf8');
}

/**
 * ZIP con método store. Excel abre el paquete sin compresión.
 * @param {{ name: string, data: Buffer }[]} files
 */
function zipStore(files) {
	/** @type {Buffer[]} */
	const locals = [];
	/** @type {Buffer[]} */
	const centrals = [];
	let offset = 0;
	for (const file of files) {
		const name = Buffer.from(file.name);
		const data = file.data;
		const crc = crc32(data) >>> 0;
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(0, 6);
		local.writeUInt16LE(0, 8);
		local.writeUInt16LE(0, 10);
		local.writeUInt16LE(0, 12);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(name.length, 26);
		local.writeUInt16LE(0, 28);
		locals.push(Buffer.concat([local, name, data]));

		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt16LE(0, 8);
		central.writeUInt16LE(0, 10);
		central.writeUInt16LE(0, 12);
		central.writeUInt16LE(0, 14);
		central.writeUInt32LE(crc, 16);
		central.writeUInt32LE(data.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(name.length, 28);
		central.writeUInt16LE(0, 30);
		central.writeUInt16LE(0, 32);
		central.writeUInt16LE(0, 34);
		central.writeUInt16LE(0, 36);
		central.writeUInt32LE(0, 38);
		central.writeUInt32LE(offset, 42);
		centrals.push(Buffer.concat([central, name]));
		offset += locals[locals.length - 1].length;
	}
	const centralBuf = Buffer.concat(centrals);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(0, 4);
	end.writeUInt16LE(0, 6);
	end.writeUInt16LE(files.length, 8);
	end.writeUInt16LE(files.length, 10);
	end.writeUInt32LE(centralBuf.length, 12);
	end.writeUInt32LE(offset, 16);
	end.writeUInt16LE(0, 20);
	return Buffer.concat([...locals, centralBuf, end]);
}
