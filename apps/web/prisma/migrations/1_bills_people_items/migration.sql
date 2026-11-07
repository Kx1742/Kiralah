-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "adjustments" JSONB,
ADD COLUMN     "cashRounding" BOOLEAN NOT NULL,
ADD COLUMN     "charges" JSONB,
ADD COLUMN     "discounts" JSONB,
ADD COLUMN     "editTokenHash" TEXT NOT NULL,
ADD COLUMN     "equalTotalSen" INTEGER,
ADD COLUMN     "locale" TEXT NOT NULL,
ADD COLUMN     "mode" TEXT NOT NULL,
ADD COLUMN     "payerId" TEXT NOT NULL,
ADD COLUMN     "paymentAccount" TEXT,
ADD COLUMN     "paymentBankName" TEXT,
ADD COLUMN     "paymentPhone" TEXT,
ADD COLUMN     "paymentQr" BYTEA,
ADD COLUMN     "paymentQrType" TEXT,
ADD COLUMN     "receiptTotalSen" INTEGER,
ADD COLUMN     "restaurantName" TEXT;

-- CreateTable
CREATE TABLE "Person" (
    "billId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("billId","id")
);

-- CreateTable
CREATE TABLE "Item" (
    "billId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSen" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("billId","id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

