-- CreateEnum
CREATE TYPE "TestCasePriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "TestDataType" AS ENUM ('INPUT', 'EXPECTED_OUTPUT', 'CREDENTIALS', 'CONFIGURATION', 'REFERENCE');

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "test_scenario_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preconditions" TEXT,
    "expected_result" TEXT NOT NULL,
    "priority" "TestCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_case_steps" (
    "id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expected_result" TEXT NOT NULL,

    CONSTRAINT "test_case_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_data" (
    "id" TEXT NOT NULL,
    "test_case_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TestDataType" NOT NULL DEFAULT 'INPUT',
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_cases_test_scenario_id_idx" ON "test_cases"("test_scenario_id");

-- CreateIndex
CREATE INDEX "test_case_steps_test_case_id_idx" ON "test_case_steps"("test_case_id");

-- CreateIndex
CREATE INDEX "test_data_test_case_id_idx" ON "test_data"("test_case_id");

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_test_scenario_id_fkey" FOREIGN KEY ("test_scenario_id") REFERENCES "test_scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_case_steps" ADD CONSTRAINT "test_case_steps_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_data" ADD CONSTRAINT "test_data_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
