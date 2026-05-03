-- AlterTable
ALTER TABLE `user` ADD COLUMN `lastOtpSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `OtpRecord` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `otpCode` VARCHAR(191) NOT NULL,
    `purpose` ENUM('SIGNUP', 'LOGIN', 'PASSWORD_RESET') NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OtpRecord_email_purpose_idx`(`email`, `purpose`),
    INDEX `OtpRecord_otpCode_idx`(`otpCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
