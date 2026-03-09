import type { FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../plugins/supabase'
import { prisma } from '../plugins/db'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    userEmail?: string | null
    userPhone?: string | null
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing bearer token' })
    return
  }

  const token = authorization.slice(7)

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' })
    return
  }

  // Check the user exists in our users table
  let user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, phone: true, deleted_at: true },
  })

  // Auto-create record for anonymous Supabase users
  if (!user && (data.user as { is_anonymous?: boolean }).is_anonymous) {
    const anonUsername = `guest_${data.user.id.replace(/-/g, '').slice(0, 10)}`
    user = await prisma.user.create({
      data: {
        id: data.user.id,
        email: null,
        phone: null,
        username: anonUsername,
        display_name: 'Guest',
        timezone: 'UTC',
      },
      select: { id: true, email: true, phone: true, deleted_at: true },
    })
  }

  if (!user || user.deleted_at) {
    reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found' })
    return
  }

  request.userId = user.id
  request.userEmail = user.email
  request.userPhone = user.phone
}

// Like requireAuth but skips the DB lookup — use for routes that create the user record
export async function requireSupabaseAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing bearer token' })
    return
  }

  const token = authorization.slice(7)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' })
    return
  }

  request.userId = data.user.id
  request.userEmail = data.user.email ?? null
  request.userPhone = data.user.phone ?? null
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return

  const token = authorization.slice(7)
  const { data } = await supabase.auth.getUser(token)

  if (data.user) {
    request.userId = data.user.id
    request.userEmail = data.user.email ?? null
    request.userPhone = data.user.phone ?? null
  }
}
