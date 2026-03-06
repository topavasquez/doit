import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../plugins/db";
import { leaderboard, rateLimiter } from "../plugins/redis";
import { requireAuth } from "../middleware/auth";
import { STREAK_MILESTONES } from "@doit/shared";

const createCheckinSchema = z.object({
  challenge_id: z.string().uuid(),
  photo_url: z.string().url().optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

const reactSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export async function checkinRoutes(app: FastifyInstance) {
  // POST /checkins
  app.post("/", {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const parsed = createCheckinSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: parsed.error.errors[0].message,
        });
      }

      const { challenge_id, ...rest } = parsed.data;

      // Verify challenge is active and user is a participant
      const [challenge, participant] = await Promise.all([
        prisma.challenge.findUnique({
          where: { id: challenge_id },
          select: { status: true, frequency: true, group_id: true },
        }),
        prisma.challengeParticipant.findUnique({
          where: {
            challenge_id_user_id: { challenge_id, user_id: request.userId },
          },
        }),
      ]);

      if (!challenge) {
        return reply
          .status(404)
          .send({
            statusCode: 404,
            error: "Not Found",
            message: "Challenge not found",
          });
      }

      if (challenge.status !== "active") {
        return reply
          .status(400)
          .send({
            statusCode: 400,
            error: "Bad Request",
            message: "Challenge is not active",
          });
      }

      if (!participant) {
        return reply
          .status(403)
          .send({
            statusCode: 403,
            error: "Forbidden",
            message: "Not a participant in this challenge",
          });
      }

      // Rate limit: one check-in per day per challenge
      let canCheckin = true;
      try {
        canCheckin = await rateLimiter.canCheckin(challenge_id, request.userId);
      } catch {
        // Redis unavailable — fall back to DB check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await prisma.checkin.findFirst({
          where: { challenge_id, user_id: request.userId, checked_in_at: { gte: today } },
          select: { id: true },
        });
        canCheckin = !existing;
      }
      if (!canCheckin) {
        return reply.status(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Already checked in for today on this challenge",
        });
      }

      // Create check-in and update participant stats in a transaction
      const newStreak = participant.streak_current + 1;
      const newLongest = Math.max(newStreak, participant.streak_longest);
      const newTotal = participant.total_checkins + 1;

      const [checkin] = await prisma.$transaction([
        prisma.checkin.create({
          data: {
            challenge_id,
            user_id: request.userId,
            photo_url: rest.photo_url ?? null,
            lat: rest.lat ?? null,
            lng: rest.lng ?? null,
            notes: rest.notes ?? null,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
        }),
        prisma.challengeParticipant.update({
          where: {
            challenge_id_user_id: { challenge_id, user_id: request.userId },
          },
          data: {
            total_checkins: newTotal,
            streak_current: newStreak,
            streak_longest: newLongest,
          },
        }),
        // Award XP
        prisma.user.update({
          where: { id: request.userId },
          data: { xp: { increment: 10 } },
        }),
      ]);

      // Mark as checked in for today in Redis (best-effort)
      try { await rateLimiter.markCheckin(challenge_id, request.userId); } catch { /* Redis unavailable */ }

      // Update leaderboard in Redis (best-effort)
      try { await leaderboard.addCheckin(challenge_id, request.userId); } catch { /* Redis unavailable */ }

      // Notify group members
      const groupMembers = await prisma.groupMember.findMany({
        where: {
          group_id: challenge.group_id,
          user_id: { not: request.userId },
        },
        select: { user_id: true },
      });

      if (groupMembers.length > 0) {
        await prisma.notification.createMany({
          data: groupMembers.map((m) => ({
            user_id: m.user_id,
            type: "friend_checkin",
            payload: {
              challenge_id,
              user_id: request.userId,
              username: (checkin.user as { username: string }).username,
            },
          })),
        });
      }

      // Check streak milestones
      if ((STREAK_MILESTONES as readonly number[]).includes(newStreak)) {
        await prisma.notification.create({
          data: {
            user_id: request.userId,
            type: "streak_milestone",
            payload: { challenge_id, streak: newStreak },
          },
        });
      }

      return reply.status(201).send({
        checkin,
        streak: newStreak,
        total_checkins: newTotal,
      });
    },
  });

  // GET /checkins?challengeId=&userId=&limit=&offset=
  app.get("/", {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const query = request.query as {
        challengeId?: string;
        userId?: string;
        limit?: string;
        offset?: string;
      };

      if (!query.challengeId) {
        return reply
          .status(400)
          .send({
            statusCode: 400,
            error: "Bad Request",
            message: "challengeId is required",
          });
      }

      const limit = Math.min(parseInt(query.limit ?? "20"), 50);
      const offset = parseInt(query.offset ?? "0");

      const checkins = await prisma.checkin.findMany({
        where: {
          challenge_id: query.challengeId,
          ...(query.userId ? { user_id: query.userId } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { checked_in_at: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await prisma.checkin.count({
        where: {
          challenge_id: query.challengeId,
          ...(query.userId ? { user_id: query.userId } : {}),
        },
      });

      return reply.send({ checkins, total, limit, offset });
    },
  });

  // POST /checkins/:id/react
  app.post("/:id/react", {
    preHandler: requireAuth,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = reactSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            statusCode: 400,
            error: "Bad Request",
            message: "Invalid emoji",
          });
      }

      const checkin = await prisma.checkin.findUnique({
        where: { id },
        select: { reactions: true, challenge_id: true },
      });

      if (!checkin) {
        return reply
          .status(404)
          .send({
            statusCode: 404,
            error: "Not Found",
            message: "Check-in not found",
          });
      }

      const reactions =
        (checkin.reactions as Array<{ emoji: string; user_id: string }>) ?? [];

      // Toggle reaction (remove if already reacted with same emoji)
      const existingIdx = reactions.findIndex(
        (r) => r.user_id === request.userId && r.emoji === parsed.data.emoji,
      );

      if (existingIdx >= 0) {
        reactions.splice(existingIdx, 1);
      } else {
        reactions.push({ emoji: parsed.data.emoji, user_id: request.userId });
      }

      const updated = await prisma.checkin.update({
        where: { id },
        data: { reactions },
      });

      return reply.send({ reactions: updated.reactions });
    },
  });
}
