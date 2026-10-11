CREATE TYPE "UserPosition" AS ENUM ('MAGISTRADO_GESTOR', 'ASSESSOR_CHEFE', 'ASSESSOR', 'APOIO');

CREATE TABLE "user_position_history" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "position" "UserPosition" NOT NULL,
  "role" "UserRole" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "user_position_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_position_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_position_history_period_check" CHECK ("endedAt" IS NULL OR "endedAt" > "startedAt")
);

CREATE INDEX "user_position_history_userId_startedAt_idx" ON "user_position_history"("userId", "startedAt");
CREATE UNIQUE INDEX "user_position_history_one_current_idx" ON "user_position_history"("userId") WHERE "endedAt" IS NULL;

-- Preserve existing users and record their initial position from the existing role.
INSERT INTO "user_position_history" ("id", "userId", "position", "role", "startedAt")
SELECT "id" || ':initial', "id",
  (CASE "role" WHEN 'CHEFE' THEN 'ASSESSOR_CHEFE' WHEN 'ASSESSOR' THEN 'ASSESSOR' ELSE 'APOIO' END)::"UserPosition",
  "role", "createdAt"
FROM "users";
