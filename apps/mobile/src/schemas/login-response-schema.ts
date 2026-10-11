import { loginResponseSchema, type LoginResponse } from '@gabinete-plus/shared';

// Prepared for the HTTP client and login screen in issue #34; never persist this token in Zustand.
export { loginResponseSchema };
export type LoginResult = LoginResponse;
