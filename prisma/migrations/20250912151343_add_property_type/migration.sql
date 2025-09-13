-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "propertyType" VARCHAR(50) DEFAULT 'default';

-- CreateIndex
CREATE INDEX "listings_propertyType_idx" ON "listings"("propertyType");
