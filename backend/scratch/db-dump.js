const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const counts = {
      users: await prisma.user.count(),
      organizations: await prisma.organization.count(),
      appointments: await prisma.appointment.count(),
      bookings: await prisma.booking.count(),
      resources: await prisma.resource.count(),
      refunds: await prisma.refundTransaction.count(),
    };

    console.log('Database Statistics:');
    console.log(JSON.stringify(counts, null, 2));

    // Get latest 5 users
    const latestUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    console.log('\nLatest 5 Users:');
    console.log(JSON.stringify(latestUsers, null, 2));

    // Get latest 5 bookings
    const latestBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: { select: { title: true } },
        user: { select: { email: true } }
      }
    });
    console.log('\nLatest 5 Bookings:');
    console.log(JSON.stringify(latestBookings, null, 2));

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
