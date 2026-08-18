-- CreateEnum
CREATE TYPE "PerformanceRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'STOPPED');

-- CreateTable
CREATE TABLE "performance_tests" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "environment_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_url" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "headers" JSONB,
    "body" TEXT,
    "virtual_users" INTEGER NOT NULL,
    "ramp_up_seconds" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "iterations" INTEGER,
    "threshold_response_time_ms" INTEGER,
    "threshold_error_rate_percent" DOUBLE PRECISION,
    "threshold_throughput_rps" DOUBLE PRECISION,
    "last_run_status" "PerformanceRunStatus",
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_test_runs" (
    "id" TEXT NOT NULL,
    "performance_test_id" TEXT NOT NULL,
    "status" "PerformanceRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "total_requests" INTEGER,
    "failed_requests" INTEGER,
    "avg_response_time_ms" DOUBLE PRECISION,
    "min_response_time_ms" DOUBLE PRECISION,
    "max_response_time_ms" DOUBLE PRECISION,
    "p95_response_time_ms" DOUBLE PRECISION,
    "throughput_rps" DOUBLE PRECISION,
    "error_rate_percent" DOUBLE PRECISION,
    "thresholds_passed" BOOLEAN,
    "error_message" TEXT,

    CONSTRAINT "performance_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_tests_product_id_idx" ON "performance_tests"("product_id");

-- CreateIndex
CREATE INDEX "performance_tests_environment_id_idx" ON "performance_tests"("environment_id");

-- CreateIndex
CREATE INDEX "performance_test_runs_performance_test_id_idx" ON "performance_test_runs"("performance_test_id");

-- AddForeignKey
ALTER TABLE "performance_tests" ADD CONSTRAINT "performance_tests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_tests" ADD CONSTRAINT "performance_tests_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_test_runs" ADD CONSTRAINT "performance_test_runs_performance_test_id_fkey" FOREIGN KEY ("performance_test_id") REFERENCES "performance_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
