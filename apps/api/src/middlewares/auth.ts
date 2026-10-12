import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type AuthRole } from '../lib/tokens.js';

interface AuthContext {
  userId: string;
  role: AuthRole;
}

interface RequestWithAuth extends Request {
  auth?: AuthContext;
}

export const getAuthContext = (request: Request): AuthContext | undefined =>
  (request as RequestWithAuth).auth;

export const requireAuth = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const authorization = request.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      },
    });
    return;
  }

  try {
    const payload = verifyAccessToken(authorization.slice(7));
    const authenticatedRequest = request as RequestWithAuth;
    authenticatedRequest.auth = {
      userId: payload.sub,
      role: payload.role,
    };
    next();
  } catch {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token inválido ou expirado.',
      },
    });
  }
};

export const requireRole =
  (...roles: AuthRole[]) =>
  (request: Request, response: Response, next: NextFunction) => {
    const auth = getAuthContext(request);

    if (!auth || !roles.includes(auth.role)) {
      response.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Acesso não autorizado para este perfil.',
        },
      });
      return;
    }

    next();
  };
