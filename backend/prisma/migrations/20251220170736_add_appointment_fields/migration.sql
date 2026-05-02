-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "confirmationMessage" TEXT,
ADD COLUMN     "introMessage" TEXT,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "picture" TEXT;
