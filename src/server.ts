import app from "./app";
import { config } from "./config/env";
import prisma from "./prismaClient";
import { Logger } from "./utils/logger.util";

const PORT = config.port;

async function startServer() {
  try {
    // Test database connection with retry logic
    let connected = false;
    let retries = 3;

    while (!connected && retries > 0) {
      try {
        await prisma.$connect();
        Logger.info("Database connected successfully");
        connected = true;
      } catch (error) {
        retries--;
        Logger.error(
          `Database connection failed. Retries left: ${retries}`,
          error
        );

        if (retries === 0) {
          throw new Error(
            "Failed to connect to database after multiple attempts"
          );
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

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
