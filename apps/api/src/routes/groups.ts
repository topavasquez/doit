import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../plugins/db'
import { requireAuth } from '../middleware/auth'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  avatar_url: z.string().url().optional().nullable(),
})

export async function groupRoutes(app: FastifyInstance) {
  // POST /groups
  app.post('/', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const parsed = createGroupSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400, error: 'Bad Request', message: parsed.error.errors[0].message,
        })
      }

      // Generate unique invite code
      let invite_code = generateInviteCode()
      let attempts = 0
      while (attempts < 5) {
        const existing = await prisma.group.findUnique({ where: { invite_code } })
        if (!existing) break
        invite_code = generateInviteCode()
        attempts++
      }

      const group = await prisma.group.create({
        data: {
          name: parsed.data.name,
          avatar_url: parsed.data.avatar_url ?? null,
          created_by: request.userId,
          invite_code,
          members: {
            create: { user_id: request.userId, role: 'admin' },
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true, avatar_url: true, display_name: true } } },
          },
        },
      })

      return reply.status(201).send({ group })
    },
  })

  // GET /groups/:id
  app.get('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      // Check membership
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })

      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not a member of this group' })
      }

      const group = await prisma.group.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: { select: { id: true, username: true, display_name: true, avatar_url: true, level: true } },
            },
            orderBy: { joined_at: 'asc' },
          },
          challenges: {
            where: { status: { in: ['pending', 'active'] } },
            orderBy: { created_at: 'desc' },
            include: {
              _count: { select: { participants: true } },
              participants: {
                where: { user_id: request.userId },
                take: 1,
              },
            },
          },
        },
      })

      if (!group) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Group not found' })
      }

      return reply.send({ group, my_role: membership.role })
    },
  })

  // GET /groups (my groups)
  app.get('/', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const memberships = await prisma.groupMember.findMany({
        where: { user_id: request.userId },
        include: {
          group: {
            include: {
              _count: { select: { members: true } },
              challenges: {
                where: { status: 'active' },
                take: 1,
                select: { id: true, title: true, habit_category: true, status: true, end_date: true },
              },
            },
          },
        },
        orderBy: { joined_at: 'desc' },
      })

      const groups = memberships.map((m) => ({
        ...m.group,
        my_role: m.role,
        member_count: m.group._count.members,
        active_challenge: m.group.challenges[0] ?? null,
      }))

      return reply.send({ groups })
    },
  })

  // POST /groups/join/:inviteCode
  app.post('/join/:inviteCode', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { inviteCode } = request.params as { inviteCode: string }

      const group = await prisma.group.findUnique({
        where: { invite_code: inviteCode.toUpperCase() },
        include: { _count: { select: { members: true } } },
      })

      if (!group) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invalid invite code' })
      }

      if (group._count.members >= 10) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Group is full (max 10 members)' })
      }

      const existing = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: group.id, user_id: request.userId } },
      })

      if (existing) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Already a member of this group' })
      }

      await prisma.groupMember.create({
        data: { group_id: group.id, user_id: request.userId, role: 'member' },
      })

      return reply.send({ group: { id: group.id, name: group.name } })
    },
  })

  // POST /groups/:id/invite (regenerate invite code)
  app.post('/:id/invite', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })

      if (!membership || membership.role !== 'admin') {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only admins can manage invites' })
      }

      const group = await prisma.group.findUnique({ where: { id } })
      if (!group) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Group not found' })

      return reply.send({ invite_code: group.invite_code, invite_link: `doit://join/${group.invite_code}` })
    },
  })

  // DELETE /groups/:id/members/:userId
  app.delete('/:id/members/:userId', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string }

      const myMembership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })

      const isSelf = userId === request.userId
      const isAdmin = myMembership?.role === 'admin'

      if (!isSelf && !isAdmin) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only admins can remove members' })
      }

      await prisma.groupMember.delete({
        where: { group_id_user_id: { group_id: id, user_id: userId } },
      })

      return reply.status(204).send()
    },
  })

  // GET /groups/:id/feed — all checkins across active challenges in this group
  app.get('/:id/feed', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const query = request.query as { limit?: string; offset?: string }

      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })
      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not a group member' })
      }

      const limit = Math.min(parseInt(query.limit ?? '30'), 50)
      const offset = parseInt(query.offset ?? '0')

      const checkins = await prisma.checkin.findMany({
        where: { challenge: { group_id: id } },
        include: {
          user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
          challenge: { select: { id: true, title: true, habit_category: true } },
        },
        orderBy: { checked_in_at: 'desc' },
        take: limit,
        skip: offset,
      })

      const total = await prisma.checkin.count({ where: { challenge: { group_id: id } } })

      return reply.send({ checkins, total, limit, offset })
    },
  })
}
