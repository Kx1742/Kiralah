-- CreateTable
CREATE TABLE "DailyStat" (
    "day" DATE NOT NULL,
    "billsCreated" INTEGER NOT NULL DEFAULT 0,
    "people" INTEGER NOT NULL DEFAULT 0,
    "senSplit" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("day")
);

