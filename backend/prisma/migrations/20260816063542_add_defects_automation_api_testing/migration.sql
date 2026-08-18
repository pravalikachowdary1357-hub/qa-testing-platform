-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL');

-- CreateEnum
CREATE TYPE "DefectPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('UI', 'API', 'UNIT', 'INTEGRATION', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "AutomationFramework" AS ENUM ('PLAYWRIGHT', 'SELENIUM', 'CYPRESS', 'JEST', 'POSTMAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PASS', 'FAIL', 'BLOCKED', 'NOT_RUN');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "ApiAuthType" AS ENUM ('NONE', 'BEARER', 'BASIC', 'API_KEY');

-- CreateTable
CREATE TABLE "defects" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "environment_id" TEXT,
    "test_case_id" TEXT,
    "test_execution_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps_to_reproduce" TEXT NOT NULL,
    "expected_result" TEXT NOT NULL,
    "actual_result" TEXT NOT NULL,
    "severity" "DefectSeverity" NOT NULL DEFAULT 'MAJOR',
    "priority" "DefectPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "environment_id" TEXT,
    "name" TEXT NOT NULL,
    "type" "AutomationType" NOT NULL DEFAULT 'UI',
    "framework" "AutomationFramework" NOT NULL DEFAULT 'PLAYWRIGHT',
    "description" TEXT,
    "schedule" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_status" "AutomationRunStatus" NOT NULL DEFAULT 'NOT_RUN',
    "last_run_at" TIMESTAMP(3),
    "last_run_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_test_requests" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "environment_id" TEXT,
    "name" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "query_params" JSONB,
    "body" TEXT,
    "auth_type" "ApiAuthType" NOT NULL DEFAULT 'NONE',
    "auth_config" JSONB,
    "expected_status" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_test_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_test_executions" (
    "id" TEXT NOT NULL,
    "api_request_id" TEXT NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "response_headers" JSONB,
    "response_body" TEXT,
    "passed" BOOLEAN,
    "error_message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_test_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defects_product_id_idx" ON "defects"("product_id");

-- CreateIndex
CREATE INDEX "defects_environment_id_idx" ON "defects"("environment_id");

-- CreateIndex
CREATE INDEX "defects_test_case_id_idx" ON "defects"("test_case_id");

-- CreateIndex
CREATE INDEX "defects_test_execution_id_idx" ON "defects"("test_execution_id");

-- CreateIndex
CREATE INDEX "automations_test_case_id_idx" ON "automations"("test_case_id");

-- CreateIndex
CREATE INDEX "automations_environment_id_idx" ON "automations"("environment_id");

-- CreateIndex
CREATE INDEX "automation_runs_automation_id_idx" ON "automation_runs"("automation_id");

-- CreateIndex
CREATE INDEX "api_test_requests_product_id_idx" ON "api_test_requests"("product_id");

-- CreateIndex
CREATE INDEX "api_test_requests_environment_id_idx" ON "api_test_requests"("environment_id");

-- CreateIndex
CREATE INDEX "api_test_executions_api_request_id_idx" ON "api_test_executions"("api_request_id");

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_test_execution_id_fkey" FOREIGN KEY ("test_execution_id") REFERENCES "test_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_test_requests" ADD CONSTRAINT "api_test_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_test_requests" ADD CONSTRAINT "api_test_requests_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_test_executions" ADD CONSTRAINT "api_test_executions_api_request_id_fkey" FOREIGN KEY ("api_request_id") REFERENCES "api_test_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
