-- AlterTable
ALTER TABLE "CostEntry" ADD COLUMN     "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
