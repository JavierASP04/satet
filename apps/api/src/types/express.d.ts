import type { Role } from '@satet/shared';

declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				role: Role;
			};
		}
	}
}

export {};
