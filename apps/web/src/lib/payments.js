import { PAYMENT_STATUS } from '@satet/shared';

export const TAX_LABELS = {
	MINERO: 'Minero',
	UN_POR_MIL: '1 x 1000',
	TIMBRE_FISCAL: 'Timbre fiscal'
};

export const SUBJECT_LABELS = {
	MINING_DECLARATION: 'Declaración minera',
	ONE_PER_THOUSAND_FILING: 'Carga 1 x 1000',
	MINING_ROYALTY: 'Regalía',
	ELECTRONIC_STAMP: 'Timbre'
};

export const PAYMENT_STATUS_LABELS = {
	PENDIENTE: 'Pendiente',
	VERIFICADO: 'Verificado',
	RECHAZADO: 'Rechazado'
};

/** @param {string} status */
export function paymentStatusLabel(status) {
	return PAYMENT_STATUS_LABELS[status] ?? status;
}

/** @param {string} status */
export function paymentTone(status) {
	if (status === PAYMENT_STATUS.VERIFICADO) return 'ok';
	if (status === PAYMENT_STATUS.RECHAZADO) return 'bad';
	return 'wait';
}

/** @param {string | number | null | undefined} value */
export function formatVedText(value) {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return '—';
	return `${new Intl.NumberFormat('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount)} VED`;
}
