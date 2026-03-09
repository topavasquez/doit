import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../plugins/db'
import { requireAuth } from '../middleware/auth'

const USER_SELECT = {
  id: true,
  username: true,
  display_name: true,
  avatar_url: true,
} as const

export async function friendRoutes(app: FastifyInstance) {
  // GET /friends/search?q=:query
  app.get('/search', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { q } = request.query as { q?: string }
      if (!q || q.trim().length < 2) {
        return reply.send({ users: [] })
      }

      const callerId = request.userId
      const users = await prisma.user.findMany({
        where: {
          username: { startsWith: q.trim(), mode: 'insensitive' },
          deleted_at: null,
          NOT: { id: callerId },
        },
        select: USER_SELECT,
        take: 15,
      })

      if (users.length === 0) return reply.send({ users: [] })

      const userIds = users.map((u) => u.id)
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { requester_id: callerId, addressee_id: { in: userIds } },
            { addressee_id: callerId, requester_id: { in: userIds } },
          ],
        },
        select: { id: true, requester_id: true, addressee_id: true, status: true },
      })

      const friendshipMap = new Map<string, { status: string; id: string }>()
      for (const f of friendships) {
        const otherId = f.requester_id === callerId ? f.addressee_id : f.requester_id
        let status: string
        if (f.status === 'accepted') {
          status = 'accepted'
        } else if (f.requester_id === callerId) {
          status = 'pending_sent'
        } else {
          status = 'pending_received'
        }
        friendshipMap.set(otherId, { status, id: f.id })
      }

      return reply.send({
        users: users.map((u) => {
          const fm = friendshipMap.get(u.id)
          return {
            ...u,
            friendship_status: fm?.status ?? 'none',
            friendship_id: fm?.id ?? null,
          }
        }),
      })
    },
  })

  // POST /friends/request
  app.post('/request', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const body = z.object({ addressee_id: z.string().uuid() }).safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.errors[0].message })
      }

      const { addressee_id } = body.data
      const callerId = request.userId

      if (addressee_id === callerId) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot send friend request to yourself' })
      }

      const target = await prisma.user.findUnique({ where: { id: addressee_id, deleted_at: null }, select: { id: true } })
      if (!target) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
      }

      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requester_id: callerId, addressee_id },
            { requester_id: addressee_id, addressee_id: callerId },
          ],
        },
      })

      if (existing) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Friend request already exists' })
      }

      const friendship = await prisma.friendship.create({
        data: { requester_id: callerId, addressee_id },
      })

      // Notify the addressee
      await prisma.notification.create({
        data: {
          user_id: addressee_id,
          type: 'friend_request',
          payload: { friendship_id: friendship.id, requester_id: callerId },
        },
      })

      return reply.status(201).send({ friendship })
    },
  })

  // GET /friends/requests — incoming pending requests
  app.get('/requests', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const requests = await prisma.friendship.findMany({
        where: { addressee_id: request.userId, status: 'pending' },
        include: { requester: { select: USER_SELECT } },
        orderBy: { created_at: 'desc' },
      })

      return reply.send({
        requests: requests.map((r) => ({
          id: r.id,
          requester: r.requester,
          created_at: r.created_at,
        })),
      })
    },
  })

  // PATCH /friends/requests/:id — accept or reject
  app.patch('/requests/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z.object({ action: z.enum(['accept', 'reject']) }).safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.errors[0].message })
      }

      const friendship = await prisma.friendship.findUnique({ where: { id } })
      if (!friendship || friendship.addressee_id !== request.userId) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Request not found' })
      }
      if (friendship.status !== 'pending') {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Request already responded to' })
      }

      const status = body.data.action === 'accept' ? 'accepted' : 'rejected'
      const updated = await prisma.friendship.update({ where: { id }, data: { status } })

      if (status === 'accepted') {
        await prisma.notification.create({
          data: {
            user_id: friendship.requester_id,
            type: 'friend_accepted',
            payload: { friendship_id: id, accepter_id: request.userId },
          },
        })
      }

      return reply.send({ friendship: updated })
    },
  })

  // GET /friends — accepted friends list
  app.get('/', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const callerId = request.userId
      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'accepted',
          OR: [{ requester_id: callerId }, { addressee_id: callerId }],
        },
        include: {
          requester: { select: USER_SELECT },
          addressee: { select: USER_SELECT },
        },
        orderBy: { updated_at: 'desc' },
      })

      const friends = friendships.map((f) =>
        f.requester_id === callerId ? f.addressee : f.requester
      )

      return reply.send({ friends, count: friends.length })
    },
  })

  // GET /friends/count/:userId
  app.get('/count/:userId', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const count = await prisma.friendship.count({
        where: {
          status: 'accepted',
          OR: [{ requester_id: userId }, { addressee_id: userId }],
        },
      })
      return reply.send({ count })
    },
  })
}
