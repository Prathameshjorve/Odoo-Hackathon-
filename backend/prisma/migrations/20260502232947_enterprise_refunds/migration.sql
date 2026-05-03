/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `RefundTransaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rules` to the `RefundPolicy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `blackoutDates` JSON NULL,
    ADD COLUMN `bufferMinutes` INTEGER NULL DEFAULT 15,
    ADD COLUMN `dailyCapacity` INTEGER NULL,
    ADD COLUMN `timezone` VARCHAR(191) NULL,
    ADD COLUMN `weeklyCapacity` INTEGER NULL;

-- AlterTable
ALTER TABLE `organization` ADD COLUMN `blackoutDates` JSON NULL,
    ADD COLUMN `timezone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `refundpolicy` ADD COLUMN `autoProcessAbove` INTEGER NULL,
    ADD COLUMN `globalProcessingFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `requiresApproval` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `rules` JSON NULL,
    ADD COLUMN `specialRules` JSON NULL;

UPDATE `refundpolicy`
SET `rules` = JSON_ARRAY()
WHERE `rules` IS NULL;

ALTER TABLE `refundpolicy` MODIFY `rules` JSON NOT NULL;

-- AlterTable
ALTER TABLE `refundtransaction` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `gatewayFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
    ADD COLUMN `lastError` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `netAmount` INTEGER NULL,
    ADD COLUMN `originalAmount` INTEGER NULL,
    ADD COLUMN `processedAt` DATETIME(3) NULL,
    ADD COLUMN `processedBy` VARCHAR(191) NULL,
    ADD COLUMN `processingFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL,
    ADD COLUMN `razorpayWebhookId` VARCHAR(191) NULL,
    ADD COLUMN `reasonDetails` VARCHAR(191) NULL,
    ADD COLUMN `refundAmount` INTEGER NULL,
    ADD COLUMN `refundReason` ENUM('CUSTOMER_REQUEST', 'EVENT_CANCELLED', 'EVENT_RESCHEDULED', 'DUPLICATE_PAYMENT', 'FRAUDULENT', 'SERVICE_ISSUE', 'TECHNICAL_ERROR', 'OTHER') NULL,
    ADD COLUMN `refundType` ENUM('FULL', 'PARTIAL', 'CUSTOM') NOT NULL DEFAULT 'FULL',
    ADD COLUMN `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `requestedBy` VARCHAR(191) NULL,
    ADD COLUMN `retryCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `statusHistory` JSON NULL,
    MODIFY `amount` INTEGER NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED', 'REJECTED', 'REQUIRES_MANUAL') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `RefundEvent` (
    `id` VARCHAR(191) NOT NULL,
    `refundTransactionId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RefundEvent_refundTransactionId_idx`(`refundTransactionId`),
    INDEX `RefundEvent_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `signature` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processedAt` DATETIME(3) NULL,
    `lastError` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefundWebhookEvent_eventId_key`(`eventId`),
    INDEX `RefundWebhookEvent_eventType_idx`(`eventType`),
    INDEX `RefundWebhookEvent_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundRetryQueue` (
    `id` VARCHAR(191) NOT NULL,
    `refundTransactionId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `lastError` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    INDEX `RefundRetryQueue_refundTransactionId_idx`(`refundTransactionId`),
    INDEX `RefundRetryQueue_status_idx`(`status`),
    INDEX `RefundRetryQueue_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `RefundTransaction_idempotencyKey_key` ON `RefundTransaction`(`idempotencyKey`);

-- CreateIndex
CREATE INDEX `RefundTransaction_razorpayRefundId_idx` ON `RefundTransaction`(`razorpayRefundId`);

-- AddForeignKey
ALTER TABLE `RefundEvent` ADD CONSTRAINT `RefundEvent_refundTransactionId_fkey` FOREIGN KEY (`refundTransactionId`) REFERENCES `RefundTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRetryQueue` ADD CONSTRAINT `RefundRetryQueue_refundTransactionId_fkey` FOREIGN KEY (`refundTransactionId`) REFERENCES `RefundTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
