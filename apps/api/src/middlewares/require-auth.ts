import type { Request, RequestHandler } from 'express';
import type { UserRole } from '@gabinete-plus/shared';
import { unauthenticated, type AuthorizationService, type SessionPrincipal } from '../modules/auth/authorization.service.js';

export function principalFor(request: Request): SessionPrincipal {
  if (!request.principal) throw unauthenticated();
  return request.principal;
}

export function requireAuth(service: AuthorizationService): RequestHandler {
  return async (request, response, next) => {
    request.principal = await service.authenticate(request.get('authorization'));
    response.set('Cache-Control', 'no-store');
    next();
  };
}

export function requireRole(service: AuthorizationService, ...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    service.requireRole(principalFor(request), roles);
    next();
  };
}
