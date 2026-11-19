import { ROLE_LABELS } from '@satet/shared';
import { formatCalendarDate, formatRate, formatRegisteredAt } from '#lib/bcv.js';
import { SUBJECT_LABELS, TAX_LABELS, formatVedText, paymentStatusLabel } from '#lib/payments.js';
import { stampStatusLabel } from '#lib/stamps.js';

export const AUDIT_ACTIONS = [
	{ value: '', label: 'Cualquier acción' },
	{ value: 'CREATE', label: 'Registros nuevos' },
	{ value: 'UPDATE', label: 'Datos modificados' },
	{ value: 'APPROVE', label: 'Aprobaciones' },
	{ value: 'REJECT', label: 'Rechazos' },
	{ value: 'CONSUME', label: 'Timbres consumidos' }
];

export const AUDIT_SUBJECTS = [
	{ value: '', label: 'Cualquier asunto' },
	{ value: 'payments', label: 'Pagos' },
	{ value: 'electronic_stamps', label: 'Timbres fiscales' },
	{ value: 'taxpayers', label: 'Contribuyentes' },
	{ value: 'mining_declarations', label: 'Declaraciones mineras' },
	{ value: 'mining_royalties', label: 'Regalías mineras' },
	{ value: 'one_per_thousand_filings', label: 'Cargas del 1 x 1000' },
	{ value: 'one_per_thousand_declarations', label: 'Declaraciones del 1 x 1000' },
	{ value: 'bank_accounts', label: 'Cuentas bancarias' },
	{ value: 'users', label: 'Usuarios' },
	{ value: 'bcv_rates', label: 'Tasa del BCV' }
];

const VERBS = {
	CREATE: 'registró',
	UPDATE: 'actualizó',
	APPROVE: 'aprobó',
	REJECT: 'rechazó',
	CONSUME: 'consumió'
};

const VERB_TITLES = {
	CREATE: 'Registró',
	UPDATE: 'Actualizó',
	APPROVE: 'Aprobó',
	REJECT: 'Rechazó',
	CONSUME: 'Consumió'
};

const SUBJECT_TITLES = {
	payments: 'Pago',
	electronic_stamps: 'Timbre fiscal',
	taxpayers: 'Contribuyente',
	mining_declarations: 'Declaración minera',
	mining_royalties: 'Regalía minera',
	one_per_thousand_filings: 'Carga del 1 x 1000',
	one_per_thousand_declarations: 'Declaración del 1 x 1000',
	bank_accounts: 'Cuenta bancaria',
	users: 'Usuario',
	bcv_rates: 'Tasa del BCV'
};

const OBJECTS = {
	payments: 'un pago',
	electronic_stamps: 'un timbre fiscal',
	taxpayers: 'un contribuyente',
	mining_declarations: 'una declaración minera',
	mining_royalties: 'una regalía minera',
	one_per_thousand_filings: 'una carga del 1 x 1000',
	one_per_thousand_declarations: 'una declaración del 1 x 1000',
	bank_accounts: 'una cuenta bancaria',
	users: 'un usuario',
	bcv_rates: 'la tasa del BCV'
};

const LABELS = {
	status: 'Estado',
	taxType: 'Tributo',
	tax_type: 'Tributo',
	amountPaidVed: 'Monto',
	amount_paid_ved: 'Monto',
	amountVed: 'Monto',
	amount_ved: 'Monto',
	amount_eur: 'Monto en euros',
	totalVed: 'Total',
	totalTaxVed: 'Total del impuesto',
	taxAmountVed: 'Impuesto',
	executedAmountVed: 'Monto ejecutado',
	bcv_rate: 'Tasa BCV',
	bcvRate: 'Tasa BCV',
	rate_in_ved: 'Tasa BCV',
	appliedRate: 'Tasa aplicada',
	bankReferenceNumber: 'Referencia bancaria',
	bank_reference_number: 'Referencia bancaria',
	relatedKind: 'Vinculado a',
	rejectionReason: 'Motivo del rechazo',
	rejection_reason: 'Motivo del rechazo',
	officeName: 'Oficina',
	attemptedOffice: 'Oficina',
	consumedAt: 'Fecha en que se consumió',
	rif: 'RIF',
	rif_number: 'RIF',
	rifNumber: 'RIF',
	taxpayer: 'Contribuyente',
	company_name: 'Contribuyente',
	companyName: 'Contribuyente',
	fee_code: 'Código del timbre',
	uuid: 'Serial del timbre',
	is_approved: 'Aprobado',
	isApproved: 'Aprobado',
	is_active: 'Cuenta activa',
	isActive: 'Cuenta activa',
	doc_type: 'Documento',
	commercial_denomination: 'Denominación comercial',
	fiscal_address: 'Dirección fiscal',
	phone_number: 'Teléfono',
	legal_representative_name: 'Representante legal',
	legal_representative_dna: 'Documento del representante',
	email: 'Correo',
	role: 'Rol',
	currency: 'Moneda',
	effective_date: 'Fecha de la tasa',
	period: 'Período',
	periodYear: 'Año',
	isExtemporaneous: 'Declaración extemporánea',
	lines: 'Líneas de la declaración',
	subjectTouched: 'Planilla o timbre vinculado',
	notice: 'Aviso',
	paymentOrderNumber: 'Número de orden',
	entityName: 'Ente',
	executionDate: 'Fecha de ejecución',
	volumeCubicMeters: 'Volumen',
	commercialValuePerUnit: 'Valor comercial por unidad',
	paymentForm: 'Forma de pago',
	bankName: 'Banco',
	accountNumber: 'Número de cuenta',
	accountType: 'Tributo de la cuenta',
	holderName: 'Titular'
};

const DOCUMENTS = {
	RIF_JURIDICO: 'RIF jurídico',
	RIF_NATURAL: 'RIF natural',
	CEDULA: 'Cédula',
	PASAPORTE: 'Pasaporte',
	J: 'RIF jurídico',
	V: 'RIF natural',
	G: 'RIF gubernamental',
	E: 'RIF extranjero'
};

const PAYMENT_FORMS = {
	DINERO_TOTAL: 'Dinero, en un solo pago',
	DINERO_FRACCIONADO: 'Dinero, fraccionado',
	ESPECIE: 'En especie'
};

const ACTIVITIES = {
	EXTRACCION: 'Extracción',
	PROCESAMIENTO: 'Procesamiento',
	SUBPRODUCTO: 'Subproducto',
	PREMEZCLADO: 'Premezclado'
};

const SKIP = new Set([
	'id',
	'user_id',
	'userId',
	'taxpayerId',
	'filingId',
	'approved_by',
	'relatedId',
	'password',
	'password_hash',
	'qr_payload',
	'qrPayload',
	'sig',
	'createdAt',
	'updatedAt',
	'created_at',
	'updated_at'
]);

/** @param {string} key */
function skipped(key) {
	return SKIP.has(key) || key.endsWith('Id') || key.endsWith('_id');
}

/** @param {unknown} value */
function asRecord(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return /** @type {Record<string, unknown>} */ (value);
}

/** @param {unknown} value */
function statusText(value) {
	const text = String(value ?? '');
	if (text === 'ACTIVO' || text === 'CONSUMIDO' || text === 'ANULADO') return stampStatusLabel(text);
	if (text === 'PENDIENTE' || text === 'VERIFICADO' || text === 'RECHAZADO') return paymentStatusLabel(text);
	return text;
}

/** @param {string} key @param {unknown} value */
function plain(key, value) {
	if (value == null || value === '') return '';
	if (typeof value === 'boolean') {
		if (key === 'subjectTouched') return value ? 'también cambió de estado' : 'no cambió';
		return value ? 'Sí' : 'No';
	}
	if (key === 'status') return statusText(value);
	if (key === 'taxType' || key === 'tax_type' || key === 'accountType') return TAX_LABELS[value] ?? String(value);
	if (key === 'relatedKind') return SUBJECT_LABELS[value] ?? String(value);
	if (key === 'role') return ROLE_LABELS[value] ?? String(value);
	if (key === 'doc_type') return DOCUMENTS[value] ?? String(value);
	if (key === 'paymentForm') return PAYMENT_FORMS[value] ?? String(value);
	if (key === 'lines' && Array.isArray(value)) {
		const count = value.length;
		return count === 1 ? '1 línea' : `${count} líneas`;
	}
	if (key === 'notice') {
		const notice = asRecord(value);
		if (!notice) return '';
		return notice.email ? `enviado a ${notice.email}` : 'preparado para el contribuyente';
	}
	if (key === 'period') return periodText(value);
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatRegisteredAt(value);
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatCalendarDate(value);
	if (key === 'bcv_rate' || key === 'bcvRate' || key === 'rate_in_ved' || key === 'appliedRate') {
		return formatRate(value);
	}
	if (key === 'amount_eur') {
		const euros = Number(value);
		if (!Number.isFinite(euros)) return String(value);
		return `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(euros)} EUR`;
	}
	if (/ved|amount/i.test(key) && (typeof value === 'number' || typeof value === 'string')) {
		return formatVedText(value);
	}
	if (typeof value === 'number' && key === 'volumeCubicMeters') return `${value} m³`;
	if (ACTIVITIES[value]) return ACTIVITIES[value];
	if (typeof value === 'object') return '';
	return String(value);
}

/** @param {unknown} value */
function periodText(value) {
	const match = String(value).match(/^(\d{4})-(\d{1,2})$/);
	if (!match) return String(value);
	const label = new Intl.DateTimeFormat('es-VE', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/** @param {string} text */
function finish(text) {
	return `${text.replace(/[.\s]+$/, '')}.`;
}

/** @param {string} key @param {unknown} before @param {unknown} after */
function sentence(key, before, after) {
	if (key === 'code') {
		if (after === 'ALREADY_USED') return 'El timbre ya estaba usado, así que no se volvió a consumir.';
		if (after === 'ANNULLED') return 'El timbre ya estaba anulado.';
		return '';
	}
	const label = LABELS[key];
	if (!label || skipped(key)) return '';
	const next = plain(key, after);
	const previous = plain(key, before);
	if (key === 'attemptedOffice' && next) return finish(`Lo presentó la oficina ${next}`);
	if (!next && previous && key === 'officeName') return finish(`Se había usado en ${previous}`);
	if (!next && previous && key === 'consumedAt') return finish(`La primera vez fue el ${previous}`);
	if (!next && !previous) return '';
	if (key === 'status' && previous && next && previous !== next) {
		return `El estado pasó de ${previous} a ${next}.`;
	}
	if ((key === 'is_approved' || key === 'isApproved') && previous && next && previous !== next) {
		return next === 'Sí' ? 'La cuenta quedó aprobada.' : 'La cuenta quedó sin aprobar.';
	}
	if (key === 'subjectTouched') {
		return next === 'también cambió de estado'
			? 'La planilla o el timbre vinculado también cambió de estado.'
			: '';
	}
	if (previous && next && previous !== next) return finish(`${label}: pasó de ${previous} a ${next}`);
	if (next) return finish(`${label}: ${next}`);
	return '';
}

/** @param {unknown} left @param {unknown} right */
function same(left, right) {
	return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

/**
 * @param {unknown} oldValues
 * @param {unknown} newValues
 */
export function auditFacts(oldValues, newValues) {
	const before = asRecord(oldValues);
	const after = asRecord(newValues);
	if (!after && before) {
		return Object.keys(before)
			.map((key) => sentence(key, null, before[key]))
			.filter(Boolean);
	}
	const source = after ?? before;
	if (!source) return [];
	/** @type {string[]} */
	const lines = [];
	for (const key of Object.keys(source)) {
		if (skipped(key)) continue;
		if (before && after && same(before[key], after[key])) continue;
		const line = sentence(key, before?.[key], after ? after[key] : undefined);
		if (line) lines.push(line);
	}
	if (before && after) {
		for (const key of Object.keys(before)) {
			if (skipped(key) || key in after) continue;
			const line = sentence(key, before[key], null);
			if (line) lines.push(line);
		}
	}
	return lines;
}

/** @param {string | null | undefined} ip */
export function auditPlace(ip) {
	if (!ip) return '';
	if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return 'Desde este mismo equipo';
	return `Desde la dirección ${ip}`;
}

/** @param {{ action?: string, tableAffected?: string, email?: string | null }} row */
export function auditCard(row) {
	const tone =
		row.action === 'APPROVE' ? 'ok' : row.action === 'REJECT' ? 'bad' : row.action === 'UPDATE' ? 'wait' : 'mark';
	return {
		who: row.email || 'El sistema',
		verb: VERB_TITLES[row.action] ?? 'Cambio',
		subject: SUBJECT_TITLES[row.tableAffected] ?? 'Dato del sistema',
		tone
	};
}

/** @param {{ action?: string, tableAffected?: string, email?: string | null }} row */
export function auditSentence(row) {
	const who = row.email || 'El sistema';
	const verb = VERBS[row.action] ?? 'registró un cambio en';
	const object = OBJECTS[row.tableAffected] ?? 'un dato del sistema';
	return `${who} ${verb} ${object}.`;
}
