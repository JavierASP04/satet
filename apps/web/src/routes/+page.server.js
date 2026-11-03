import { MODULES } from '@satet/shared';

export const load = ({ locals }) => {
	return { user: locals.user, modules: MODULES };
};
