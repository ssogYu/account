-- DropForeignKey
ALTER TABLE "payment_accounts" DROP CONSTRAINT "payment_accounts_userId_fkey";

-- AlterTable
ALTER TABLE "payment_accounts" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
