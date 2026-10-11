CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE "contacts" (
  "id" TEXT PRIMARY KEY, "name" VARCHAR(150) NOT NULL, "organization" VARCHAR(200) NOT NULL,
  "jobTitle" VARCHAR(150) NOT NULL DEFAULT '', "phones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "email" VARCHAR(254), "notes" TEXT NOT NULL DEFAULT '', "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isKeyContact" BOOLEAN NOT NULL DEFAULT false, "isArchived" BOOLEAN NOT NULL DEFAULT false, "searchText" TEXT NOT NULL,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "updatedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contacts_arrays_check" CHECK (cardinality("phones") <= 10 AND cardinality("tags") <= 20)
);
CREATE INDEX "contacts_isArchived_id_idx" ON "contacts"("isArchived", "id");
CREATE INDEX "contacts_isKeyContact_isArchived_id_idx" ON "contacts"("isKeyContact", "isArchived", "id");
CREATE INDEX "contacts_tags_idx" ON "contacts" USING GIN ("tags");
CREATE INDEX "contacts_searchText_trgm_idx" ON "contacts" USING GIN ("searchText" gin_trgm_ops);
