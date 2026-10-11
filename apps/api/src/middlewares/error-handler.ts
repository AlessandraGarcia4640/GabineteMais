import type { ErrorRequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void request;
  void next;

  if (error instanceof AppError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Formato de dados inválido.' } });
    return;
  }

  if (error instanceof Error && 'status' in error && error.status === 413) {
    response.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Os dados excedem o limite permitido.' } });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: z.treeifyError(error),
      },
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    },
  });
};
