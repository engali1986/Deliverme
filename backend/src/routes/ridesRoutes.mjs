import express from 'express';
import { ObjectId } from 'mongodb';
import authenticateToken from '../middlewares/auth.mjs';
import { findNearbyDrivers } from '../redis/redisClient.mjs';

const router = express.Router();

// Get nearby drivers for a ride (client only)
router.get('/:rideId/nearby-drivers', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(503).json({ message: 'Database not initialized' });

    const { rideId } = req.params;
    if (!ObjectId.isValid(rideId)) {
      return res.status(400).json({ message: 'Invalid rideId' });
    }

    const ride = await db.collection('rides').findOne({ _id: new ObjectId(rideId) });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const user = req.user || {};
    if (user.role === 'client' && user.id) {
      const clientId = ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id;
      if (ride.clientId?.toString?.() !== clientId?.toString?.()) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const radiusKm = Number(req.query.radiusKm ?? 5);
    const limit = Number(req.query.limit ?? 20);

    const pickup = ride.pickup?.coordinates || [];
    const [longitude, latitude] = pickup;
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return res.status(500).json({ message: 'Ride pickup location missing' });
    }

    const drivers = await findNearbyDrivers(longitude, latitude, radiusKm, limit);
    const payload = drivers.map(([driverId, distance]) => ({
      driverId: driverId?.toString?.() ?? String(driverId),
      distanceKm: Number(distance),
    }));

    return res.json({ count: payload.length, drivers: payload });
  } catch (err) {
    console.error('nearby-drivers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
