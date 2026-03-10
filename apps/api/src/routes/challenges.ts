import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../plugins/db'
import { leaderboard, rateLimiter, redis } from '../plugins/redis'
import { requireAuth } from '../middleware/auth'

const createChallengeSchema = z.object({
  group_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  habit_category: z.enum(['gym', 'reading', 'sleep', 'diet', 'study', 'custom']),
  frequency: z.enum(['daily', 'weekly']),
  duration_days: z.literal(7).or(z.literal(30)).or(z.literal(90)),
  reward_description: z.string().max(200).optional(),
  ghost_mode: z.boolean().optional().default(false),
  start_date: z.string().datetime().optional(),
})

export async function challengeRoutes(app: FastifyInstance) {
  // POST /challenges
  app.post('/', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const parsed = createChallengeSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400, error: 'Bad Request', message: parsed.error.errors[0].message,
        })
      }

      const { group_id, duration_days, start_date, ...rest } = parsed.data

      // Must be a group member
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id, user_id: request.userId } },
      })

      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Must be a group member to create a challenge' })
      }

      const startDate = start_date ? new Date(start_date) : null
      const endDate = startDate
        ? new Date(new Date(startDate).setDate(startDate.getDate() + duration_days))
        : null

      const challenge = await prisma.challenge.create({
        data: {
          ...rest,
          group_id,
          created_by: request.userId,
          duration_days,
          start_date: startDate,
          end_date: endDate,
          participants: {
            create: { user_id: request.userId },
          },
        },
        include: {
          _count: { select: { participants: true } },
          participants: { where: { user_id: request.userId }, take: 1 },
        },
      })

      return reply.status(201).send({ challenge })
    },
  })

  // GET /challenges/:id
  app.get('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const challenge = await prisma.challenge.findUnique({
        where: { id },
        include: {
          group: { select: { id: true, name: true, avatar_url: true } },
          creator: { select: { id: true, username: true, avatar_url: true } },
          participants: {
            include: {
              user: { select: { id: true, username: true, display_name: true, avatar_url: true, level: true } },
            },
          },
          _count: { select: { participants: true, checkins: true } },
        },
      })

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      // Must be a group member
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: challenge.group_id, user_id: request.userId } },
      })

      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not authorized' })
      }

      let myParticipation = challenge.participants.find((p) => p.user_id === request.userId) ?? null

      // Auto-join active challenges when a group member views them without a participation record
      if (!myParticipation && challenge.status === 'active') {
        const newParticipant = await prisma.challengeParticipant.create({
          data: { challenge_id: id, user_id: request.userId },
          include: {
            user: { select: { id: true, username: true, display_name: true, avatar_url: true, level: true } },
          },
        })
        myParticipation = newParticipant
        try {
          await leaderboard.seedFromDb(id, [{ userId: request.userId, score: 0 }])
        } catch { /* Redis optional */ }
      }

      let hasCheckedInToday = false
      if (myParticipation) {
        try {
          hasCheckedInToday = !(await rateLimiter.canCheckin(id, request.userId))
        } catch {
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const existing = await prisma.checkin.findFirst({
            where: { challenge_id: id, user_id: request.userId, checked_in_at: { gte: todayStart } },
            select: { id: true },
          })
          hasCheckedInToday = !!existing
        }
      }

      return reply.send({ challenge, my_participation: myParticipation, has_checked_in_today: hasCheckedInToday })
    },
  })

  // PATCH /challenges/:id
  app.patch('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const challenge = await prisma.challenge.findUnique({
        where: { id },
        select: { created_by: true, group_id: true, status: true },
      })

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      // Only creator or group admin can update
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: challenge.group_id, user_id: request.userId } },
      })

      if (challenge.created_by !== request.userId && membership?.role !== 'admin') {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not authorized to update this challenge' })
      }

      if (challenge.status !== 'pending') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Can only update pending challenges' })
      }

      const body = request.body as Record<string, unknown>
      const allowedFields = ['title', 'description', 'reward_description', 'ghost_mode']
      const updateData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (field in body) updateData[field] = body[field]
      }

      const updated = await prisma.challenge.update({ where: { id }, data: updateData })
      return reply.send({ challenge: updated })
    },
  })

  // POST /challenges/:id/start
  app.post('/:id/start', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const challenge = await prisma.challenge.findUnique({
        where: { id },
        include: { _count: { select: { participants: true } } },
      })

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      if (challenge.created_by !== request.userId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only the creator can start a challenge' })
      }

      if (challenge.status !== 'pending') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Challenge is not in pending state' })
      }

      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + challenge.duration_days)

      const updated = await prisma.challenge.update({
        where: { id },
        data: { status: 'active', start_date: startDate, end_date: endDate },
      })

      // Seed the leaderboard in Redis (best-effort)
      const participants = await prisma.challengeParticipant.findMany({
        where: { challenge_id: id },
        select: { user_id: true, total_checkins: true },
      })
      try {
        await leaderboard.seedFromDb(id, participants.map((p) => ({ userId: p.user_id, score: p.total_checkins })))
      } catch { /* Redis unavailable, skip */ }

      // Create notifications for all participants
      const otherParticipants = participants.filter((p) => p.user_id !== request.userId)
      if (otherParticipants.length > 0) {
        await prisma.notification.createMany({
          data: otherParticipants.map((p) => ({
            user_id: p.user_id,
            type: 'challenge_start',
            payload: { challenge_id: id, challenge_title: challenge.title },
          })),
        })
      }

      return reply.send({ challenge: updated })
    },
  })

  // POST /challenges/:id/cancel
  app.post('/:id/cancel', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const challenge = await prisma.challenge.findUnique({
        where: { id },
        select: { created_by: true, group_id: true, status: true },
      })

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: challenge.group_id, user_id: request.userId } },
      })

      if (challenge.created_by !== request.userId && membership?.role !== 'admin') {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not authorized' })
      }

      if (!['pending', 'active'].includes(challenge.status)) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Challenge cannot be cancelled in its current state' })
      }

      const updated = await prisma.challenge.update({
        where: { id },
        data: { status: 'cancelled' },
      })

      await leaderboard.deleteChallenge(id)

      return reply.send({ challenge: updated })
    },
  })

  // POST /challenges/:id/join
  app.post('/:id/join', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const challenge = await prisma.challenge.findUnique({
        where: { id },
        select: { status: true, group_id: true },
      })

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      if (!['pending', 'active'].includes(challenge.status)) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Can only join pending or active challenges' })
      }

      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: challenge.group_id, user_id: request.userId } },
      })

      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Must be a group member' })
      }

      const participant = await prisma.challengeParticipant.upsert({
        where: { challenge_id_user_id: { challenge_id: id, user_id: request.userId } },
        update: {},
        create: { challenge_id: id, user_id: request.userId },
      })

      // If the challenge is already active, seed the new participant into the Redis leaderboard
      if (challenge.status === 'active') {
        try {
          const lbKey = leaderboard.key(id)
          const existing = await redis.zscore(lbKey, request.userId)
          if (existing === null) {
            await redis.zadd(lbKey, 0, request.userId)
          }
        } catch { /* Redis unavailable, skip */ }
      }

      return reply.status(201).send({ participant })
    },
  })
}
