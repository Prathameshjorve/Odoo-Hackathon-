-- AlterTable
ALTER TABLE `booking` ADD COLUMN `amountPaid` INTEGER NULL,
    ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL;
