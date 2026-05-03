const { createClient } = require('redis');

let sharedClient = null;

function getRedisUrl() {
  return process.env.REDIS_URL || process.env.REDIS_CONNECTION_URL || null;
}

function createRedisClient() {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }

  const client = createClient({ url: redisUrl });
  client.on('error', (error) => {
    console.warn('Redis error:', error.message);
  });

  return client;
}

async function getSharedRedisClient() {
  if (sharedClient) {
    return sharedClient;
  }

  const client = createRedisClient();
  if (!client) {
    return null;
  }

  if (!client.isOpen) {
    await client.connect().catch((error) => {
      console.warn('Redis connect failed:', error.message);
    });
  }

  sharedClient = client;
  return sharedClient;
}

async function withRedis(fn, fallback = null) {
  const client = await getSharedRedisClient();
  if (!client) {
    return fallback;
  }

  try {
    return await fn(client);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  createRedisClient,
  getSharedRedisClient,
  withRedis,
};
