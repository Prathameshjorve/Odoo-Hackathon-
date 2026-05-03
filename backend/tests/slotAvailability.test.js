const test = require('node:test');
const assert = require('node:assert/strict');
const { SlotAvailabilityService } = require('../src/services/slotAvailabilityService');

const mockPrisma = {
  appointment: {
    async findUnique() {
      return {
        id: 'apt_1',
        durationMinutes: 30,
        bookType: 'RESOURCE',
        schedule: [{ day: 'MONDAY', from: '09:00', to: '12:00' }],
        organization: {
          id: 'org_1',
          name: 'Mock Org',
          businessHours: [{ day: 'MONDAY', from: '09:00', to: '12:00' }],
        },
        allowedUsers: [],
        allowedResources: [{ id: 'res_1', name: 'Room 1', capacity: 1 }],
      };
    },
  },
  booking: {
    async findMany() {
      return [
        {
          id: 'booking_1',
          resourceId: 'res_1',
          assignedUserId: null,
          startTime: new Date('2026-05-04T04:30:00.000Z'),
          endTime: new Date('2026-05-04T05:00:00.000Z'),
          bookingStatus: 'CONFIRMED',
        },
      ];
    },
  },
};

test('SlotAvailabilityService returns available and waitlisted slots with timezone conversion', async () => {
  const service = new SlotAvailabilityService({ prismaClient: mockPrisma, redisClient: null });
  const result = await service.getAvailableSlots('apt_1', '2026-05-04', {
    timezone: 'Asia/Kolkata',
    bufferMinutes: 15,
    resourceId: 'res_1',
  });

  assert.equal(result.availableSlots.length, 3);
  assert.equal(result.waitlistedSlots.length, 3);
  assert.equal(result.availableSlots[0].startTimeLocal, '2026-05-04T09:00:00');
  assert.equal(result.availableSlots[0].timezone, 'Asia/Kolkata');
});
