-- CreateTable
CREATE TABLE "OrganizationRazorpayConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "razorpayMerchantId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "merchantKeyId" TEXT,

    CONSTRAINT "OrganizationRazorpayConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRazorpayConnection_organizationId_key" ON "OrganizationRazorpayConnection"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationRazorpayConnection_razorpayMerchantId_idx" ON "OrganizationRazorpayConnection"("razorpayMerchantId");

-- AddForeignKey
ALTER TABLE "OrganizationRazorpayConnection" ADD CONSTRAINT "OrganizationRazorpayConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
