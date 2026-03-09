import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../plugins/supabase'
import { prisma } from '../plugins/db'
import { requireAuth, requireSupabaseAuth } from '../middleware/auth'

const createProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  display_name: z.string().min(1).max(50).optional(),
  timezone: z.string().optional(),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/sync-user
  // Called after Supabase auth to create/sync user record in our DB
  app.post('/sync-user', {
    preHandler: requireSupabaseAuth,
    handler: async (request, reply) => {
      const body = request.body as Record<string, unknown>
      const parsed = createProfileSchema.safeParse(body)

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsed.error.errors[0].message,
        })
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: request.userId },
      })

      if (existingUser) {
        return reply.status(200).send({ user: existingUser, created: false })
      }

      // Check username uniqueness
      const usernameConflict = await prisma.user.findUnique({
        where: { username: parsed.data.username },
      })

      if (usernameConflict) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Username already taken',
        })
      }

      const user = await prisma.user.create({
        data: {
          id: request.userId,
          email: request.userEmail ?? null,
          phone: request.userPhone ?? null,
          username: parsed.data.username,
          display_name: parsed.data.display_name ?? null,
          timezone: parsed.data.timezone ?? 'UTC',
        },
      })

      return reply.status(201).send({ user, created: true })
    },
  })

  // GET /auth/me
  app.get('/me', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      })

      if (!user) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
      }

      return reply.send({ user })
    },
  })

  // POST /auth/check-username
  app.post('/check-username', async (request, reply) => {
    const body = request.body as { username?: string }
    if (!body.username) {
      return reply.status(400).send({ available: false, message: 'Username required' })
    }

    const existing = await prisma.user.findUnique({
      where: { username: body.username },
      select: { id: true },
    })

    return reply.send({ available: !existing })
  })

  // DELETE /auth/account
  app.delete('/account', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      // Soft delete our user record
      await prisma.user.update({
        where: { id: request.userId },
        data: { deleted_at: new Date() },
      })

      // Delete the Supabase auth user
      await supabase.auth.admin.deleteUser(request.userId)

      return reply.status(204).send()
    },
  })
}
