import { Router } from 'express';
import {
  getAuthenticatedUser,
  login,
  refreshSession,
} from '../services/auth-service.js';
import { requireAuth } from '../middlewares/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (request, response, next) => {
  try {
    const result = await login(request.body);

    if (result.kind === 'invalid_credentials') {
      response.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha inválidos.',
        },
      });
      return;
    }

    if (result.kind === 'inactive') {
      response.status(403).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'Usuário sem acesso ao sistema.',
        },
      });
      return;
    }

    response.json({
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const result = await refreshSession(request.body);

    if (result.kind === 'invalid_refresh') {
      response.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Sessão expirada ou inválida.',
        },
      });
      return;
    }

    response.json(result.tokens);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    if (!request.auth) {
      response.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticação necessária.',
        },
      });
      return;
    }

    const user = await getAuthenticatedUser(request.auth.userId);

    if (!user) {
      response.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuário não disponível.',
        },
      });
      return;
    }

    response.json(user);
  } catch (error) {
    next(error);
  }
});
