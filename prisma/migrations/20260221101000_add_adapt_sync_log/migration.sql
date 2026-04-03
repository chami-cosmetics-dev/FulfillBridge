-- CreateTable
CREATE TABLE "AdaptSyncLog" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdaptSyncLog_shop_createdAt_idx" ON "AdaptSyncLog"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AdaptSyncLog_shop_status_createdAt_idx" ON "AdaptSyncLog"("shop", "status", "createdAt");
