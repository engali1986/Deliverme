/**
 * Ensures indexes exist in MongoDB collections to:
 * - Enforce uniqueness.
 * - Optimize queries for frequent lookup fields like mobile and verificationCode.
 */

export default async function ensureIndexes(db) {
  try {
    // 🚗 DRIVERS collection
    await db.collection('drivers').createIndex({ email: 1 }, { unique: true });
    await db.collection('drivers').createIndex({ mobile: 1 }, { unique: true });
    await db.collection('drivers').createIndex({ mobile: 1, verificationCode: 1 });
    await db.collection('drivers').createIndex({ location: '2dsphere' });
    console.log('Ensured drivers indexes');
    
    // 👤 CLIENTS collection
    await db.collection('clients').createIndex({ email: 1 }, { unique: true });
    await db.collection('clients').createIndex({ mobile: 1 }, { unique: true });
    await db.collection('clients').createIndex({ mobile: 1, verificationCode: 1 });
    console.log('Ensured clients indexes');

    // 🚕 RIDES collection
    await db.collection('rides').createIndex({ status: 1, expiresAt: 1 });
    await db.collection('rides').createIndex({ clientId: 1 });
    await db.collection('rides').createIndex({ assignedDriver: 1 });

    console.log('Ensured rides indexes');

  } catch (error) {
    console.error('ensureIndexes error', error);
  }
}
// call this after DB connect in your connect/startup code
