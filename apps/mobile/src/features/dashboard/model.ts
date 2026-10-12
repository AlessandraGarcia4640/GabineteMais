import { taskPriorityRank, type Task } from '@gabinete-plus/shared';
export function gabineteDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value; const month = parts.find((part) => part.type === 'month')?.value; const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('Data indisponível.'); return `${year}-${month}-${day}`;
}
export function displayDate(day: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(`${day}T12:00:00Z`)); }
export function pendingPreview(open: Task[], progress: Task[], assigneeId: string): Task[] {
  const unique = new Map([...open, ...progress].filter((task) => task.assigneeId === assigneeId && ['ABERTA', 'EM_ANDAMENTO'].includes(task.status)).map((task) => [task.id, task]));
  return [...unique.values()].sort((a, b) => {
    const dueA = a.dueDate ?? '9999-12-31'; const dueB = b.dueDate ?? '9999-12-31';
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    const priority = taskPriorityRank(b.priority) - taskPriorityRank(a.priority);
    return priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }).slice(0, 5);
}
