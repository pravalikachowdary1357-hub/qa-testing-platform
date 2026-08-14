-- CreateEnum
CREATE TYPE "TestPlanStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestPlanPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "test_plans" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TestPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "TestPlanPriority" NOT NULL DEFAULT 'MEDIUM',
    "owner" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TestPlanRequirements" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TestPlanRequirements_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "test_plans_product_id_idx" ON "test_plans"("product_id");

-- CreateIndex
CREATE INDEX "_TestPlanRequirements_B_index" ON "_TestPlanRequirements"("B");

-- AddForeignKey
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TestPlanRequirements" ADD CONSTRAINT "_TestPlanRequirements_A_fkey" FOREIGN KEY ("A") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TestPlanRequirements" ADD CONSTRAINT "_TestPlanRequirements_B_fkey" FOREIGN KEY ("B") REFERENCES "test_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
