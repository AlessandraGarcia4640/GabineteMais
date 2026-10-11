import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middlewares/error-handler.js';
import { env } from './lib/env.js';
import { createAccessTokenIssuer, createAccessTokenVerifier } from './modules/auth/access-token.js';
import { findCredentialUser } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.router.js';
import { LoginService } from './modules/auth/auth.service.js';
import { findSession, sessionRepository } from './modules/auth/session.repository.js';
import { AuthorizationService } from './modules/auth/authorization.service.js';
import { UserAccessService } from './modules/users/user-access.service.js';
import { createUserAccessRouter } from './modules/users/user-access.router.js';
import { findPublicUserById } from './modules/users/users.repository.js';
import { managementRepository } from './modules/users/management.repository.js';
import { ManagementService } from './modules/users/management.service.js';
import { routinesRepository } from './modules/routines/routines.repository.js';
import { RoutinesService } from './modules/routines/routines.service.js';
import { createRoutinesRouter } from './modules/routines/routines.router.js';

export const createApp = (loginService = new LoginService({
  findUser: findCredentialUser, issueToken: createAccessTokenIssuer(env.JWT_ACCESS_SECRET),
  sessions: sessionRepository,
}), authorization = new AuthorizationService({
  verifyToken: createAccessTokenVerifier(env.JWT_ACCESS_SECRET), findSession,
}), userLookup = findPublicUserById, usersRepository = managementRepository, routineRepository = routinesRepository): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRouter);
  app.use('/auth', createAuthRouter(loginService, authorization));
  app.use('/users', createUserAccessRouter(authorization, new UserAccessService(authorization, { findUser: userLookup }),
    new ManagementService(authorization, usersRepository)));
  app.use('/routines', createRoutinesRouter(authorization, new RoutinesService(authorization, routineRepository)));
  app.use(errorHandler);
  return app;
};
