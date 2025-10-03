import app from "./app";
import { config } from "./config/env";
import prisma from "./prismaClient";
import { Logger } from "./utils/logger.util";

const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    Logger.info("Database connected successfully");

    // Start server
    app.listen(PORT, () => {
      Logger.info(`Server is running on port ${PORT}`);
      Logger.info(`Environment: ${config.env}`);
      Logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    Logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  Logger.info("SIGINT signal received: closing HTTP server");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  Logger.info("SIGTERM signal received: closing HTTP server");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
