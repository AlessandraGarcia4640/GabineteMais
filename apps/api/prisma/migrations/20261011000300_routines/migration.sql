CREATE TYPE "RoutineFrequency" AS ENUM ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'EVENTUAL', 'PERSONALIZADA', 'A_DEFINIR');
CREATE TABLE "routines" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "frequency" "RoutineFrequency" NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "instructions" TEXT NOT NULL DEFAULT '',
  "steps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "frequencyDetails" TEXT,
  "specificDate" DATE,
  "defaultPosition" "UserPosition",
  "essentialForTransition" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "routines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "routines_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "routines_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "routines_custom_frequency_check" CHECK ("frequency" <> 'PERSONALIZADA' OR NULLIF(btrim("frequencyDetails"), '') IS NOT NULL)
);
CREATE INDEX "routines_isArchived_id_idx" ON "routines"("isArchived", "id");
CREATE INDEX "routines_frequency_isArchived_id_idx" ON "routines"("frequency", "isArchived", "id");
CREATE INDEX "routines_category_isArchived_id_idx" ON "routines"("category", "isArchived", "id");
