CREATE TYPE "TaskStatus" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
CREATE TYPE "TaskPriority" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');
CREATE TYPE "TaskEventType" AS ENUM ('CREATED', 'EDITED', 'REASSIGNED', 'STATUS_CHANGED');
CREATE TABLE "tasks" (
  "id" TEXT PRIMARY KEY, "title" VARCHAR(200) NOT NULL, "description" TEXT NOT NULL DEFAULT '', "instructions" TEXT NOT NULL DEFAULT '',
  "dueDate" DATE, "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL', "priorityRank" INTEGER NOT NULL DEFAULT 1,
  "status" "TaskStatus" NOT NULL DEFAULT 'ABERTA',
  "assigneeId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "updatedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "routineId" TEXT REFERENCES "routines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "checklistRunId" TEXT REFERENCES "checklist_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "contactId" TEXT REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "completedById" TEXT REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cancelledAt" TIMESTAMP(3), "cancelledById" TEXT REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_priority_check" CHECK (("priority" = 'BAIXA' AND "priorityRank" = 0) OR ("priority" = 'NORMAL' AND "priorityRank" = 1) OR ("priority" = 'ALTA' AND "priorityRank" = 2) OR ("priority" = 'URGENTE' AND "priorityRank" = 3)),
  CONSTRAINT "tasks_status_check" CHECK (
    ("status" = 'ABERTA' AND "startedAt" IS NULL AND "completedAt" IS NULL AND "completedById" IS NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL) OR
    ("status" = 'EM_ANDAMENTO' AND "startedAt" IS NOT NULL AND "completedAt" IS NULL AND "completedById" IS NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL) OR
    ("status" = 'CONCLUIDA' AND "startedAt" IS NOT NULL AND "completedAt" IS NOT NULL AND "completedById" IS NOT NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL) OR
    ("status" = 'CANCELADA' AND "completedAt" IS NULL AND "completedById" IS NULL AND "cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL))
);
CREATE INDEX "tasks_status_assigneeId_dueDate_idx" ON "tasks"("status", "assigneeId", "dueDate");
CREATE INDEX "tasks_dueDate_priorityRank_id_idx" ON "tasks"("dueDate", "priorityRank", "id");
CREATE INDEX "tasks_checklistRunId_status_idx" ON "tasks"("checklistRunId", "status");
CREATE TABLE "task_events" (
  "id" TEXT PRIMARY KEY, "taskId" TEXT NOT NULL REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "type" "TaskEventType" NOT NULL,
  "fromStatus" "TaskStatus", "toStatus" "TaskStatus",
  "fromAssigneeId" TEXT REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "toAssigneeId" TEXT REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "task_events_taskId_id_idx" ON "task_events"("taskId", "id");
