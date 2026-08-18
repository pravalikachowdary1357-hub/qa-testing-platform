-- CreateEnum
CREATE TYPE "UatCycleStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UatExecutionStatus" AS ENUM ('NOT_RUN', 'PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "uat_cycles" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "UatCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "sign_off_by" TEXT,
    "sign_off_at" TIMESTAMP(3),
    "sign_off_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uat_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uat_test_cases" (
    "id" TEXT NOT NULL,
    "uat_cycle_id" TEXT NOT NULL,
    "requirement_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expected_result" TEXT NOT NULL,
    "assigned_tester" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uat_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uat_test_case_steps" (
    "id" TEXT NOT NULL,
    "uat_test_case_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expected_result" TEXT NOT NULL,

    CONSTRAINT "uat_test_case_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uat_executions" (
    "id" TEXT NOT NULL,
    "uat_test_case_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "defect_id" TEXT,
    "status" "UatExecutionStatus" NOT NULL DEFAULT 'NOT_RUN',
    "actual_result" TEXT,
    "notes" TEXT,
    "evidence" TEXT,
    "executed_by" TEXT NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uat_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uat_cycles_product_id_idx" ON "uat_cycles"("product_id");

-- CreateIndex
CREATE INDEX "uat_test_cases_uat_cycle_id_idx" ON "uat_test_cases"("uat_cycle_id");

-- CreateIndex
CREATE INDEX "uat_test_cases_requirement_id_idx" ON "uat_test_cases"("requirement_id");

-- CreateIndex
CREATE INDEX "uat_test_case_steps_uat_test_case_id_idx" ON "uat_test_case_steps"("uat_test_case_id");

-- CreateIndex
CREATE INDEX "uat_executions_uat_test_case_id_idx" ON "uat_executions"("uat_test_case_id");

-- CreateIndex
CREATE INDEX "uat_executions_environment_id_idx" ON "uat_executions"("environment_id");

-- CreateIndex
CREATE INDEX "uat_executions_defect_id_idx" ON "uat_executions"("defect_id");

-- AddForeignKey
ALTER TABLE "uat_cycles" ADD CONSTRAINT "uat_cycles_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_test_cases" ADD CONSTRAINT "uat_test_cases_uat_cycle_id_fkey" FOREIGN KEY ("uat_cycle_id") REFERENCES "uat_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_test_cases" ADD CONSTRAINT "uat_test_cases_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_test_case_steps" ADD CONSTRAINT "uat_test_case_steps_uat_test_case_id_fkey" FOREIGN KEY ("uat_test_case_id") REFERENCES "uat_test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_executions" ADD CONSTRAINT "uat_executions_uat_test_case_id_fkey" FOREIGN KEY ("uat_test_case_id") REFERENCES "uat_test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_executions" ADD CONSTRAINT "uat_executions_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uat_executions" ADD CONSTRAINT "uat_executions_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
