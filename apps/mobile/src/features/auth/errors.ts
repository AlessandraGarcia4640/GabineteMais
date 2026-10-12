import { strings } from '../../lib/strings.js';
export type AuthErrorCode = 'invalidCredentials' | 'sessionExpired' | 'network' | 'rateLimited' | 'configuration' | 'unexpected' | 'storage' | 'logoutOffline';
export class AuthFailure extends Error {
  constructor(readonly code: AuthErrorCode) { super(strings.auth[code]); this.name = 'AuthFailure'; }
}
export function authMessage(error: Error): string { return error instanceof AuthFailure ? error.message : strings.auth.unexpected; }
