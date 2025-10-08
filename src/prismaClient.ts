import { PrismaClient } from "@prisma/client";
import { Logger } from "./utils/logger.util";

// Create Prisma client with connection pooling configuration
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Add connection event handlers
prisma.$on("beforeExit", async () => {
  Logger.info("Prisma client is disconnecting...");
});

// Test connection on startup
prisma
  .$connect()
  .then(() => {
    Logger.info("Prisma client connected successfully");
  })
  .catch((error) => {
    Logger.error("Failed to connect Prisma client:", error);
  });

export default prisma;
