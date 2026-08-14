-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('DEVELOPMENT', 'QA', 'STAGING', 'UAT', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "EnvironmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TestExecutionStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'BLOCKED');

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnvironmentType" NOT NULL DEFAULT 'DEVELOPMENT',
    "status" "EnvironmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "base_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_executions" (
    "id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "test_data_id" TEXT,
    "status" "TestExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "actual_result" TEXT,
    "notes" TEXT,
    "executed_by" TEXT NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "environments_product_id_idx" ON "environments"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "environments_product_id_name_key" ON "environments"("product_id", "name");

-- CreateIndex
CREATE INDEX "test_executions_test_case_id_idx" ON "test_executions"("test_case_id");

-- CreateIndex
CREATE INDEX "test_executions_environment_id_idx" ON "test_executions"("environment_id");

-- CreateIndex
CREATE INDEX "test_executions_test_data_id_idx" ON "test_executions"("test_data_id");

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_test_data_id_fkey" FOREIGN KEY ("test_data_id") REFERENCES "test_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;
