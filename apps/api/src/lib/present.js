/** @param {unknown} value */
function toIso(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(String(value));
	return date.toISOString();
}

/** @param {Record<string, any>} row */
export function toUser(row) {
	return {
		id: row.id,
		email: row.email,
		role: row.role,
		isActive: row.is_active,
		createdAt: toIso(row.created_at),
		updatedAt: toIso(row.updated_at)
	};
}

/** @param {Record<string, any>} row */
export function toTaxpayer(row) {
	return {
		id: row.id,
		userId: row.user_id,
		docType: row.doc_type,
		rifNumber: row.rif_number,
		companyName: row.company_name,
		commercialDenomination: row.commercial_denomination,
		fiscalAddress: row.fiscal_address,
		phoneNumber: row.phone_number,
		legalRepresentativeName: row.legal_representative_name,
		legalRepresentativeDna: row.legal_representative_dna,
		isApproved: row.is_approved,
		approvedBy: row.approved_by,
		createdAt: toIso(row.created_at),
		updatedAt: toIso(row.updated_at)
	};
}

/**
 * @param {unknown} value
 * @param {number} scale
 */
export function formatFixed(value, scale) {
	const text = String(value).trim();
	if (!/^-?\d+(\.\d+)?$/.test(text)) {
		throw new Error('Monto inválido.');
	}
	const negative = text.startsWith('-');
	const [whole, frac = ''] = (negative ? text.slice(1) : text).split('.');
	if (frac.length > scale && /[1-9]/.test(frac.slice(scale))) {
		throw new Error('Monto inválido.');
	}
	const formatted = `${whole.replace(/^0+(?=\d)/, '') || '0'}.${frac.padEnd(scale, '0').slice(0, scale)}`;
	return negative ? `-${formatted}` : formatted;
}

/** @param {Record<string, any>} line */
function toMiningLine(line) {
	return {
		activityType: line.activity_type,
		materialType: line.material_type,
		volumeCubicMeters: line.volume_cubic_meters,
		commercialValuePerUnit: line.commercial_value_per_unit,
		appliedTaxRate: line.applied_tax_rate,
		subtotalVed: line.subtotal_ved
	};
}

/**
 * @param {Record<string, any>} row
 * @param {boolean} [includeTaxpayer]
 */
export function toMiningDeclaration(row, includeTaxpayer = false) {
	const lines = Array.isArray(row.lines) ? row.lines.map(toMiningLine) : [];
	const first = lines[0];
	const declaration = {
		id: row.id,
		taxpayerId: row.taxpayer_id,
		periodYear: row.period_year,
		periodMonth: row.period_month,
		lines,
		activityType: first?.activityType ?? null,
		materialType: first?.materialType ?? null,
		volumeCubicMeters: first?.volumeCubicMeters ?? null,
		commercialValuePerUnit: first?.commercialValuePerUnit ?? null,
		appliedTaxRate: first?.appliedTaxRate ?? null,
		subtotalVed: row.total_ved,
		totalVed: row.total_ved,
		isExtemporaneous: row.is_extemporaneous,
		bankReferenceNumber: row.bank_reference_number,
		declarationDate: toIso(row.declaration_date),
		status: row.status,
		rejectionReason: row.rejection_reason ?? null
	};
	if (includeTaxpayer) {
		declaration.companyName = row.company_name;
		declaration.rifNumber = row.rif_number;
	}
	return declaration;
}

/** @param {Record<string, any>} row */
function issuedAtFromStamp(row) {
	if (typeof row.qr_payload === 'string') {
		try {
			const parsed = JSON.parse(row.qr_payload);
			if (typeof parsed.issued_at === 'string') return parsed.issued_at;
		} catch {
			// Si el QR no se puede leer, la fecha de la fila sigue sirviendo para mostrar el timbre.
		}
	}
	return toIso(row.created_at);
}

/** @param {Record<string, any>} row */
export function toStamp(row) {
	const issuedAt = issuedAtFromStamp(row);
	return {
		id: row.id,
		uuid: row.uuid_code,
		rif: row.rif_number,
		taxpayer: row.company_name,
		amountEur: formatFixed(row.amount_eur, 2),
		bcvRate: formatFixed(row.bcv_rate_applied, 4),
		amountVed: formatFixed(row.amount_ved, 2),
		issuedAt,
		status: row.status,
		...(row.fee_code ? { feeCode: row.fee_code, concept: row.concept } : {}),
		qrPayload: row.qr_payload
	};
}

/**
 * @param {Record<string, any>} row
 * @param {boolean} [includeTaxpayer]
 */
export function toOnePerThousand(row, includeTaxpayer = false) {
	const declaration = {
		id: row.id,
		filingId: row.filing_id ?? null,
		taxpayerId: row.taxpayer_id,
		paymentOrderNumber: row.payment_order_number,
		entityName: row.entity_name,
		executedAmountVed: row.executed_amount_ved,
		taxAmountVed: row.tax_amount_ved,
		executionDate: row.execution_date,
		status: row.status,
		totalTaxVed: row.total_tax_ved ?? null,
		createdAt: toIso(row.created_at)
	};
	if (includeTaxpayer) {
		declaration.companyName = row.company_name;
		declaration.rifNumber = row.rif_number;
	}
	return declaration;
}

/** Instantánea de columnas de `taxpayers` para `audit_logs`, sin datos de acceso. */
export function taxpayerSnapshot(row) {
	return {
		user_id: row.user_id,
		doc_type: row.doc_type,
		rif_number: row.rif_number,
		company_name: row.company_name,
		commercial_denomination: row.commercial_denomination,
		fiscal_address: row.fiscal_address,
		phone_number: row.phone_number,
		legal_representative_name: row.legal_representative_name,
		legal_representative_dna: row.legal_representative_dna,
		is_approved: row.is_approved,
		approved_by: row.approved_by
	};
}
