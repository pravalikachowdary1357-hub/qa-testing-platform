-- CreateEnum
CREATE TYPE "TestScenarioType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'INTEGRATION', 'SMOKE', 'EDGE_CASE');

-- CreateEnum
CREATE TYPE "TestScenarioPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TestScenarioStatus" AS ENUM ('DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateTable
CREATE TABLE "test_scenarios" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "requirement_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TestScenarioType" NOT NULL DEFAULT 'FUNCTIONAL',
    "priority" "TestScenarioPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TestScenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_scenarios_product_id_idx" ON "test_scenarios"("product_id");

-- CreateIndex
CREATE INDEX "test_scenarios_requirement_id_idx" ON "test_scenarios"("requirement_id");

-- AddForeignKey
ALTER TABLE "test_scenarios" ADD CONSTRAINT "test_scenarios_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_scenarios" ADD CONSTRAINT "test_scenarios_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
