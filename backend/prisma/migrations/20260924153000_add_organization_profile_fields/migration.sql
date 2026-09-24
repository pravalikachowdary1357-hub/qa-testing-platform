-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "email" TEXT,
ADD COLUMN     "established_year" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "logo_content" BYTEA,
ADD COLUMN     "logo_file_name" TEXT,
ADD COLUMN     "logo_file_size" INTEGER,
ADD COLUMN     "logo_mime_type" TEXT,
ADD COLUMN     "org_reference_id" TEXT;

-- CreateTable
CREATE TABLE "organization_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_documents_organization_id_idx" ON "organization_documents"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_org_reference_id_key" ON "organizations"("org_reference_id");

-- AddForeignKey
ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

