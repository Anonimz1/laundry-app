/**
 * Prisma Client Singleton
 * Centralized database connection management
 */

const { PrismaClient } = require('@prisma/client');

class PrismaClientSingleton {
  constructor() {
    if (PrismaClientSingleton.instance) {
      return PrismaClientSingleton.instance;
    }

    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });

    PrismaClientSingleton.instance = this;
  }

  getClient() {
    return this.prisma;
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async connect() {
    await this.prisma.$connect();
  }

  // Health check
  async isHealthy() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const prismaClientSingleton = new PrismaClientSingleton();
module.exports = prismaClientSingleton.getClient();
