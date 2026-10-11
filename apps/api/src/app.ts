import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middlewares/error-handler.js';
import { env } from './lib/env.js';
import { createAccessTokenIssuer } from './modules/auth/access-token.js';
import { findCredentialUser } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.router.js';
import { LoginService } from './modules/auth/auth.service.js';
import { sessionRepository } from './modules/auth/session.repository.js';

export const createApp = (loginService = new LoginService({
  findUser: findCredentialUser, issueToken: createAccessTokenIssuer(env.JWT_ACCESS_SECRET),
  sessions: sessionRepository,
})): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRouter);
  app.use('/auth', createAuthRouter(loginService));
  app.use(errorHandler);
  return app;
};
