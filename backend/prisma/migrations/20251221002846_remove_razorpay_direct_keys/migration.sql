/*
  Warnings:

  - You are about to drop the column `razorpayKeyId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayKeySecret` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "razorpayKeyId",
DROP COLUMN "razorpayKeySecret";
