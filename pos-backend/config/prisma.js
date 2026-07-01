const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Keep the Neon serverless DB warm during development by pinging every 4 minutes.
// Neon pauses after ~5 minutes of inactivity, causing transient P1001 errors on cold start.
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    prisma.$queryRaw`SELECT 1`.catch(() => {});
  }, 4 * 60 * 1000);
}

module.exports = prisma;
