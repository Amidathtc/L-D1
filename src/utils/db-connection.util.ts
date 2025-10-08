import { PrismaClient } from "@prisma/client";
import { Logger } from "./logger.util";

export class DatabaseConnectionUtil {
  private static prisma: PrismaClient | null = null;

  static async getConnection(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" 
          ? ["query", "error", "warn"] 
          : ["error"],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Test connection with retry logic
      await this.testConnection();
    }

    return this.prisma;
  }

  private static async testConnection(retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.prisma!.$connect();
        Logger.info("Database connection established successfully");
        return;
      } catch (error) {
        Logger.error(`Database connection attempt ${i + 1} failed:`, error);
        
        if (i === retries - 1) {
          throw new Error(`Failed to connect to database after ${retries} attempts`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  static async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      Logger.info("Database connection closed");
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      if (!this.prisma) {
        await this.getConnection();
      }
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      Logger.error("Database health check failed:", error);
      return false;
    }
  }
}
