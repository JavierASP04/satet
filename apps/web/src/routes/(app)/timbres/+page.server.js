import { loadCurrentRate } from '#lib/server/bcv-rate.js';
import { readIssuedStamps } from '#lib/server/issued-stamps.js';

export const load = async ({ fetch, cookies }) => {
	const rate = await loadCurrentRate(fetch, cookies);
	return { ...rate, stamps: readIssuedStamps(cookies) };
};
