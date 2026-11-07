-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "placeholder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenHash" TEXT;

-- CreateTable
CREATE TABLE "Claim" (
    "billId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "portions" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("billId","itemId","personId")
);

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_billId_itemId_fkey" FOREIGN KEY ("billId", "itemId") REFERENCES "Item"("billId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_billId_personId_fkey" FOREIGN KEY ("billId", "personId") REFERENCES "Person"("billId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

