import { z } from 'zod';
export const transactionConflictSchema = z.union([
  z.object({ code: z.literal('P2034') }),
  z.object({ code: z.literal('P2010'), meta: z.object({ driverAdapterError: z.object({ cause: z.object({ kind: z.literal('TransactionWriteConflict') }) }) }) }),
]);
