CREATE TYPE "ChecklistStatus" AS ENUM ('POR_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA');
CREATE TABLE "checklist_templates" (
  "id" TEXT PRIMARY KEY, "routineId" TEXT NOT NULL REFERENCES "routines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "title" VARCHAR(200) NOT NULL, "items" TEXT[] NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "updatedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checklist_templates_items_check" CHECK (cardinality("items") BETWEEN 1 AND 100 AND "version" > 0)
);
CREATE INDEX "checklist_templates_routineId_isArchived_id_idx" ON "checklist_templates"("routineId", "isArchived", "id");
CREATE TABLE "checklist_runs" (
  "id" TEXT PRIMARY KEY, "templateId" TEXT NOT NULL REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "routineId" TEXT NOT NULL REFERENCES "routines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "assigneeId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "titleSnapshot" TEXT NOT NULL, "routineTitleSnapshot" TEXT NOT NULL, "instructionsSnapshot" TEXT NOT NULL,
  "frequencySnapshot" "RoutineFrequency" NOT NULL, "templateVersion" INTEGER NOT NULL,
  "periodKey" VARCHAR(40) NOT NULL, "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL,
  "status" "ChecklistStatus" NOT NULL DEFAULT 'POR_FAZER', "totalItems" INTEGER NOT NULL,
  "completedItems" INTEGER NOT NULL DEFAULT 0, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checklist_runs_period_check" CHECK ("periodEnd" > "periodStart"),
  CONSTRAINT "checklist_runs_progress_check" CHECK ("totalItems" BETWEEN 1 AND 100 AND "completedItems" BETWEEN 0 AND "totalItems" AND "templateVersion" > 0),
  CONSTRAINT "checklist_runs_status_check" CHECK (
    ("status" = 'POR_FAZER' AND "completedItems" = 0 AND "completedAt" IS NULL) OR
    ("status" = 'EM_ANDAMENTO' AND "completedItems" > 0 AND "completedItems" < "totalItems" AND "completedAt" IS NULL) OR
    ("status" = 'CONCLUIDA' AND "completedItems" = "totalItems" AND "completedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "checklist_runs_templateId_periodKey_key" ON "checklist_runs"("templateId", "periodKey");
CREATE INDEX "checklist_runs_assigneeId_periodStart_id_idx" ON "checklist_runs"("assigneeId", "periodStart", "id");
CREATE INDEX "checklist_runs_routineId_periodStart_id_idx" ON "checklist_runs"("routineId", "periodStart", "id");
CREATE TABLE "checklist_run_items" (
  "id" TEXT PRIMARY KEY, "runId" TEXT NOT NULL REFERENCES "checklist_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "position" INTEGER NOT NULL, "text" TEXT NOT NULL, "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedById" TEXT REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "completedAt" TIMESTAMP(3),
  CONSTRAINT "checklist_run_items_position_check" CHECK ("position" BETWEEN 0 AND 99),
  CONSTRAINT "checklist_run_items_completion_check" CHECK (
    ("isCompleted" AND "completedById" IS NOT NULL AND "completedAt" IS NOT NULL) OR
    (NOT "isCompleted" AND "completedById" IS NULL AND "completedAt" IS NULL))
);
CREATE UNIQUE INDEX "checklist_run_items_runId_position_key" ON "checklist_run_items"("runId", "position");
