import type { AuthRole } from '../lib/tokens.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      userId: string;
      role: AuthRole;
    };
  }
}
