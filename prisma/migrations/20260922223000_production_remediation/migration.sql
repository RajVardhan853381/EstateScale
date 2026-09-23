-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "aiSpendResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropIndex
DROP INDEX IF EXISTS "Message_organizationId_externalId_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Message_organizationId_externalId_key" ON "Message"("organizationId", "externalId");

-- DropTable
DROP TABLE IF EXISTS "OutboxEvent";
