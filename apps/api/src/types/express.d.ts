import type { SessionPrincipal } from '../modules/auth/authorization.service.js';

declare global {
  namespace Express {
    interface Request {
      principal?: SessionPrincipal;
    }
  }
}
