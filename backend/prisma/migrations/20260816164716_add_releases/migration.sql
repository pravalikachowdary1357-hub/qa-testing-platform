-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('PLANNED', 'IN_TESTING', 'COMPLETED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "environment_id" TEXT,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'PLANNED',
    "release_date" TIMESTAMP(3),
    "notes" TEXT,
    "sign_off_by" TEXT,
    "sign_off_at" TIMESTAMP(3),
    "sign_off_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "releases_product_id_idx" ON "releases"("product_id");

-- CreateIndex
CREATE INDEX "releases_environment_id_idx" ON "releases"("environment_id");

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
