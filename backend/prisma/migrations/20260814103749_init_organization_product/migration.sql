-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ReleaseReadiness" AS ENUM ('READY', 'CONDITIONAL', 'NOT_READY');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "environment" TEXT NOT NULL,
    "release" TEXT NOT NULL,
    "test_coverage" INTEGER NOT NULL,
    "pass_rate" INTEGER NOT NULL,
    "open_defects" INTEGER NOT NULL DEFAULT 0,
    "release_readiness" "ReleaseReadiness" NOT NULL DEFAULT 'NOT_READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
