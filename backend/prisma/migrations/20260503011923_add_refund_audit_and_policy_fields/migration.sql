-- AlterTable
ALTER TABLE `refundpolicy` ADD COLUMN `allowAutoApproval` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `allowWalletCredits` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `maxRefundRequestsPerBooking` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `maxRefundRequestsPerUserPerMonth` INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `refundtransaction` ADD COLUMN `eligibilityMessage` VARCHAR(191) NULL,
    ADD COLUMN `emergencyRefund` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `failedAt` DATETIME(3) NULL,
    ADD COLUMN `overrideAmount` INTEGER NULL,
    ADD COLUMN `refundBreakdown` JSON NULL,
    ADD COLUMN `requestedByRole` VARCHAR(191) NULL,
    ADD COLUMN `ruleApplied` VARCHAR(191) NULL,
    ADD COLUMN `timeline` JSON NULL;

-- CreateTable
CREATE TABLE `RefundAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `refundTransactionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RefundAuditLog_refundTransactionId_idx`(`refundTransactionId`),
    INDEX `RefundAuditLog_userId_idx`(`userId`),
    INDEX `RefundAuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefundAuditLog` ADD CONSTRAINT `RefundAuditLog_refundTransactionId_fkey` FOREIGN KEY (`refundTransactionId`) REFERENCES `RefundTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundAuditLog` ADD CONSTRAINT `RefundAuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
