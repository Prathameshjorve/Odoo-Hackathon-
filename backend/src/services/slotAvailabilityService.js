const prisma = require('../lib/prisma');

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function parseDateInput(dateInput) {
  if (!dateInput) {
    throw new Error('Date is required');
  }

  if (dateInput instanceof Date) {
    return {
      dateString: dateInput.toISOString().slice(0, 10),
      year: dateInput.getUTCFullYear(),
      month: dateInput.getUTCMonth() + 1,
      day: dateInput.getUTCDate(),
    };
  }

  const dateString = String(dateInput).slice(0, 10);
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateString);
  if (!match) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  return {
    dateString,
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeToMinutes(timeValue) {
  if (typeof timeValue !== 'string') {
    return null;
  }

  const match = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?$/.exec(timeValue.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatDateKeyUTC(date) {
  return date.toISOString().slice(0, 10);
}

function getUtcMidnight(dateParts) {
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 0, 0, 0, 0));
}

function getUtcEndOfDay(dateParts) {
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 23, 59, 59, 999));
}

function getWeekdayName(dateParts) {
  return DAY_NAMES[new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 12, 0, 0, 0)).getUTCDay()];
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

function zonedTimeToUtc(dateParts, timeValue, timeZone) {
  const timeMinutes = parseTimeToMinutes(timeValue);
  if (timeMinutes === null) {
    return null;
  }

  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;

  const utcGuess = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, 0, 0));
  const zoned = getZonedParts(utcGuess, timeZone);
  const zonedAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second, 0);
  const delta = zonedAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - delta);
}

function dateKeyForValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return formatDateKeyUTC(value);
  }

  const stringValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateKeyUTC(parsed);
}

function normalizeBusinessHours(businessHours) {
  if (!businessHours) {
    return [];
  }

  if (Array.isArray(businessHours)) {
    return businessHours;
  }

  if (Array.isArray(businessHours.hours)) {
    return businessHours.hours;
  }

  return [];
}

function normalizeBlackoutDates(...values) {
  const dates = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (Array.isArray(value)) {
      dates.push(...value);
    } else if (Array.isArray(value.blackoutDates)) {
      dates.push(...value.blackoutDates);
    }
  }

  return dates
    .map(dateValue => dateKeyForValue(dateValue))
    .filter(Boolean);
}

function intervalOverlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

class SlotAvailabilityService {
  constructor({ prismaClient = prisma, redisClient = null, cacheTtlSeconds = 300, defaultBufferMinutes = 15 } = {}) {
    this.prisma = prismaClient;
    this.cacheTtlSeconds = cacheTtlSeconds;
    this.defaultBufferMinutes = defaultBufferMinutes;
    this.redisClient = redisClient || this.createRedisClient();
  }

  createRedisClient() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_URL;
    if (!redisUrl) {
      return null;
    }

    try {
      const { createClient } = require('redis');
      const client = createClient({ url: redisUrl });

      client.on('error', (error) => {
        console.warn('Slot cache Redis error:', error.message);
      });

      client.connect().catch((error) => {
        console.warn('Slot cache Redis connect failed:', error.message);
      });

      return client;
    } catch (error) {
      return null;
    }
  }

  async getCache(cacheKey) {
    if (!this.redisClient) {
      return null;
    }

    try {
      const cachedValue = await this.redisClient.get(cacheKey);
      if (!cachedValue) {
        return null;
      }

      return JSON.parse(cachedValue);
    } catch (error) {
      return null;
    }
  }

  async setCache(cacheKey, payload) {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.setEx(cacheKey, this.cacheTtlSeconds, JSON.stringify(payload));
    } catch (error) {
      // cache must never block slot generation
    }
  }

  resolveTimezone(appointment, options = {}) {
    return (
      options.timezone ||
      appointment?.timezone ||
      appointment?.organization?.timezone ||
      appointment?.organization?.businessHours?.timezone ||
      appointment?.businessHours?.timezone ||
      process.env.DEFAULT_TIMEZONE ||
      'UTC'
    );
  }

  getScheduleEntries(appointment, weekdayName) {
    const schedule = Array.isArray(appointment?.schedule) ? appointment.schedule : [];
    return schedule.filter((entry) => {
      const entryDay = String(entry?.day || entry?.weekday || '').trim().toUpperCase();
      return entryDay === weekdayName;
    });
  }

  getBusinessHoursForDay(appointment, weekdayName) {
    const businessHours = normalizeBusinessHours(appointment?.organization?.businessHours);
    return businessHours.filter((entry) => String(entry?.day || '').trim().toUpperCase() === weekdayName);
  }

  isBlackoutDate(dateKey, options = {}, appointment) {
    const blackoutDates = new Set(normalizeBlackoutDates(options.blackoutDates, appointment?.blackoutDates, appointment?.organization?.blackoutDates));
    return blackoutDates.has(dateKey);
  }

  buildCacheKey(appointmentId, dateKey, options = {}) {
    const bufferMinutes = Number.isFinite(Number(options.bufferMinutes)) ? Number(options.bufferMinutes) : this.defaultBufferMinutes;
    const resourceId = options.resourceId || 'all';
    const userId = options.userId || 'all';
    const timezone = options.timezone || 'default';
    return `slot-availability:${appointmentId}:${dateKey}:${bufferMinutes}:${resourceId}:${userId}:${timezone}`;
  }

  async getAvailableSlots(appointmentId, date, options = {}) {
    const bufferMinutes = Number.isFinite(Number(options.bufferMinutes)) ? Number(options.bufferMinutes) : this.defaultBufferMinutes;
    const dateParts = parseDateInput(date);
    const cacheKey = this.buildCacheKey(appointmentId, dateParts.dateString, { ...options, bufferMinutes });

    const cached = await this.getCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            businessHours: true,
          },
        },
        allowedUsers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        allowedResources: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
      },
    });

    if (!appointment) {
      return {
        availableSlots: [],
        waitlistedSlots: [],
        metadata: {
          date: dateParts.dateString,
          message: 'Appointment not found',
        },
      };
    }

    const timezone = this.resolveTimezone(appointment, options);
    const dayName = getWeekdayName(dateParts);
    const requestedDateKey = dateParts.dateString;

    if (this.isBlackoutDate(requestedDateKey, options, appointment)) {
      return {
        availableSlots: [],
        waitlistedSlots: [],
        metadata: {
          date: requestedDateKey,
          dayOfWeek: dayName,
          timezone,
          message: 'Date is blocked by blackout rules',
        },
      };
    }

    const scheduleEntries = this.getScheduleEntries(appointment, dayName);
    if (!scheduleEntries.length) {
      return {
        availableSlots: [],
        waitlistedSlots: [],
        metadata: {
          date: requestedDateKey,
          dayOfWeek: dayName,
          timezone,
          message: 'No availability defined for this day',
        },
      };
    }

    const businessHourEntries = this.getBusinessHoursForDay(appointment, dayName);
    const dayBookings = await this.prisma.booking.findMany({
      where: {
        appointmentId,
        bookingStatus: {
          in: ['PENDING', 'CONFIRMED'],
        },
        startTime: {
          lte: getUtcEndOfDay(dateParts),
        },
        endTime: {
          gte: getUtcMidnight(dateParts),
        },
      },
      select: {
        id: true,
        resourceId: true,
        assignedUserId: true,
        startTime: true,
        endTime: true,
        bookingStatus: true,
      },
    });

    const durationMinutes = Number(appointment.durationMinutes || 0);
    if (durationMinutes <= 0) {
      return {
        availableSlots: [],
        waitlistedSlots: [],
        metadata: {
          date: requestedDateKey,
          dayOfWeek: dayName,
          timezone,
          message: 'Appointment duration is invalid',
        },
      };
    }

    const availableSlots = [];
    const waitlistedSlots = [];

    for (const scheduleEntry of scheduleEntries) {
      const scheduleStartMinutes = parseTimeToMinutes(scheduleEntry.from);
      const scheduleEndMinutes = parseTimeToMinutes(scheduleEntry.to);

      if (scheduleStartMinutes === null || scheduleEndMinutes === null || scheduleStartMinutes >= scheduleEndMinutes) {
        continue;
      }

      const businessWindows = businessHourEntries.length
        ? businessHourEntries
            .map((entry) => {
              const businessStart = parseTimeToMinutes(entry.from);
              const businessEnd = parseTimeToMinutes(entry.to);
              if (businessStart === null || businessEnd === null || businessStart >= businessEnd) {
                return null;
              }

              return {
                start: Math.max(scheduleStartMinutes, businessStart),
                end: Math.min(scheduleEndMinutes, businessEnd),
              };
            })
            .filter((window) => window && window.start < window.end)
        : [{ start: scheduleStartMinutes, end: scheduleEndMinutes }];

      if (!businessWindows.length) {
        continue;
      }

      for (const businessWindow of businessWindows) {
        let slotStartMinutes = businessWindow.start;
        const slotEndBoundary = businessWindow.end;

        while (slotStartMinutes + durationMinutes <= slotEndBoundary) {
          const slotStartTime = `${String(Math.floor(slotStartMinutes / 60)).padStart(2, '0')}:${String(slotStartMinutes % 60).padStart(2, '0')}`;
          const slotEndMinutes = slotStartMinutes + durationMinutes;
          const slotEndTime = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;

          const slotStartUtc = zonedTimeToUtc(dateParts, slotStartTime, timezone);
          const slotEndUtc = zonedTimeToUtc(dateParts, slotEndTime, timezone);

          if (!slotStartUtc || !slotEndUtc || slotEndUtc <= slotStartUtc) {
            slotStartMinutes += durationMinutes;
            continue;
          }

          const bufferedStart = new Date(slotStartUtc.getTime() - bufferMinutes * 60 * 1000);
          const bufferedEnd = new Date(slotEndUtc.getTime() + bufferMinutes * 60 * 1000);

          const relevantBookings = dayBookings.filter((booking) => {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            return intervalOverlaps(bufferedStart, bufferedEnd, bookingStart, bookingEnd);
          });

          const capacity = this.calculateCapacityForSlot(appointment, relevantBookings, options);
          const slot = {
            startTime: slotStartUtc.toISOString(),
            endTime: slotEndUtc.toISOString(),
            startTimeLocal: `${requestedDateKey}T${slotStartTime}:00`,
            endTimeLocal: `${requestedDateKey}T${slotEndTime}:00`,
            timezone,
            availableCount: capacity.availableCount,
            reason: capacity.reason || null,
          };

          if (capacity.availableCount > 0) {
            availableSlots.push(slot);
          } else {
            waitlistedSlots.push({
              ...slot,
              waitlistReason: capacity.reason || 'No capacity available',
            });
          }

          slotStartMinutes += durationMinutes;
        }
      }
    }

    const payload = {
      availableSlots: availableSlots.sort((left, right) => new Date(left.startTime) - new Date(right.startTime)),
      waitlistedSlots: waitlistedSlots.sort((left, right) => new Date(left.startTime) - new Date(right.startTime)),
      metadata: {
        date: requestedDateKey,
        dayOfWeek: dayName,
        timezone,
        bufferMinutes,
        totalAvailable: availableSlots.length,
        totalWaitlisted: waitlistedSlots.length,
      },
    };

    await this.setCache(cacheKey, payload);
    return { ...payload, cached: false };
  }

  calculateCapacityForSlot(appointment, relevantBookings, options = {}) {
    if (appointment.bookType === 'RESOURCE') {
      const selectedResourceId = options.resourceId || null;

      if (selectedResourceId) {
        const resource = appointment.allowedResources.find((entry) => entry.id === selectedResourceId);
        if (!resource) {
          return { availableCount: 0, reason: 'Selected resource is not allowed' };
        }

        const resourceBookings = relevantBookings.filter((booking) => booking.resourceId === selectedResourceId);
        return {
          availableCount: Math.max(0, resource.capacity - resourceBookings.length),
          reason: resourceBookings.length >= resource.capacity ? 'Resource capacity reached' : null,
        };
      }

      const totalCapacity = appointment.allowedResources.reduce((sum, resource) => sum + Number(resource.capacity || 0), 0);
      return {
        availableCount: Math.max(0, totalCapacity - relevantBookings.filter((booking) => Boolean(booking.resourceId)).length),
        reason: totalCapacity <= 0 ? 'No resource capacity configured' : null,
      };
    }

    if (appointment.bookType === 'USER') {
      const selectedUserId = options.userId || null;

      if (selectedUserId) {
        const user = appointment.allowedUsers.find((entry) => entry.id === selectedUserId);
        if (!user) {
          return { availableCount: 0, reason: 'Selected user is not allowed' };
        }

        const userBookings = relevantBookings.filter((booking) => booking.assignedUserId === selectedUserId);
        return {
          availableCount: userBookings.length > 0 ? 0 : 1,
          reason: userBookings.length > 0 ? 'Selected user is already booked for this slot' : null,
        };
      }

      const totalUsers = appointment.allowedUsers.length;
      const occupiedUsers = new Set(relevantBookings.map((booking) => booking.assignedUserId).filter(Boolean));
      const availableCount = Math.max(0, totalUsers - occupiedUsers.size);
      return {
        availableCount,
        reason: totalUsers <= 0 ? 'No users configured for this appointment' : null,
      };
    }

    return {
      availableCount: 0,
      reason: 'Unsupported appointment book type',
    };
  }
}

const slotAvailabilityService = new SlotAvailabilityService();

module.exports = {
  SlotAvailabilityService,
  slotAvailabilityService,
};
