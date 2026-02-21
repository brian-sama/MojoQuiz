import { User as AppUser } from './index.js';

declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            role: string;
            organizationId: string | null;
        }
        interface Request {
            user?: User;
        }
    }
}

export { };
