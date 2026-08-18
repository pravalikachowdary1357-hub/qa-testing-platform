-- CreateEnum
CREATE TYPE "AiCapability" AS ENUM ('GENERATE_TEST_SCENARIOS', 'GENERATE_TEST_CASES', 'SUGGEST_TEST_DATA', 'ANALYZE_EXECUTION', 'SUMMARIZE_DEFECT', 'SUGGEST_DEFECT_SEVERITY', 'DUPLICATE_DEFECTS', 'ANALYZE_COVERAGE', 'EXPLAIN_RELEASE_RISKS', 'CHAT');

-- CreateEnum
CREATE TYPE "AiSuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EDITED_AND_ACCEPTED');

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "source_type" TEXT,
    "source_id" TEXT,
    "product_id" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_suggestions_product_id_idx" ON "ai_suggestions"("product_id");

-- CreateIndex
CREATE INDEX "ai_suggestions_capability_idx" ON "ai_suggestions"("capability");

-- CreateIndex
CREATE INDEX "ai_suggestions_source_type_source_id_idx" ON "ai_suggestions"("source_type", "source_id");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
