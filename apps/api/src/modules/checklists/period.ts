import type { Routine } from '../../generated/prisma/client.js';

export function todayInGabinete(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts();
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('Não foi possível determinar a data do gabinete.');
  return `${year}-${month}-${day}`;
}
export function checklistPeriod(frequency: Routine['frequency'], date: string): { key: string; start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00.000Z`);
  if (frequency === 'SEMANAL') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (frequency === 'MENSAL') start.setUTCDate(1);
  if (frequency === 'QUINZENAL') start.setUTCDate(start.getUTCDate() <= 15 ? 1 : 16);
  const end = new Date(start);
  if (frequency === 'SEMANAL') end.setUTCDate(end.getUTCDate() + 7);
  else if (frequency === 'MENSAL' || (frequency === 'QUINZENAL' && start.getUTCDate() === 16)) { end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1); }
  else if (frequency === 'QUINZENAL') end.setUTCDate(16);
  else end.setUTCDate(end.getUTCDate() + 1);
  return { key: `${frequency}:${start.toISOString().slice(0, 10)}`, start, end };
}
