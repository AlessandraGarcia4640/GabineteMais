import { expect, it } from 'vitest';
import { checklistPeriod } from './period.js';

it('agrupa semana de segunda a domingo inclusive, atravessando ano', () => {
  const first = checklistPeriod('SEMANAL', '2026-12-31');
  const second = checklistPeriod('SEMANAL', '2027-01-03');
  expect(first.key).toBe(second.key);
  expect(first.start.toISOString().slice(0, 10)).toBe('2026-12-28');
  expect(first.end.toISOString().slice(0, 10)).toBe('2027-01-04');
});
it('mês bissexto e quinzena usam limites exclusivos corretos', () => {
  expect(checklistPeriod('MENSAL', '2028-02-29').end.toISOString().slice(0, 10)).toBe('2028-03-01');
  expect(checklistPeriod('QUINZENAL', '2026-10-15').end.toISOString().slice(0, 10)).toBe('2026-10-16');
  expect(checklistPeriod('QUINZENAL', '2026-10-16').start.toISOString().slice(0, 10)).toBe('2026-10-16');
});
it('eventual/personalizada/a definir usam o dia informado sem interpretar texto', () => {
  expect(checklistPeriod('PERSONALIZADA', '2026-10-11').end.toISOString().slice(0, 10)).toBe('2026-10-12');
  expect(checklistPeriod('EVENTUAL', '2026-10-11').key).not.toBe(checklistPeriod('EVENTUAL', '2026-10-12').key);
});
