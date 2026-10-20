import { loadCurrentRate } from '#lib/server/bcv-rate.js';

export const load = ({ fetch, cookies }) => loadCurrentRate(fetch, cookies);
