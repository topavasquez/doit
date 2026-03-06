import type { FastifyInstance } from 'fastify'
import { prisma } from '../plugins/db'
import { leaderboard as lb } from '../plugins/redis'
import { requireAuth } from '../middleware/auth'

export async function leaderboardRoutes(app: FastifyInstance) {
  // GET /leaderboard/:challengeId
  app.get('/:challengeId', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { challengeId } = request.params as { challengeId: string }

      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        select: { ghost_mode: true, status: true, group_id: true, duration_days: true, start_date: true },
      })

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      // Verify membership
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: challenge.group_id, user_id: request.userId } },
      })

      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not authorized' })
      }

      // Get participants with their check-in counts for completion %
      const participants = await prisma.challengeParticipant.findMany({
        where: { challenge_id: challengeId },
        include: {
          user: { select: { id: true, username: true, display_name: true, avatar_url: true, level: true } },
        },
      })

      // Compute days elapsed for completion %
      const daysElapsed = challenge.start_date
        ? Math.max(1, Math.ceil((Date.now() - new Date(challenge.start_date).getTime()) / 86400000))
        : 1
      const totalExpected = Math.min(daysElapsed, challenge.duration_days)

      // Get Redis rankings
      const redisRankings = await lb.getRankings(challengeId)
      const redisMap = new Map(redisRankings.map((r) => [r.userId, r]))

      // Build leaderboard entries
      const entries = participants
        .map((p) => {
          const redisEntry = redisMap.get(p.user_id)
          const score = redisEntry ? redisEntry.score : p.total_checkins
          const completionPct = totalExpected > 0 ? Math.min(100, (score / totalExpected) * 100) : 0

          return {
            user_id: p.user_id,
            username: challenge.ghost_mode && p.user_id !== request.userId ? '???' : p.user.username,
            display_name: challenge.ghost_mode && p.user_id !== request.userId ? null : p.user.display_name,
            avatar_url: challenge.ghost_mode && p.user_id !== request.userId ? null : p.user.avatar_url,
            level: p.user.level,
            streak_current: p.streak_current,
            streak_longest: p.streak_longest,
            total_checkins: p.total_checkins,
            score,
            completion_pct: Math.round(completionPct * 10) / 10,
            is_me: p.user_id === request.userId,
          }
        })
        .sort((a, b) => b.score - a.score || b.streak_current - a.streak_current)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))

      return reply.send({
        leaderboard: entries,
        ghost_mode: challenge.ghost_mode,
        days_elapsed: daysElapsed,
        total_expected: totalExpected,
      })
    },
  })

  // POST /leaderboard/:challengeId/sync (internal: reconcile Redis from DB)
  app.post('/:challengeId/sync', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { challengeId } = request.params as { challengeId: string }

      const participants = await prisma.challengeParticipant.findMany({
        where: { challenge_id: challengeId },
        select: { user_id: true, total_checkins: true },
      })

      await lb.seedFromDb(challengeId, participants.map((p) => ({ userId: p.user_id, score: p.total_checkins })))

      // Update rank column in DB
      const rankings = await lb.getRankings(challengeId)
      for (const r of rankings) {
        await prisma.challengeParticipant.update({
          where: { challenge_id_user_id: { challenge_id: challengeId, user_id: r.userId } },
          data: { rank: r.rank },
        })
      }

      return reply.send({ synced: rankings.length })
    },
  })

  // GET /leaderboard/:challengeId/my-rank
  app.get('/:challengeId/my-rank', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { challengeId } = request.params as { challengeId: string }

      const [rank, score] = await Promise.all([
        lb.getUserRank(challengeId, request.userId),
        lb.getUserScore(challengeId, request.userId),
      ])

      const total = await prisma.challengeParticipant.count({ where: { challenge_id: challengeId } })

      return reply.send({ rank, score, total_participants: total })
    },
  })
}
