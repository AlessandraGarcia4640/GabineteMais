import { runFixture, templateFixture } from './fixtures.test-helper';
import { optimisticMark, startPayload, templateChanges, templateFormSchema, templatePayload } from './model';
it('valida itens vazios, limites e data impossível com contrato compartilhado', () => {
  expect(templateFormSchema.safeParse({ routineId: 'r', title: 'Título', items: [] }).success).toBe(false);
  expect(templateFormSchema.safeParse({ routineId: 'r', title: 'Título', items: [{ text: ' ' }] }).success).toBe(false);
  expect(() => startPayload('31/02/2026')).toThrow(); expect(startPayload('12/10/2026')).toEqual({ date: '2026-10-12' });
});
it('preserva multiline e envia PATCH somente das mudanças', () => {
  const original = templateFixture(); const values = { routineId: original.routineId, title: original.title, items: original.items.map((text) => ({ text })) };
  expect(templateChanges(original, templatePayload(values))).toBeNull(); values.items = [{ text: 'Primeiro\nOrientação' }];
  expect(templateChanges(original, templatePayload(values))).toEqual({ items: ['Primeiro\nOrientação'] });
});
it('progresso otimista conclui, reabre e preserva snapshots sem alterar objeto anterior', () => {
  const original = runFixture(); const done = optimisticMark(original, 'item-1', true, 'actor', '2026-10-12T13:00:00Z');
  expect(done.status).toBe('CONCLUIDA'); expect(done.progress).toBe(100); expect(done.items[0]?.completedById).toBe('actor'); expect(original.items[0]?.isCompleted).toBe(false);
  const reopened = optimisticMark(done, 'item-1', false, 'actor'); expect(reopened.completedAt).toBeNull(); expect(reopened.items[0]?.completedById).toBeNull(); expect(reopened.status).toBe('POR_FAZER'); expect(reopened.instructionsSnapshot).toBe(original.instructionsSnapshot);
});
