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
