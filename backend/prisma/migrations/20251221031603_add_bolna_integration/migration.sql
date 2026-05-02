-- CreateEnum
CREATE TYPE "BolnaCallStatus" AS ENUM ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "bolnaApiKey" TEXT;

-- CreateTable
CREATE TABLE "BolnaAgent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bolnaAgentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "voiceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BolnaAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BolnaCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "bolnaCallId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "status" "BolnaCallStatus" NOT NULL DEFAULT 'INITIATED',
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BolnaCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BolnaAgent_bolnaAgentId_key" ON "BolnaAgent"("bolnaAgentId");

-- CreateIndex
CREATE INDEX "BolnaAgent_organizationId_idx" ON "BolnaAgent"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BolnaCall_bolnaCallId_key" ON "BolnaCall"("bolnaCallId");

-- CreateIndex
CREATE INDEX "BolnaCall_organizationId_idx" ON "BolnaCall"("organizationId");

-- CreateIndex
CREATE INDEX "BolnaCall_agentId_idx" ON "BolnaCall"("agentId");

-- CreateIndex
CREATE INDEX "BolnaCall_status_idx" ON "BolnaCall"("status");

-- CreateIndex
CREATE INDEX "BolnaCall_createdAt_idx" ON "BolnaCall"("createdAt");

-- AddForeignKey
ALTER TABLE "BolnaAgent" ADD CONSTRAINT "BolnaAgent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BolnaCall" ADD CONSTRAINT "BolnaCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BolnaCall" ADD CONSTRAINT "BolnaCall_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BolnaAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
