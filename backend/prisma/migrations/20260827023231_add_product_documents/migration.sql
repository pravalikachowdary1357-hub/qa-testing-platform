-- CreateEnum
CREATE TYPE "ProductDocumentType" AS ENUM ('PRODUCT_REQUIREMENTS_BRD', 'FUNCTIONAL_SPEC_FRD', 'TECHNICAL_SPEC', 'USER_MANUAL', 'ARCHITECTURE_DESIGN', 'API_DOCUMENTATION', 'RELEASE_NOTES', 'INSTALLATION_DEPLOYMENT_GUIDE', 'CONFIGURATION_DOCUMENTS', 'COMPLIANCE_REGULATORY', 'REFERENCE_DOCUMENTS', 'OTHER_SUPPORTING_FILES');

-- CreateEnum
CREATE TYPE "ProductDocumentStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "product_documents" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "document_type" "ProductDocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "status" "ProductDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "description" TEXT,
    "status" "ProductDocumentStatus" NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_documents_product_id_idx" ON "product_documents"("product_id");

-- CreateIndex
CREATE INDEX "product_document_versions_document_id_idx" ON "product_document_versions"("document_id");

-- AddForeignKey
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_document_versions" ADD CONSTRAINT "product_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "product_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
