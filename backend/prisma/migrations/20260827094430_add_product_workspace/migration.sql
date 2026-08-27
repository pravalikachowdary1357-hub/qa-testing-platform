-- AlterTable
ALTER TABLE "api_test_requests" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "automations" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "defects" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "performance_tests" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "product_documents" ADD COLUMN     "related_version" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "application_url" TEXT,
ADD COLUMN     "current_version" TEXT,
ADD COLUMN     "product_owner_id" TEXT,
ADD COLUMN     "repository_url" TEXT;

-- AlterTable
ALTER TABLE "requirements" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "security_tests" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "test_executions" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "test_plans" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "test_scenarios" ADD COLUMN     "release_id" TEXT;

-- AlterTable
ALTER TABLE "uat_cycles" ADD COLUMN     "release_id" TEXT;

-- CreateTable
CREATE TABLE "product_components" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_team_members" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "responsibility" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_components_product_id_idx" ON "product_components"("product_id");

-- CreateIndex
CREATE INDEX "product_team_members_product_id_idx" ON "product_team_members"("product_id");

-- CreateIndex
CREATE INDEX "product_team_members_user_id_idx" ON "product_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_team_members_product_id_user_id_key" ON "product_team_members"("product_id", "user_id");

-- CreateIndex
CREATE INDEX "api_test_requests_release_id_idx" ON "api_test_requests"("release_id");

-- CreateIndex
CREATE INDEX "automations_release_id_idx" ON "automations"("release_id");

-- CreateIndex
CREATE INDEX "defects_release_id_idx" ON "defects"("release_id");

-- CreateIndex
CREATE INDEX "performance_tests_release_id_idx" ON "performance_tests"("release_id");

-- CreateIndex
CREATE INDEX "products_product_owner_id_idx" ON "products"("product_owner_id");

-- CreateIndex
CREATE INDEX "requirements_release_id_idx" ON "requirements"("release_id");

-- CreateIndex
CREATE INDEX "security_tests_release_id_idx" ON "security_tests"("release_id");

-- CreateIndex
CREATE INDEX "test_cases_release_id_idx" ON "test_cases"("release_id");

-- CreateIndex
CREATE INDEX "test_executions_release_id_idx" ON "test_executions"("release_id");

-- CreateIndex
CREATE INDEX "test_plans_release_id_idx" ON "test_plans"("release_id");

-- CreateIndex
CREATE INDEX "test_scenarios_release_id_idx" ON "test_scenarios"("release_id");

-- CreateIndex
CREATE INDEX "uat_cycles_release_id_idx" ON "uat_cycles"("release_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_owner_id_fkey" FOREIGN KEY ("product_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_team_members" ADD CONSTRAINT "product_team_members_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_team_members" ADD CONSTRAINT "product_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_scenarios" ADD CONSTRAINT "test_scenarios_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_test_requests" ADD CONSTRAINT "api_test_requests_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_tests" ADD CONSTRAINT "performance_tests_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_tests" ADD CONSTRAINT "security_tests_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_cycles" ADD CONSTRAINT "uat_cycles_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
