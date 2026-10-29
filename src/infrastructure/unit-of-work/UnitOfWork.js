/**
 * Unit of Work Pattern
 * Manages transactions across multiple repositories
 * Ensures ACID properties for complex operations
 */

const prisma = require('../database/prisma.client');
const PelangganRepository = require('../repositories/PelangganRepository');
const ProdukRepository = require('../repositories/ProdukRepository');
const PesananRepository = require('../repositories/PesananRepository');

class UnitOfWork {
  constructor() {
    this.prismaClient = prisma;
    this.transactionClient = null;
    this.isInTransaction = false;
  }

  // Initialize repositories
  get pelangganRepository() {
    return new PelangganRepository();
  }

  get produkRepository() {
    return new ProdukRepository();
  }

  get pesananRepository() {
    return new PesananRepository();
  }

  /**
   * Execute operations within a transaction
   * Ensures ACID properties:
   * - Atomicity: All or nothing
   * - Consistency: Data remains valid
   * - Isolation: Transactions don't interfere
   * - Durability: Committed changes persist
   */
  async executeInTransaction(callback) {
    try {
      this.isInTransaction = true;
      
      const result = await this.prismaClient.$transaction(async (tx) => {
        this.transactionClient = tx;
        return await callback(tx);
      });

      this.isInTransaction = false;
      this.transactionClient = null;
      
      return result;
    } catch (error) {
      this.isInTransaction = false;
      this.transactionClient = null;
      throw error;
    }
  }

  /**
   * Execute with retry logic for transient failures
   */
  async executeWithRetry(callback, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeInTransaction(callback);
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable (e.g., deadlock, timeout)
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [
      'P2034', // Transaction conflict
      'P2024', // Timed out
      'P1001', // Can't reach database
    ];
    return retryableCodes.includes(error.code);
  }

  /**
   * Helper method for delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch operations helper
   */
  async batchCreate(model, dataArray) {
    return await this.prismaClient[model].createMany({
      data: dataArray,
      skipDuplicates: true
    });
  }

  /**
   * Batch update helper
   */
  async batchUpdate(model, updates) {
    const promises = updates.map(({ where, data }) =>
      this.prismaClient[model].update({ where, data })
    );
    return await Promise.all(promises);
  }

  /**
   * Get current transaction client
   */
  getTransactionClient() {
    return this.transactionClient || this.prismaClient;
  }

  /**
   * Check connection health
   */
  async healthCheck() {
    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      return { healthy: true, message: 'Database connection is healthy' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

module.exports = UnitOfWork;
