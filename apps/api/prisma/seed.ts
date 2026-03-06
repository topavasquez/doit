import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo users
  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      display_name: 'Alice Chen',
      email: 'alice@example.com',
      timezone: 'America/New_York',
    },
  })

  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      display_name: 'Bob Martinez',
      email: 'bob@example.com',
      timezone: 'America/Los_Angeles',
    },
  })

  // Create a demo group
  const group = await prisma.group.upsert({
    where: { invite_code: 'DEMO001' },
    update: {},
    create: {
      name: 'Morning Crew',
      created_by: alice.id,
      invite_code: 'DEMO001',
    },
  })

  // Add members
  await prisma.groupMember.upsert({
    where: { group_id_user_id: { group_id: group.id, user_id: alice.id } },
    update: {},
    create: { group_id: group.id, user_id: alice.id, role: 'admin' },
  })

  await prisma.groupMember.upsert({
    where: { group_id_user_id: { group_id: group.id, user_id: bob.id } },
    update: {},
    create: { group_id: group.id, user_id: bob.id, role: 'member' },
  })

  // Create a demo challenge
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  const challenge = await prisma.challenge.create({
    data: {
      group_id: group.id,
      created_by: alice.id,
      title: '30-Day Gym Challenge',
      description: 'Hit the gym every day for 30 days. Loser buys brunch.',
      habit_category: 'gym',
      frequency: 'daily',
      duration_days: 30,
      start_date: now,
      end_date: endDate,
      reward_description: 'Loser buys brunch for the whole group!',
      status: 'active',
    },
  })

  // Add participants
  await prisma.challengeParticipant.createMany({
    data: [
      { challenge_id: challenge.id, user_id: alice.id, streak_current: 3, total_checkins: 3, rank: 1 },
      { challenge_id: challenge.id, user_id: bob.id, streak_current: 2, total_checkins: 2, rank: 2 },
    ],
    skipDuplicates: true,
  })

  console.log('Seed complete.')
  console.log(`Demo group invite code: DEMO001`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
