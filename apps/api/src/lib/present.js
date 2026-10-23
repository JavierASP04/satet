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
 * @param {Record<string, any>} row
 * @param {boolean} [includeTaxpayer]
 */
export function toMiningDeclaration(row, includeTaxpayer = false) {
	const declaration = {
		id: row.id,
		taxpayerId: row.taxpayer_id,
		periodYear: row.period_year,
		periodMonth: row.period_month,
		activityType: row.activity_type,
		materialType: row.material_type,
		volumeCubicMeters: row.volume_cubic_meters,
		commercialValuePerUnit: row.commercial_value_per_unit,
		appliedTaxRate: row.applied_tax_rate,
		subtotalVed: row.subtotal_ved,
		isExtemporaneous: row.is_extemporaneous,
		declarationDate: toIso(row.declaration_date),
		status: row.status
	};
	if (includeTaxpayer) {
		declaration.companyName = row.company_name;
		declaration.rifNumber = row.rif_number;
	}
	return declaration;
}

/**
 * @param {Record<string, any>} row
 * @param {boolean} [includeTaxpayer]
 */
export function toOnePerThousand(row, includeTaxpayer = false) {
	const declaration = {
		id: row.id,
		taxpayerId: row.taxpayer_id,
		paymentOrderNumber: row.payment_order_number,
		entityName: row.entity_name,
		executedAmountVed: row.executed_amount_ved,
		taxAmountVed: row.tax_amount_ved,
		executionDate: row.execution_date,
		status: row.status,
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
