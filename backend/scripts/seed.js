const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const indianFirstNames = [
    'Arjun', 'Aditya', 'Ishaan', 'Vihaan', 'Pranav', 'Rohan', 'Siddharth', 'Aarav', 'Vivaan', 'Ananya', 
    'Diya', 'Isha', 'Myra', 'Navya', 'Saanvi', 'Zoya', 'Priya', 'Neha', 'Rahul', 'Sneha', 
    'Amit', 'Pooja', 'Vikram', 'Anjali', 'Karan', 'Meera', 'Suresh', 'Deepa', 'Rajesh', 'Sunita'
];
const indianLastNames = [
    'Sharma', 'Verma', 'Gupta', 'Malhotra', 'Kapoor', 'Khanna', 'Mehta', 'Joshi', 'Patel', 'Reddy', 
    'Nair', 'Iyer', 'Singh', 'Kumar', 'Das', 'Chatterjee', 'Dubey', 'Trivedi', 'Agarwal', 'Shah'
];

function getRandomIndianName() {
    const first = faker.helpers.arrayElement(indianFirstNames);
    const last = faker.helpers.arrayElement(indianLastNames);
    return `${first} ${last}`;
}

async function main() {
    console.log('--- Seeding Data ---');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create 100+ Customers
    console.log('Creating 110 Customers...');
    const customers = [];
    for (let i = 0; i < 110; i++) {
        const name = getRandomIndianName();
        const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase();
        
        // Ensure uniqueness
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) continue;

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'USER',
                emailVerified: true
            }
        });
        customers.push(user);
    }

    // 2. Create 12 Organisers (Users + Organizations)
    console.log('Creating 12 Organisers and Organizations...');
    const organizations = [];
    const serviceTypes = [
        { name: 'Doctor Consultation', duration: 30, priceRange: [500, 2000] },
        { name: 'Gym Personal Training', duration: 60, priceRange: [800, 3000] },
        { name: 'Hair Salon / Spa', duration: 45, priceRange: [300, 5000] },
        { name: 'Math Tutoring', duration: 60, priceRange: [400, 1500] },
        { name: 'Legal Advice', duration: 45, priceRange: [1000, 10000] },
        { name: 'Yoga Class', duration: 60, priceRange: [200, 1000] },
        { name: 'Dentist Checkup', duration: 30, priceRange: [300, 1500] },
        { name: 'Driving Lesson', duration: 60, priceRange: [500, 1200] }
    ];

    for (let i = 0; i < 12; i++) {
        const name = getRandomIndianName();
        const email = `org_${i}_${faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase()}`;
        
        const orgUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'ORGANIZATION',
                emailVerified: true
            }
        });

        const org = await prisma.organization.create({
            data: {
                name: `${name.split(' ')[1]}'s ${faker.company.buzzNoun()} ${faker.company.buzzAdjective()} Services`,
                location: faker.location.city() + ', India',
                description: faker.company.catchPhrase(),
                businessHours: {
                    monday: { open: '09:00', close: '18:00' },
                    tuesday: { open: '09:00', close: '18:00' },
                    wednesday: { open: '09:00', close: '18:00' },
                    thursday: { open: '09:00', close: '18:00' },
                    friday: { open: '09:00', close: '18:00' },
                    saturday: { open: '10:00', close: '14:00' },
                    sunday: { open: 'closed', close: 'closed' }
                },
                adminId: orgUser.id
            }
        });
        organizations.push(org);

        // Create 2-3 services for each org
        const numServices = faker.number.int({ min: 2, max: 3 });
        for (let j = 0; j < numServices; j++) {
            const type = faker.helpers.arrayElement(serviceTypes);
            await prisma.appointment.create({
                data: {
                    title: type.name,
                    description: faker.commerce.productDescription(),
                    durationMinutes: type.duration,
                    bookType: 'USER',
                    assignmentType: 'AUTOMATIC',
                    price: faker.number.int({ min: type.priceRange[0], max: type.priceRange[1] }),
                    cancellationHours: 24,
                    schedule: {}, // Generic schedule
                    questions: [],
                    isPublished: true,
                    organizationId: org.id
                }
            });
        }
    }

    // 3. Create 250+ Bookings
    console.log('Creating 250 Bookings with Transactions...');
    const allAppointments = await prisma.appointment.findMany();
    
    for (let i = 0; i < 260; i++) {
        const customer = faker.helpers.arrayElement(customers);
        const appointment = faker.helpers.arrayElement(allAppointments);
        
        // Generate random date within last 30 days or next 15 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 15);
        const startTime = faker.date.between({ from: startDate, to: endDate });
        const endTime = new Date(startTime.getTime() + appointment.durationMinutes * 60000);

        // Status Distribution: 60% completed, 25% confirmed, 15% cancelled
        const randStatus = Math.random();
        let bookingStatus = 'CONFIRMED';
        if (randStatus < 0.6) bookingStatus = 'COMPLETED';
        else if (randStatus < 0.85) bookingStatus = 'CONFIRMED';
        else bookingStatus = 'CANCELLED';

        // Payment Distribution: 70% success, 20% failed, 10% refunded
        const randPayment = Math.random();
        let paymentStatus = 'PAID';
        if (randPayment < 0.7) paymentStatus = 'PAID';
        else if (randPayment < 0.9) paymentStatus = 'FAILED';
        else paymentStatus = 'REFUNDED';

        const amount = appointment.price || 0;

        const booking = await prisma.booking.create({
            data: {
                appointmentId: appointment.id,
                userId: customer.id,
                startTime,
                endTime,
                bookingStatus,
                paymentStatus,
                totalAmount: amount,
                amountPaid: paymentStatus === 'FAILED' ? 0 : amount,
                razorpayPaymentId: paymentStatus === 'FAILED' ? null : `pay_${faker.string.alphanumeric(14)}`,
                createdAt: startTime // Set creation time to match booking time for better analytics
            }
        });

        // Create Refund record if status is REFUNDED
        if (paymentStatus === 'REFUNDED') {
            await prisma.refundTransaction.create({
                data: {
                    bookingId: booking.id,
                    originalAmount: amount,
                    refundAmount: amount,
                    status: 'COMPLETED',
                    refundReason: faker.helpers.arrayElement(['CUSTOMER_REQUEST', 'EVENT_CANCELLED', 'OTHER']),
                    reasonDetails: faker.lorem.sentence(),
                    completedAt: new Date(),
                    razorpayRefundId: `rfnd_${faker.string.alphanumeric(14)}`
                }
            });
        }
    }

    console.log('--- Seeding Complete! ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
