const UNIT_MS = {
	s: 1000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000
};

/**
 * Convierte una duración de sesión (`8h`, `30m`, `7d`, `45s` o segundos enteros) a milisegundos.
 * @param {string} value
 * @returns {number | null}
 */
export function durationToMs(value) {
	if (/^\d+$/.test(value)) {
		const seconds = Number(value);
		return seconds > 0 ? seconds * 1000 : null;
	}

	const match = /^(\d+)([smhd])$/.exec(value);
	if (!match) return null;

	const amount = Number(match[1]);
	if (amount <= 0) return null;
	return amount * UNIT_MS[match[2]];
}
