import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../plugins/db'
import { requireAuth } from '../middleware/auth'

const updateUserSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  avatar_url: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
})

export async function userRoutes(app: FastifyInstance) {
  // GET /users/:id
  app.get('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const user = await prisma.user.findUnique({
        where: { id, deleted_at: null },
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          level: true,
          xp: true,
          timezone: true,
          created_at: true,
        },
      })

      if (!user) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
      }

      return reply.send({ user })
    },
  })

  // GET /users/:id/stats
  app.get('/:id/stats', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const [totalChallenges, totalCheckins, activeParticipations] = await Promise.all([
        prisma.challengeParticipant.count({ where: { user_id: id } }),
        prisma.checkin.count({ where: { user_id: id } }),
        prisma.challengeParticipant.findMany({
          where: {
            user_id: id,
            challenge: { status: 'active' },
          },
          select: { streak_current: true, streak_longest: true },
        }),
      ])

      const currentStreaks = activeParticipations.reduce((sum, p) => sum + p.streak_current, 0)
      const longestStreak = Math.max(0, ...activeParticipations.map((p) => p.streak_longest))

      return reply.send({
        stats: {
          total_challenges: totalChallenges,
          total_checkins: totalCheckins,
          current_streaks: currentStreaks,
          longest_streak: longestStreak,
          active_challenges: activeParticipations.length,
        },
      })
    },
  })

  // PATCH /users/:id
  app.patch('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      if (id !== request.userId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Cannot update another user' })
      }

      const parsed = updateUserSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsed.error.errors[0].message,
        })
      }

      const user = await prisma.user.update({
        where: { id },
        data: parsed.data,
      })

      return reply.send({ user })
    },
  })

  // GET /users/:id/challenges
  app.get('/:id/challenges', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status } = request.query as { status?: string }

      const participations = await prisma.challengeParticipant.findMany({
        where: {
          user_id: id,
          ...(status ? { challenge: { status } } : {}),
        },
        include: {
          challenge: {
            include: {
              group: { select: { id: true, name: true, avatar_url: true } },
              _count: { select: { participants: true } },
            },
          },
        },
        orderBy: { joined_at: 'desc' },
      })

      const activeChallengeIds = participations
        .filter((p) => p.challenge.status === 'active')
        .map((p) => p.challenge_id)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const todayCheckins = activeChallengeIds.length > 0
        ? await prisma.checkin.findMany({
            where: { user_id: id, challenge_id: { in: activeChallengeIds }, checked_in_at: { gte: todayStart } },
            select: { challenge_id: true },
          })
        : []

      const checkedInIds = new Set(todayCheckins.map((c) => c.challenge_id))

      return reply.send({
        challenges: participations.map((p) => ({
          ...p.challenge,
          my_participation: p,
          has_checked_in_today: checkedInIds.has(p.challenge_id),
        })),
      })
    },
  })

  // DELETE /users/:id (GDPR)
  app.delete('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      if (id !== request.userId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Cannot delete another user' })
      }

      await prisma.user.update({
        where: { id },
        data: { deleted_at: new Date() },
      })

      return reply.status(204).send()
    },
  })
}
