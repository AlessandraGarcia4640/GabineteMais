import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middlewares/error-handler.js';

export const createApp = (): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRouter);
  app.use(errorHandler);
  return app;
};
