-- CreateTable
CREATE TABLE "bill_attachments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "objectName" VARCHAR(255) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "billId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bill_attachments_userId_contentHash_key" ON "bill_attachments"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "bill_attachments_billId_idx" ON "bill_attachments"("billId");

-- AddForeignKey
ALTER TABLE "bill_attachments" ADD CONSTRAINT "bill_attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_attachments" ADD CONSTRAINT "bill_attachments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
