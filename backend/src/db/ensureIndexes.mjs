/**
 * Ensures indexes exist in MongoDB collections to:
 * - Enforce uniqueness.
 * - Optimize queries for frequent lookup fields like mobile and verificationCode.
 */

export async function ensureIndexes(db, logger) {
    try {
      // 🚗 DRIVERS collection
      await db.collection('drivers').createIndex({ email: 1 }, { unique: true });
      await db.collection('drivers').createIndex({ mobile: 1 }, { unique: true });
      await db.collection('drivers').createIndex({ mobile: 1, verificationCode: 1 });
      
  
      // 👤 CLIENTS collection
      await db.collection('clients').createIndex({ email: 1 }, { unique: true });
      await db.collection('clients').createIndex({ mobile: 1 }, { unique: true });
      await db.collection('clients').createIndex({ mobile: 1, verificationCode: 1 });
  
      logger.info('Indexes ensured for drivers and clients collections');
    } catch (error) {
      logger.error('Failed to create indexes: %s', error.message);
    }
  }
  