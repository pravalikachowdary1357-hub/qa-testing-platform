-- CreateEnum
CREATE TYPE "SecurityTestType" AS ENUM ('SAST', 'DAST', 'PENETRATION_TEST', 'VULNERABILITY_SCAN', 'DEPENDENCY_SCAN', 'CONFIGURATION_AUDIT', 'CODE_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "SecurityTestStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "VulnerabilityStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "security_tests" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "environment_id" TEXT,
    "test_case_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" TEXT NOT NULL,
    "test_type" "SecurityTestType" NOT NULL DEFAULT 'VULNERABILITY_SCAN',
    "configuration" TEXT,
    "status" "SecurityTestStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "last_executed_at" TIMESTAMP(3),
    "last_run_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_findings" (
    "id" TEXT NOT NULL,
    "security_test_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL DEFAULT 'MEDIUM',
    "evidence" TEXT,
    "recommendation" TEXT NOT NULL,
    "status" "VulnerabilityStatus" NOT NULL DEFAULT 'OPEN',
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_tests_product_id_idx" ON "security_tests"("product_id");

-- CreateIndex
CREATE INDEX "security_tests_environment_id_idx" ON "security_tests"("environment_id");

-- CreateIndex
CREATE INDEX "security_tests_test_case_id_idx" ON "security_tests"("test_case_id");

-- CreateIndex
CREATE INDEX "security_findings_security_test_id_idx" ON "security_findings"("security_test_id");

-- AddForeignKey
ALTER TABLE "security_tests" ADD CONSTRAINT "security_tests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_tests" ADD CONSTRAINT "security_tests_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_tests" ADD CONSTRAINT "security_tests_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_security_test_id_fkey" FOREIGN KEY ("security_test_id") REFERENCES "security_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
