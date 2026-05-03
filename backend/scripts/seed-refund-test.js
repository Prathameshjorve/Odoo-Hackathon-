const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  try {
    // Create or get organization admin
    const adminEmail = 'admin@bookfastx.com';
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      console.log('Admin not found, run setup-admin.js first');
      return;
    }

    // Create organization if none
    let org = await prisma.organization.findFirst({ where: { adminId: admin.id } });
    if (!org) {
      org = await prisma.organization.create({ data: { name: 'Test Org', location: 'Test Location', businessHours: [], adminId: admin.id } });
      await prisma.user.update({ where: { id: admin.id }, data: { organizationId: org.id } });
    }

    // Create refund policy for org if not exists
    let policy = await prisma.refundPolicy.findUnique({ where: { organizationId: org.id } }).catch(()=>null);
    if (!policy) {
      policy = await prisma.refundPolicy.create({ data: { organizationId: org.id, fullRefundHours: 48, partialRefundHours: 24, partialRefundPercent: 50, processingFee: 0 } });
    }

    // Create a regular user
    const userEmail = 'testuser@example.com';
    const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
    let user = existingUser;
    if (!existingUser) {
      const hashed = await bcrypt.hash('user12345', 10);
      user = await prisma.user.create({ data: { email: userEmail, password: hashed, name: 'Test User', emailVerified: true } });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({ data: { title: 'Smoke Test Appointment', durationMinutes: 60, bookType: 'USER', assignmentType: 'AUTOMATIC', cancellationHours: 24, schedule: [], questions: [], price: 1000, isPublished: true, organizationId: org.id } });

    // Create booking in future
    const start = new Date(Date.now() + 1000 * 60 * 60 * 72); // 72 hours from now
    const booking = await prisma.booking.create({ data: { appointmentId: appointment.id, userId: user.id, startTime: start, endTime: new Date(start.getTime() + 1000*60*60), numberOfSlots: 1, paymentStatus: 'PAID', bookingStatus: 'CONFIRMED', totalAmount: 1000, amountPaid: 1000, razorpayPaymentId: 'pay_test_123' } });

    // Create refund transaction
    const refund = await prisma.refundTransaction.create({ data: { bookingId: booking.id, amount: 1000, status: 'PENDING', attempts: 0, reason: 'Smoke test' } });

    console.log('Seed completed:');
    console.log('  orgId:', org.id);
    console.log('  adminEmail:', adminEmail);
    console.log('  userEmail:', userEmail, 'password: user12345');
    console.log('  bookingId:', booking.id);
    console.log('  refundId:', refund.id);
  } catch (e) {
    console.error('Seed error', e);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
