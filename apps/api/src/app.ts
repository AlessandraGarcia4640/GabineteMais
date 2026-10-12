import { createTransitionRouter } from './modules/transition/transition.router.js';
import { TransitionService } from './modules/transition/transition.service.js';
import { transitionRepository } from './modules/transition/transition.repository.js';
import { createDocumentationRouter } from './routes/documentation.js';
import { createGuidelinesRouter } from './modules/guidelines/guidelines.router.js';
import { GuidelinesService } from './modules/guidelines/guidelines.service.js';
import { guidelinesRepository } from './modules/guidelines/guidelines.repository.js';
import { tasksRepository } from './modules/tasks/tasks.repository.js';
import { TasksService } from './modules/tasks/tasks.service.js';
import { createTasksRouter } from './modules/tasks/tasks.router.js';
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
import { checklistsRepository } from './modules/checklists/checklists.repository.js';
import { ChecklistsService } from './modules/checklists/checklists.service.js';
import { createChecklistsRouter } from './modules/checklists/checklists.router.js';
import { contactsRepository } from './modules/contacts/contacts.repository.js';
import { ContactsService } from './modules/contacts/contacts.service.js';
import { createContactsRouter } from './modules/contacts/contacts.router.js';

export const createApp = (loginService = new LoginService({
  findUser: findCredentialUser, issueToken: createAccessTokenIssuer(env.JWT_ACCESS_SECRET),
  sessions: sessionRepository,
}), authorization = new AuthorizationService({
  verifyToken: createAccessTokenVerifier(env.JWT_ACCESS_SECRET), findSession,
}), userLookup = findPublicUserById, usersRepository = managementRepository, routineRepository = routinesRepository, checklistRepository = checklistsRepository, contactRepository = contactsRepository, taskRepository = tasksRepository): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (env.NODE_ENV !== 'production') app.use('/docs', createDocumentationRouter());
  app.use('/health', healthRouter);
  app.use('/auth', createAuthRouter(loginService, authorization));
  app.use('/users', createUserAccessRouter(authorization, new UserAccessService(authorization, { findUser: userLookup }),
    new ManagementService(authorization, usersRepository)));
  app.use('/routines', createRoutinesRouter(authorization, new RoutinesService(authorization, routineRepository)));
  app.use('/checklists', createChecklistsRouter(authorization, new ChecklistsService(authorization, checklistRepository)));
  app.use('/contacts', createContactsRouter(authorization, new ContactsService(authorization, contactRepository)));
  app.use('/tasks', createTasksRouter(authorization, new TasksService(authorization, taskRepository)));
  app.use('/guidelines', createGuidelinesRouter(authorization, new GuidelinesService(authorization, guidelinesRepository)));
  app.use('/transition-guide', createTransitionRouter(authorization, new TransitionService(authorization, transitionRepository)));
  app.use(errorHandler);
  return app;
};
