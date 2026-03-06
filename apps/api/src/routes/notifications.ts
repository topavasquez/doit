import type { FastifyInstance } from 'fastify'
import { prisma } from '../plugins/db'
import { requireAuth } from '../middleware/auth'

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications/:userId
  app.get('/:userId', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { userId } = request.params as { userId: string }

      if (userId !== request.userId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Cannot access another user\'s notifications' })
      }

      const { unread_only, limit, offset } = request.query as {
        unread_only?: string
        limit?: string
        offset?: string
      }

      const take = Math.min(parseInt(limit ?? '30'), 50)
      const skip = parseInt(offset ?? '0')

      const notifications = await prisma.notification.findMany({
        where: {
          user_id: userId,
          ...(unread_only === 'true' ? { read: false } : {}),
        },
        orderBy: { created_at: 'desc' },
        take,
        skip,
      })

      const unread_count = await prisma.notification.count({
        where: { user_id: userId, read: false },
      })

      return reply.send({ notifications, unread_count })
    },
  })

  // PATCH /notifications/:id/read
  app.patch('/:id/read', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const notification = await prisma.notification.findUnique({
        where: { id },
        select: { user_id: true },
      })

      if (!notification) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Notification not found' })
      }

      if (notification.user_id !== request.userId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your notification' })
      }

      await prisma.notification.update({ where: { id }, data: { read: true } })

      return reply.status(204).send()
    },
  })

  // PATCH /notifications/mark-all-read
  app.patch('/mark-all-read', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      await prisma.notification.updateMany({
        where: { user_id: request.userId, read: false },
        data: { read: true },
      })

      return reply.status(204).send()
    },
  })
}
