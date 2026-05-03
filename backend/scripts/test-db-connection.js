const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    await p.$connect();
    console.log('DB connection OK');
  } catch (e) {
    console.error('DB connection failed', e.message || e);
    process.exit(2);
  } finally {
    await p.$disconnect();
  }
})();
