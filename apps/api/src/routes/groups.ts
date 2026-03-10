import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../plugins/db'
import { leaderboard } from '../plugins/redis'
import { requireAuth } from '../middleware/auth'

// Auto-join a user to all active challenges in a group (used when joining/accepting invite)
async function autoJoinActiveChallenges(groupId: string, userId: string) {
  const activeChallenges = await prisma.challenge.findMany({
    where: { group_id: groupId, status: 'active' },
    select: { id: true },
  })
  for (const challenge of activeChallenges) {
    const existing = await prisma.challengeParticipant.findUnique({
      where: { challenge_id_user_id: { challenge_id: challenge.id, user_id: userId } },
    })
    if (!existing) {
      await prisma.challengeParticipant.create({
        data: { challenge_id: challenge.id, user_id: userId },
      })
      try {
        await leaderboard.seedFromDb(challenge.id, [{ userId, score: 0 }])
      } catch { /* Redis optional */ }
    }
  }
}

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

  // GET /groups/invites — pending group_invite notifications for current user
  app.get('/invites', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const notifications = await prisma.notification.findMany({
        where: { user_id: request.userId, type: 'group_invite', read: false },
        orderBy: { created_at: 'desc' },
      })

      if (notifications.length === 0) return reply.send({ invites: [] })

      const inviterIds = [...new Set(
        notifications.map((n) => (n.payload as any).inviter_id).filter(Boolean)
      )]
      const inviters = await prisma.user.findMany({
        where: { id: { in: inviterIds } },
        select: { id: true, username: true, display_name: true, avatar_url: true },
      })
      const inviterMap = Object.fromEntries(inviters.map((u) => [u.id, u]))

      const invites = notifications.map((n) => {
        const p = n.payload as any
        return {
          id: n.id,
          group_id: p.group_id,
          group_name: p.group_name,
          invite_code: p.invite_code,
          inviter: inviterMap[p.inviter_id] ?? null,
          created_at: n.created_at,
        }
      })

      return reply.send({ invites })
    },
  })

  // POST /groups/invites/:id/accept
  app.post('/invites/:id/accept', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const notification = await prisma.notification.findUnique({ where: { id } })
      if (!notification || notification.user_id !== request.userId || notification.type !== 'group_invite') {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invite not found' })
      }

      const payload = notification.payload as any
      const group = await prisma.group.findUnique({
        where: { invite_code: payload.invite_code },
        include: { _count: { select: { members: true } } },
      })

      if (!group) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Group not found' })
      }
      if (group._count.members >= 10) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Group is full' })
      }

      const existing = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: group.id, user_id: request.userId } },
      })
      if (!existing) {
        await prisma.groupMember.create({
          data: { group_id: group.id, user_id: request.userId, role: 'member' },
        })
      }

      await autoJoinActiveChallenges(group.id, request.userId)
      await prisma.notification.update({ where: { id }, data: { read: true } })
      return reply.send({ group: { id: group.id, name: group.name } })
    },
  })

  // POST /groups/invites/:id/decline
  app.post('/invites/:id/decline', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const notification = await prisma.notification.findUnique({
        where: { id },
        select: { user_id: true, type: true },
      })
      if (!notification || notification.user_id !== request.userId || notification.type !== 'group_invite') {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invite not found' })
      }

      await prisma.notification.update({ where: { id }, data: { read: true } })
      return reply.status(204).send()
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
              members: {
                take: 5,
                orderBy: { joined_at: 'asc' },
                include: { user: { select: { id: true, username: true, display_name: true, avatar_url: true } } },
              },
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

      await autoJoinActiveChallenges(group.id, request.userId)

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
  // POST /groups/:id/invite-friend — send in-app invite notification to a friend
  app.post('/:id/invite-friend', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as { friend_id?: string }

      if (!body.friend_id) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'friend_id required' })
      }

      // Verify caller is a member
      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })
      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not a member of this group' })
      }

      // Verify friend exists
      const friend = await prisma.user.findUnique({ where: { id: body.friend_id, deleted_at: null }, select: { id: true } })
      if (!friend) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
      }

      // Don't invite if already a member
      const alreadyMember = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: body.friend_id } },
      })
      if (alreadyMember) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'User is already in the group' })
      }

      const group = await prisma.group.findUnique({ where: { id }, select: { name: true, invite_code: true } })

      await prisma.notification.create({
        data: {
          user_id: body.friend_id,
          type: 'group_invite',
          payload: { group_id: id, group_name: group?.name, invite_code: group?.invite_code, inviter_id: request.userId },
        },
      })

      return reply.status(201).send({ ok: true })
    },
  })

  // GET /groups/:id/messages — paginated chat messages (newest first)
  app.get('/:id/messages', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const query = request.query as { limit?: string; before?: string }

      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })
      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not a group member' })
      }

      const limit = Math.min(parseInt(query.limit ?? '50'), 100)
      const messages = await prisma.groupMessage.findMany({
        where: {
          group_id: id,
          ...(query.before ? { created_at: { lt: new Date(query.before) } } : {}),
        },
        include: {
          user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      return reply.send({ messages })
    },
  })

  // POST /groups/:id/messages — send a chat message
  app.post('/:id/messages', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as { content?: string }

      if (!body.content?.trim()) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'content required' })
      }

      const membership = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: id, user_id: request.userId } },
      })
      if (!membership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not a group member' })
      }

      const message = await prisma.groupMessage.create({
        data: { group_id: id, user_id: request.userId, content: body.content.trim() },
        include: {
          user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
        },
      })

      return reply.status(201).send({ message })
    },
  })

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
