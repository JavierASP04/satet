import assert from 'node:assert/strict';
import { randomFillSync } from 'node:crypto';
import { describe, it } from 'node:test';
import { PNG } from 'pngjs';
import { voucherSchema } from '../src/lib/payment-fields.js';
import { readVoucher } from '../src/lib/voucher.js';
import { readVoucherField } from '../../../apps/web/src/lib/server/payment.js';

// JPEG de un píxel, con marcador JFIF. No es un PDF disfrazado.
const REAL_JPEG = Buffer.from(
	'/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wCEAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
	'base64'
);

function photoPng() {
	const png = new PNG({ width: 640, height: 480 });
	randomFillSync(png.data);
	for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
	return PNG.sync.write(png);
}

function paddedJpeg(extra) {
	const chunks = [REAL_JPEG.subarray(0, 2)];
	let left = extra;
	while (left > 0) {
		const n = Math.min(left, 60_000);
		const length = Buffer.alloc(2);
		length.writeUInt16BE(n + 2);
		chunks.push(Buffer.from([0xff, 0xfe]), length, Buffer.alloc(n, 0x20));
		left -= n;
	}
	chunks.push(REAL_JPEG.subarray(2));
	return Buffer.concat(chunks);
}

/** @param {Buffer} content @param {string} type @param {string} [name] */
function formWith(content, type, name = 'comprobante.jpg') {
	const data = new FormData();
	data.set('voucher', new File([content], name, { type }));
	return data;
}

describe('comprobante en imagen', () => {
	it('acepta un JPEG real, también como image/jpg o data URL', () => {
		assert.equal(REAL_JPEG[0], 0xff);
		assert.equal(REAL_JPEG[1], 0xd8);
		const b64 = REAL_JPEG.toString('base64');
		const direct = readVoucher({
			fileName: 'foto.jpg',
			mediaType: 'image/jpeg',
			contentBase64: b64
		});
		assert.equal(direct.mediaType, 'image/jpeg');
		assert.equal(direct.content.length, REAL_JPEG.length);

		const alias = readVoucher({
			fileName: 'foto.jpg',
			mediaType: 'image/jpg',
			contentBase64: b64
		});
		assert.equal(alias.mediaType, 'image/jpeg');

		const dataUrl = readVoucher({
			fileName: 'foto.jpg',
			mediaType: 'image/jpeg',
			contentBase64: `data:image/jpeg;base64,${b64}`
		});
		assert.ok(dataUrl.content.subarray(0, 2).equals(REAL_JPEG.subarray(0, 2)));

		const parsed = voucherSchema.parse({
			fileName: 'foto.jpg',
			mediaType: 'image/jpg',
			contentBase64: b64
		});
		assert.equal(parsed.mediaType, 'image/jpeg');
	});

	it('acepta un PNG real de más de 512 KB y rechaza lo que pasa de 2 MB', () => {
		const png = photoPng();
		assert.ok(png.length > 512 * 1024, `png de prueba demasiado chico: ${png.length}`);
		assert.ok(png.length <= 2_000_000);
		const saved = readVoucher({
			fileName: 'foto.png',
			mediaType: 'image/png',
			contentBase64: png.toString('base64')
		});
		assert.equal(saved.mediaType, 'image/png');
		assert.equal(saved.content.length, png.length);

		const heavy = paddedJpeg(1_500_000);
		assert.ok(heavy.length > 512 * 1024);
		assert.ok(heavy.length <= 2_000_000);
		const photo = readVoucher({
			fileName: 'grande.jpg',
			mediaType: 'image/jpeg',
			contentBase64: heavy.toString('base64')
		});
		assert.equal(photo.content[0], 0xff);

		assert.throws(
			() =>
				readVoucher({
					fileName: 'enorme.jpg',
					mediaType: 'image/jpeg',
					contentBase64: paddedJpeg(2_100_000).toString('base64')
				}),
			(error) => error.message === 'El comprobante debe ser una imagen o un PDF de hasta 2 MB.'
		);
	});

	it('el formulario reconoce la foto aunque el navegador no indique el tipo', async () => {
		const png = photoPng();
		const jpeg = await readVoucherField(formWith(REAL_JPEG, ''));
		assert.equal(jpeg.voucher.mediaType, 'image/jpeg');
		assert.equal(jpeg.voucher.contentBase64, REAL_JPEG.toString('base64'));

		const unlabeled = await readVoucherField(formWith(png, 'application/octet-stream', 'foto.png'));
		assert.equal(unlabeled.voucher.mediaType, 'image/png');

		const heic = await readVoucherField(
			formWith(Buffer.from('ftypheic-no-es-jpeg'), 'image/heic', 'foto.heic')
		);
		assert.equal(heic.error, 'El comprobante debe ser JPEG, PNG o PDF.');

		const webp = await readVoucherField(
			formWith(Buffer.from('RIFFxxxxWEBP'), 'image/webp', 'foto.webp')
		);
		assert.equal(webp.error, 'El comprobante debe ser JPEG, PNG o PDF.');
	});
});
