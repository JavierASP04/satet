export const STAMP_STATUS_LABELS = {
	ACTIVO: 'Activo',
	CONSUMIDO: 'Consumido',
	ANULADO: 'Anulado'
};

/** @param {string} status */
export function stampStatusLabel(status) {
	return STAMP_STATUS_LABELS[status] ?? status;
}
