-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "s3_key_original" TEXT,
    "s3_key_variants" JSONB,
    "mime" VARCHAR(50),
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" BIGINT,
    "status" "PhotoStatus" NOT NULL DEFAULT 'UPLOADING',
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "original_name" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "uploaded_by" TEXT,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photos_listing_id_idx" ON "photos"("listing_id");

-- CreateIndex
CREATE INDEX "photos_status_idx" ON "photos"("status");

-- CreateIndex
CREATE INDEX "photos_is_cover_idx" ON "photos"("is_cover");

-- CreateIndex
CREATE INDEX "photos_sort_order_idx" ON "photos"("sort_order");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
