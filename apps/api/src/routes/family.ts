import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../plugins/db'
import { requireAuth } from '../middleware/auth'

function generateInviteCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `FAM-${num}`
}

type FamilyChallenge = {
  id: string; admin_id: string; title: string; description: string | null
  frequency: string; duration_days: number; require_photo: boolean
  reward_description: string | null; invite_code: string; status: string
  start_date: Date | null; end_date: Date | null; created_at: Date
}
type FamilyParticipant = {
  id: string; challenge_id: string; user_id: string
  total_checkins: number; joined_at: Date
  username?: string; display_name?: string | null; avatar_url?: string | null
}
type FamilyCheckin = {
  id: string; challenge_id: string; user_id: string
  photo_url: string | null; notes: string | null
  approved: boolean | null; checked_in_at: Date; created_at: Date
  username?: string; display_name?: string | null; avatar_url?: string | null
}

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration_days: z.literal(7).or(z.literal(30)).or(z.literal(90)),
  frequency: z.enum(['daily', 'weekly']),
  reward_description: z.string().max(200).optional(),
  require_photo: z.boolean().optional().default(false),
})

const checkinSchema = z.object({
  photo_url: z.string().url().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
})

export async function familyRoutes(app: FastifyInstance) {

  // POST /family — create challenge (admin)
  app.post('/', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const parsed = createSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.errors[0].message })
      }
      const { title, description, duration_days, frequency, reward_description, require_photo } = parsed.data

      // Generate unique invite code (retry on collision)
      let invite_code = generateInviteCode()
      for (let i = 0; i < 5; i++) {
        const existing = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM family_challenges WHERE invite_code = ${invite_code} LIMIT 1`
        if (existing.length === 0) break
        invite_code = generateInviteCode()
      }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        INSERT INTO family_challenges (admin_id, title, description, duration_days, frequency, reward_description, require_photo, invite_code)
        VALUES (${request.userId}::uuid, ${title}, ${description ?? null}, ${duration_days}, ${frequency}, ${reward_description ?? null}, ${require_photo}, ${invite_code})
        RETURNING *`

      return reply.status(201).send({ challenge })
    },
  })

  // GET /family — list mine (as admin or participant)
  app.get('/', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const challenges = await prisma.$queryRaw<(FamilyChallenge & { role: string; participant_count: number; my_checkins: number })[]>`
        SELECT fc.id::text, fc.admin_id::text, fc.title, fc.description, fc.frequency, fc.duration_days,
               fc.require_photo, fc.reward_description, fc.invite_code, fc.status, fc.start_date, fc.end_date, fc.created_at,
               'admin' AS role,
          (SELECT COUNT(*)::int FROM family_participants fp WHERE fp.challenge_id = fc.id) AS participant_count,
          (SELECT COUNT(*)::int FROM family_checkins fck WHERE fck.challenge_id = fc.id AND fck.user_id = ${request.userId}::uuid) AS my_checkins
        FROM family_challenges fc
        WHERE fc.admin_id = ${request.userId}::uuid
        UNION ALL
        SELECT fc.id::text, fc.admin_id::text, fc.title, fc.description, fc.frequency, fc.duration_days,
               fc.require_photo, fc.reward_description, fc.invite_code, fc.status, fc.start_date, fc.end_date, fc.created_at,
               'participant' AS role,
          (SELECT COUNT(*)::int FROM family_participants fp WHERE fp.challenge_id = fc.id) AS participant_count,
          (SELECT COUNT(*)::int FROM family_checkins fck WHERE fck.challenge_id = fc.id AND fck.user_id = ${request.userId}::uuid) AS my_checkins
        FROM family_challenges fc
        INNER JOIN family_participants fpar ON fpar.challenge_id = fc.id AND fpar.user_id = ${request.userId}::uuid
        ORDER BY created_at DESC`

      return reply.send({ challenges })
    },
  })

  // GET /family/:id — detail
  app.get('/:id', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days,
               require_photo, reward_description, invite_code, status, start_date, end_date, created_at
        FROM family_challenges WHERE id = ${id}::uuid LIMIT 1`

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Family challenge not found' })
      }

      const isAdmin = challenge.admin_id === request.userId
      const [participation] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_participants WHERE challenge_id = ${id}::uuid AND user_id = ${request.userId}::uuid LIMIT 1`

      if (!isAdmin && !participation) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not authorized' })
      }

      const participants = await prisma.$queryRaw<FamilyParticipant[]>`
        SELECT fp.*, u.username, u.display_name, u.avatar_url
        FROM family_participants fp
        INNER JOIN users u ON u.id = fp.user_id
        WHERE fp.challenge_id = ${id}::uuid`

      const adminUser = await prisma.$queryRaw<{ username: string; display_name: string | null; avatar_url: string | null }[]>`
        SELECT username, display_name, avatar_url FROM users WHERE id = ${challenge.admin_id}::uuid LIMIT 1`

      // Today's checkins (pending approval)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const pendingCheckins = await prisma.$queryRaw<FamilyCheckin[]>`
        SELECT fck.*, u.username, u.display_name, u.avatar_url
        FROM family_checkins fck
        INNER JOIN users u ON u.id = fck.user_id
        WHERE fck.challenge_id = ${id}::uuid AND fck.approved IS NULL
        ORDER BY fck.checked_in_at DESC`

      // Has current user checked in today?
      const [todayCheckin] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_checkins
        WHERE challenge_id = ${id}::uuid AND user_id = ${request.userId}::uuid
          AND checked_in_at >= ${todayStart}
        LIMIT 1`

      return reply.send({
        challenge,
        role: isAdmin ? 'admin' : 'participant',
        participants,
        admin: adminUser[0] ?? null,
        pending_checkins: pendingCheckins,
        has_checked_in_today: !!todayCheckin,
      })
    },
  })

  // GET /family/invites — pending family_invite notifications for current user
  app.get('/invites', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const notifications = await prisma.$queryRaw<{ id: string; payload: any; created_at: Date }[]>`
        SELECT id, payload, created_at FROM notifications
        WHERE user_id = ${request.userId}::uuid AND type = 'family_invite' AND read = false
        ORDER BY created_at DESC`

      if (notifications.length === 0) return reply.send({ invites: [] })

      const inviterIds = [...new Set(
        notifications.map((n) => n.payload?.inviter_id).filter(Boolean)
      )]

      const inviters = inviterIds.length > 0
        ? await prisma.$queryRaw<{ id: string; username: string; display_name: string | null; avatar_url: string | null }[]>`
            SELECT id::text, username, display_name, avatar_url FROM users WHERE id = ANY(${inviterIds}::uuid[])`
        : []

      const inviterMap = Object.fromEntries(inviters.map((u) => [u.id, u]))

      const invites = notifications.map((n) => ({
        id: n.id,
        challenge_id: n.payload?.challenge_id,
        challenge_title: n.payload?.challenge_title,
        invite_code: n.payload?.invite_code,
        inviter: inviterMap[n.payload?.inviter_id] ?? null,
        created_at: n.created_at,
      }))

      return reply.send({ invites })
    },
  })

  // POST /family/invites/:nid/accept
  app.post('/invites/:nid/accept', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { nid } = request.params as { nid: string }

      const [notification] = await prisma.$queryRaw<{ id: string; user_id: string; type: string; payload: any }[]>`
        SELECT id::text, user_id::text, type, payload FROM notifications WHERE id = ${nid}::uuid LIMIT 1`

      if (!notification || notification.user_id !== request.userId || notification.type !== 'family_invite') {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invite not found' })
      }

      const invite_code = notification.payload?.invite_code
      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE invite_code = ${invite_code} LIMIT 1`

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Challenge not found' })
      }

      if (!['pending', 'active'].includes(challenge.status)) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Challenge is no longer accepting participants' })
      }

      const [existing] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_participants WHERE challenge_id = ${challenge.id}::uuid AND user_id = ${request.userId}::uuid LIMIT 1`

      if (!existing) {
        await prisma.$executeRaw`
          INSERT INTO family_participants (challenge_id, user_id) VALUES (${challenge.id}::uuid, ${request.userId}::uuid)`
      }

      await prisma.$executeRaw`UPDATE notifications SET read = true WHERE id = ${nid}::uuid`
      return reply.send({ challenge })
    },
  })

  // POST /family/invites/:nid/decline
  app.post('/invites/:nid/decline', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { nid } = request.params as { nid: string }

      const [notification] = await prisma.$queryRaw<{ id: string; user_id: string; type: string }[]>`
        SELECT id::text, user_id::text, type FROM notifications WHERE id = ${nid}::uuid LIMIT 1`

      if (!notification || notification.user_id !== request.userId || notification.type !== 'family_invite') {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invite not found' })
      }

      await prisma.$executeRaw`UPDATE notifications SET read = true WHERE id = ${nid}::uuid`
      return reply.status(204).send()
    },
  })

  // POST /family/join — join via invite code
  app.post('/join', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { invite_code } = request.body as { invite_code?: string }
      if (!invite_code?.trim()) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'invite_code is required' })
      }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE invite_code = ${invite_code.trim().toUpperCase()} LIMIT 1`

      if (!challenge) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Invalid invite code' })
      }

      if (challenge.admin_id === request.userId) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'You are the admin of this challenge' })
      }

      if (!['pending', 'active'].includes(challenge.status)) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'This challenge is no longer accepting participants' })
      }

      const [existing] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_participants WHERE challenge_id = ${challenge.id}::uuid AND user_id = ${request.userId}::uuid LIMIT 1`

      if (existing) {
        return reply.send({ challenge, message: 'Already a participant' })
      }

      await prisma.$executeRaw`
        INSERT INTO family_participants (challenge_id, user_id) VALUES (${challenge.id}::uuid, ${request.userId}::uuid)`

      return reply.status(201).send({ challenge })
    },
  })

  // POST /family/:id/invite-friend — send in-app notification to a friend
  app.post('/:id/invite-friend', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const { friend_id } = request.body as { friend_id?: string }

      if (!friend_id) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'friend_id required' })
      }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE id = ${id}::uuid LIMIT 1`
      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Not found' })

      // Only admin can invite
      if (challenge.admin_id !== request.userId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Solo el administrador puede invitar' })
      }

      // Don't invite if already a participant or admin
      if (friend_id === challenge.admin_id) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'User is already the admin' })
      }
      const [alreadyIn] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_participants WHERE challenge_id = ${id}::uuid AND user_id = ${friend_id}::uuid LIMIT 1`
      if (alreadyIn) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'User is already a participant' })
      }

      await prisma.$executeRaw`
        INSERT INTO notifications (user_id, type, payload)
        VALUES (${friend_id}::uuid, 'family_invite', ${JSON.stringify({
          challenge_id: id,
          challenge_title: challenge.title,
          invite_code: challenge.invite_code,
          inviter_id: request.userId,
        })}::jsonb)`

      return reply.status(201).send({ ok: true })
    },
  })

  // POST /family/:id/start — start challenge (admin only)
  app.post('/:id/start', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE id = ${id}::uuid LIMIT 1`

      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Not found' })
      if (challenge.admin_id !== request.userId) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only the admin can start this challenge' })
      if (challenge.status !== 'pending') return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Challenge is not pending' })

      const [participantCount] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM family_participants WHERE challenge_id = ${id}::uuid`

      if ((participantCount?.count ?? 0) < 1) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Need at least one participant to start' })
      }

      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + challenge.duration_days)

      const [updated] = await prisma.$queryRaw<FamilyChallenge[]>`
        UPDATE family_challenges
        SET status = 'active', start_date = ${startDate}::date, end_date = ${endDate}::date
        WHERE id = ${id}::uuid
        RETURNING *`

      return reply.send({ challenge: updated })
    },
  })

  // POST /family/:id/checkins — submit checkin (participant)
  app.post('/:id/checkins', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE id = ${id}::uuid LIMIT 1`

      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Not found' })
      if (challenge.status !== 'active') return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Challenge is not active' })

      const [participation] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_participants WHERE challenge_id = ${id}::uuid AND user_id = ${request.userId}::uuid LIMIT 1`

      if (!participation) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not a participant' })

      // Rate limit: one per day
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const [existing] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_checkins
        WHERE challenge_id = ${id}::uuid AND user_id = ${request.userId}::uuid AND checked_in_at >= ${todayStart}
        LIMIT 1`

      if (existing) return reply.status(429).send({ statusCode: 429, error: 'Too Many Requests', message: 'Already checked in today' })

      const parsed = checkinSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.errors[0].message })

      if (challenge.require_photo && !parsed.data.photo_url) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'This challenge requires a photo' })
      }

      // approved = null (pending) if admin needs to approve; true if no photo required
      const autoApprove = !challenge.require_photo

      const [checkin] = await prisma.$queryRaw<FamilyCheckin[]>`
        INSERT INTO family_checkins (challenge_id, user_id, photo_url, notes, approved)
        VALUES (${id}::uuid, ${request.userId}::uuid, ${parsed.data.photo_url ?? null}, ${parsed.data.notes ?? null}, ${autoApprove ? true : null})
        RETURNING *`

      // If auto-approved, increment total_checkins
      if (autoApprove) {
        await prisma.$executeRaw`
          UPDATE family_participants SET total_checkins = COALESCE(total_checkins, 0) + 1
          WHERE challenge_id = ${id}::uuid AND user_id = ${request.userId}::uuid`
      }

      // Notify admin
      if (!autoApprove) {
        await prisma.$executeRaw`
          INSERT INTO notifications (user_id, type, payload)
          VALUES (${challenge.admin_id}::uuid, 'family_checkin_pending', ${JSON.stringify({ challenge_id: id, checkin_id: checkin.id, challenge_title: challenge.title })}::jsonb)`
      }

      return reply.status(201).send({ checkin, auto_approved: autoApprove })
    },
  })

  // GET /family/:id/checkins — list checkins
  app.get('/:id/checkins', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE id = ${id}::uuid LIMIT 1`
      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Not found' })

      const isAdmin = challenge.admin_id === request.userId
      const [participation] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM family_participants WHERE challenge_id = ${id}::uuid AND user_id = ${request.userId}::uuid LIMIT 1`
      if (!isAdmin && !participation) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not authorized' })

      const checkins = await prisma.$queryRaw<FamilyCheckin[]>`
        SELECT fck.*, u.username, u.display_name, u.avatar_url
        FROM family_checkins fck
        INNER JOIN users u ON u.id = fck.user_id
        WHERE fck.challenge_id = ${id}::uuid
        ORDER BY fck.checked_in_at DESC
        LIMIT 50`

      return reply.send({ checkins })
    },
  })

  // PATCH /family/:id/checkins/:cid — approve / reject (admin)
  app.patch('/:id/checkins/:cid', {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id, cid } = request.params as { id: string; cid: string }
      const { action } = request.body as { action?: 'approve' | 'reject' }

      if (!action || !['approve', 'reject'].includes(action)) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'action must be approve or reject' })
      }

      const [challenge] = await prisma.$queryRaw<FamilyChallenge[]>`
        SELECT id::text, admin_id::text, title, description, frequency, duration_days, require_photo, reward_description, invite_code, status, start_date, end_date, created_at FROM family_challenges WHERE id = ${id}::uuid LIMIT 1`
      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Not found' })
      if (challenge.admin_id !== request.userId) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only the admin can approve checkins' })

      const [checkin] = await prisma.$queryRaw<FamilyCheckin[]>`
        SELECT * FROM family_checkins WHERE id = ${cid}::uuid AND challenge_id = ${id}::uuid LIMIT 1`
      if (!checkin) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Checkin not found' })

      const approved = action === 'approve'
      const [updated] = await prisma.$queryRaw<FamilyCheckin[]>`
        UPDATE family_checkins SET approved = ${approved} WHERE id = ${cid}::uuid RETURNING *`

      if (approved && checkin.approved !== true) {
        await prisma.$executeRaw`
          UPDATE family_participants SET total_checkins = COALESCE(total_checkins, 0) + 1
          WHERE challenge_id = ${id}::uuid AND user_id = ${checkin.user_id}::uuid`
      }

      // Notify participant
      await prisma.$executeRaw`
        INSERT INTO notifications (user_id, type, payload)
        VALUES (${checkin.user_id}::uuid, ${approved ? 'family_checkin_approved' : 'family_checkin_rejected'}, ${JSON.stringify({ challenge_id: id, challenge_title: challenge.title })}::jsonb)`

      return reply.send({ checkin: updated })
    },
  })
}
