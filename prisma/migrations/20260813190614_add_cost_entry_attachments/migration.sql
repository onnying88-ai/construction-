-- AlterEnum
ALTER TYPE "AttachmentEntity" ADD VALUE 'COST_ENTRY';

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "costEntryId" TEXT;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_costEntryId_fkey" FOREIGN KEY ("costEntryId") REFERENCES "CostEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
