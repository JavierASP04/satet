import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toMiningDeclaration } from '../src/lib/present.js';

describe('declaración minera sin multa', () => {
	it('marca el atraso y no calcula una sanción en euros', () => {
		const late = toMiningDeclaration({
			id: '11111111-1111-4111-8111-111111111111',
			taxpayer_id: '22222222-2222-4222-8222-222222222222',
			period_year: 2024,
			period_month: 1,
			total_ved: '68.00',
			is_extemporaneous: true,
			bank_reference_number: '12345678',
			declaration_date: new Date('2026-10-23T12:00:00.000Z'),
			status: 'PENDIENTE',
			rejection_reason: null,
			lines: [
				{
					activity_type: 'EXTRACCION',
					material_type: 'Arena',
					volume_cubic_meters: '10.00',
					commercial_value_per_unit: '100.00',
					applied_tax_rate: '6.00',
					subtotal_ved: '60.00'
				}
			]
		});
		assert.equal(late.isExtemporaneous, true);
		assert.equal(late.totalVed, '68.00');
		assert.equal(late.subtotalVed, '68.00');
		assert.equal('fineEur' in late, false);
		assert.equal(late.lines[0].appliedTaxRate, '6.00');
	});
});
