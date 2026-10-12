import { loginResponseSchema, logoutRequestSchema, refreshRequestSchema, refreshResponseSchema, type LoginResponse, type RefreshRequest } from '@gabinete-plus/shared';

// Prepared for the HTTP client and login screen in issue #34; never persist this token in Zustand.
export { loginResponseSchema, logoutRequestSchema, refreshRequestSchema, refreshResponseSchema };
export type LoginResult = LoginResponse;
export type SessionRefreshInput = RefreshRequest;
