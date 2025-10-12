-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "description" TEXT,
ADD COLUMN     "documents" TEXT[],
ADD COLUMN     "highlights" TEXT[],
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "metaDescription" VARCHAR(160),
ADD COLUMN     "photos" TEXT[],
ADD COLUMN     "summary" TEXT;
