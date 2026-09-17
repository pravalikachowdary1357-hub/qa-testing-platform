-- CreateEnum
CREATE TYPE "RequirementRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
ALTER TYPE "RequirementStatus" ADD VALUE 'IN_REVIEW';

-- AlterTable
ALTER TABLE "requirements" ADD COLUMN     "owner_id" TEXT,
ADD COLUMN     "review_comment" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" TEXT,
ADD COLUMN     "risk_level" "RequirementRisk" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0';

-- CreateTable
CREATE TABLE "requirement_acceptance_criteria" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_attachments" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_versions" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changed_by_id" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "changes" TEXT,
    "comment" TEXT,

    CONSTRAINT "requirement_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requirement_acceptance_criteria_requirement_id_idx" ON "requirement_acceptance_criteria"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_attachments_requirement_id_idx" ON "requirement_attachments"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_versions_requirement_id_idx" ON "requirement_versions"("requirement_id");

-- CreateIndex
CREATE INDEX "requirements_owner_id_idx" ON "requirements"("owner_id");

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_acceptance_criteria" ADD CONSTRAINT "requirement_acceptance_criteria_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_attachments" ADD CONSTRAINT "requirement_attachments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
