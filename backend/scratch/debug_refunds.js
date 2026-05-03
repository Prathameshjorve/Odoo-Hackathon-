const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('--- DEBUG: Refund Transactions ---');
  const refunds = await prisma.refundTransaction.findMany({
    include: {
      booking: {
        include: {
          appointment: true,
          user: true
        }
      }
    }
  });

  console.log(`Found ${refunds.length} total refund transactions.`);
  refunds.forEach(r => {
    console.log(`\nRefund ID: ${r.id}`);
    console.log(`Status: ${r.status}`);
    console.log(`Booking ID: ${r.bookingId}`);
    console.log(`Org ID from Appointment: ${r.booking?.appointment?.organizationId}`);
    console.log(`User ID: ${r.booking?.userId}`);
  });

  console.log('\n--- DEBUG: Organization Admins ---');
  const users = await prisma.user.findMany({
    where: { role: 'ORGANIZATION' }
  });
  users.forEach(u => {
    console.log(`User: ${u.email}, Role: ${u.role}, OrgID: ${u.organizationId}`);
  });

  await prisma.$disconnect();
}

debug().catch(console.error);
