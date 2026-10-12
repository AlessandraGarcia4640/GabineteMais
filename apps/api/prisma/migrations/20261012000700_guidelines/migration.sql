CREATE TYPE "GuidelineCategory" AS ENUM ('SESSOES', 'PRAZOS', 'ATENDIMENTO', 'EQUIPE', 'MAGISTRADO', 'OUTROS');
CREATE TABLE guidelines (
 id TEXT PRIMARY KEY, title VARCHAR(200) NOT NULL, category "GuidelineCategory" NOT NULL, content TEXT NOT NULL,
 "essentialForTransition" BOOLEAN NOT NULL DEFAULT false, "isArchived" BOOLEAN NOT NULL DEFAULT false, version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
 "createdById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, "updatedById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "guidelines_isArchived_id_idx" ON guidelines("isArchived", id);
CREATE INDEX "guidelines_essentialForTransition_isArchived_id_idx" ON guidelines("essentialForTransition", "isArchived", id);
CREATE TABLE guideline_versions (
 id TEXT PRIMARY KEY, "guidelineId" TEXT NOT NULL REFERENCES guidelines(id) ON DELETE RESTRICT, version INTEGER NOT NULL CHECK (version > 0),
 title VARCHAR(200) NOT NULL, category "GuidelineCategory" NOT NULL, content TEXT NOT NULL, "essentialForTransition" BOOLEAN NOT NULL,
 "authorId" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, "authorName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("guidelineId", version)
);
CREATE FUNCTION protect_guideline_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Guideline versions are immutable'; END $$;
CREATE TRIGGER guideline_version_immutable BEFORE UPDATE OR DELETE ON guideline_versions FOR EACH ROW EXECUTE FUNCTION protect_guideline_version();
