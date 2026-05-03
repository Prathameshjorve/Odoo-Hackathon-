const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const bookingId = 'cmop7xam10001ph5ozq83krrv';
  console.log(`--- DEBUG: Booking ${bookingId} ---`);
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      appointment: true,
      user: true,
      refundTransaction: true
    }
  });

  if (!booking) {
    console.log('Booking NOT FOUND in database!');
  } else {
    console.log('Booking found.');
    console.log(`Payment Status: ${booking.paymentStatus}`);
    console.log(`Refund Transaction exists: ${!!booking.refundTransaction}`);
    if (booking.refundTransaction) {
      console.log(`Refund Status: ${booking.refundTransaction.status}`);
      console.log(`Refund ID: ${booking.refundTransaction.id}`);
    }
  }

  const allRefunds = await prisma.refundTransaction.findMany();
  console.log(`\nTotal RefundTransactions in DB: ${allRefunds.length}`);

  await prisma.$disconnect();
}

debug().catch(console.error);
