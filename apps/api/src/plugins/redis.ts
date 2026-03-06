import Redis from "ioredis";

export const redis = new Redis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy: () => null, // don't auto-reconnect; bootstrap handles fallback
  },
);

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});

// Leaderboard helpers
export const leaderboard = {
  key: (challengeId: string) => `leaderboard:${challengeId}`,

  async addCheckin(challengeId: string, userId: string): Promise<number> {
    const key = leaderboard.key(challengeId);
    const score = await redis.zincrby(key, 1, userId);
    return parseFloat(score);
  },

  async getRankings(
    challengeId: string,
  ): Promise<Array<{ userId: string; score: number; rank: number }>> {
    const key = leaderboard.key(challengeId);
    const results = await redis.zrevrange(key, 0, -1, "WITHSCORES");
    const rankings: Array<{ userId: string; score: number; rank: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      rankings.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: rankings.length + 1,
      });
    }
    return rankings;
  },

  async getUserScore(challengeId: string, userId: string): Promise<number> {
    const key = leaderboard.key(challengeId);
    const score = await redis.zscore(key, userId);
    return score ? parseFloat(score) : 0;
  },

  async getUserRank(
    challengeId: string,
    userId: string,
  ): Promise<number | null> {
    const key = leaderboard.key(challengeId);
    const rank = await redis.zrevrank(key, userId);
    return rank !== null ? rank + 1 : null;
  },

  async deleteChallenge(challengeId: string): Promise<void> {
    await redis.del(leaderboard.key(challengeId));
  },

  async seedFromDb(
    challengeId: string,
    scores: Array<{ userId: string; score: number }>,
  ): Promise<void> {
    if (scores.length === 0) return;
    const key = leaderboard.key(challengeId);
    const args: [string, number, string][] = scores.map((s) => [
      key,
      s.score,
      s.userId,
    ]);
    const pipeline = redis.pipeline();
    pipeline.del(key);
    for (const [k, score, member] of args) {
      pipeline.zadd(k, score, member);
    }
    await pipeline.exec();
  },
};

// Rate limiting helpers
export const rateLimiter = {
  checkinKey: (challengeId: string, userId: string, date: string) =>
    `checkin:lock:${challengeId}:${userId}:${date}`,

  async canCheckin(challengeId: string, userId: string): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];
    const key = rateLimiter.checkinKey(challengeId, userId, today);
    const exists = await redis.exists(key);
    return exists === 0;
  },

  async markCheckin(challengeId: string, userId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const key = rateLimiter.checkinKey(challengeId, userId, today);
    // TTL: 24 hours
    await redis.set(key, "1", "EX", 86400);
  },
};
