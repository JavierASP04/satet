/**
 * Reloj de pared en una zona IANA. Solo hace falta minuto y hora fijos (`M H * * *`).
 */

export function parseDailyCron(expression) {
	const match = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(String(expression).trim());
	if (!match) {
		throw new Error(`La expresión cron debe ser "minuto hora * * *". Recibido: ${expression}`);
	}
	const minute = Number(match[1]);
	const hour = Number(match[2]);
	if (minute > 59 || hour > 23) {
		throw new Error(`La expresión cron está fuera de rango: ${expression}`);
	}
	return { minute, hour };
}

export function zonedParts(date, timeZone) {
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	/** @type {Record<string, string>} */
	const map = {};
	for (const part of fmt.formatToParts(date)) {
		if (part.type !== 'literal') map[part.type] = part.value;
	}
	let hour = Number(map.hour);
	if (hour === 24) hour = 0;
	return {
		year: Number(map.year),
		month: Number(map.month),
		day: Number(map.day),
		hour,
		minute: Number(map.minute),
		second: Number(map.second)
	};
}

/** @returns {string} `YYYY-MM-DD` en `timeZone`. */
export function formatDateInTimeZone(date, timeZone) {
	const parts = zonedParts(date, timeZone);
	const month = String(parts.month).padStart(2, '0');
	const day = String(parts.day).padStart(2, '0');
	return `${String(parts.year).padStart(4, '0')}-${month}-${day}`;
}

/**
 * Milisegundos hasta la próxima ocurrencia estrictamente futura de `hour:minute` en `timeZone`.
 */
export function msUntilNextDaily(now, hour, minute, timeZone) {
	const parts = zonedParts(now, timeZone);
	let target = zonedTimeToUtc(parts.year, parts.month, parts.day, hour, minute, 0, timeZone);
	if (target.getTime() <= now.getTime()) {
		target = zonedTimeToUtc(parts.year, parts.month, parts.day + 1, hour, minute, 0, timeZone);
	}
	return target.getTime() - now.getTime();
}

/** Ya pasó hoy la hora programada (incluye el minuto exacto). */
export function shouldCatchUp(now, hour, minute, timeZone) {
	const parts = zonedParts(now, timeZone);
	if (parts.hour !== hour) return parts.hour > hour;
	return parts.minute >= minute;
}

function zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
	const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	const offset = offsetMs(guess, timeZone);
	let utc = new Date(guess.getTime() - offset);
	const offsetAtUtc = offsetMs(utc, timeZone);
	if (offsetAtUtc !== offset) utc = new Date(guess.getTime() - offsetAtUtc);
	return utc;
}

function offsetMs(date, timeZone) {
	const parts = zonedParts(date, timeZone);
	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second
	);
	return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}
