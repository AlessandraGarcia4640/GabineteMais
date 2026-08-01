import type { ErrorRequestHandler } from 'express';
import { z, ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void request;
  void next;

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
