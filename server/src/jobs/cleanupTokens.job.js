import RefreshToken from '../models/RefreshToken.js';

export const runCleanupTokensJob = async () => {
  console.log('Running expired token cleanup job...');
  try {
    const result = await RefreshToken.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isRevoked: true }
      ]
    });
    console.log(`Pruned ${result.deletedCount} expired/revoked refresh tokens.`);
  } catch (error) {
    console.error('Token pruning error:', error.message);
  }
};
