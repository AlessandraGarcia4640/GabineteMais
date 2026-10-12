import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type AuthRole } from '../lib/tokens.js';

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
    request.auth = {
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
    if (!request.auth || !roles.includes(request.auth.role)) {
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
