import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import cron from "node-cron";
import "dotenv/config";

import { prisma } from "./plugins/db";
import { redis } from "./plugins/redis";
import { getUTCDays } from "./lib/dates";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { groupRoutes } from "./routes/groups";
import { challengeRoutes } from "./routes/challenges";
import { checkinRoutes } from "./routes/checkins";
import { leaderboardRoutes } from "./routes/leaderboard";
import { notificationRoutes } from "./routes/notifications";
import { friendRoutes } from "./routes/friends";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap() {
  // Connect Redis
  try {
    await redis.connect();
  } catch {
    app.log.warn(
      "Redis not available — leaderboard will fall back to DB queries",
    );
  }

  // CORS
  const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser / server-to-server
      if (process.env.NODE_ENV !== "production") {
        // In development allow any localhost / Expo origin
        if (
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          origin.startsWith("exp://")
        ) {
          return cb(null, true);
        }
      }
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });

  // Global rate limit
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s`,
    }),
  });

  // Health check
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  }));

  // Routes
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(userRoutes, { prefix: "/users" });
  await app.register(groupRoutes, { prefix: "/groups" });
  await app.register(challengeRoutes, { prefix: "/challenges" });
  await app.register(checkinRoutes, { prefix: "/checkins" });
  await app.register(leaderboardRoutes, { prefix: "/leaderboard" });
  await app.register(notificationRoutes, { prefix: "/notifications" });
  await app.register(friendRoutes, { prefix: "/friends" });

  // Global error handler
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? "Internal Server Error",
      message:
        statusCode === 500 ? "An unexpected error occurred" : error.message,
    });
  });

  // Cron: Reset streak to 0 for users who missed an entire day (runs at 00:01 UTC)
  cron.schedule("1 0 * * *", async () => {
    const { yesterdayUTC } = getUTCDays();

    // Reset users whose last check-in was before yesterday (missed the whole day)
    const reset = await prisma.user.updateMany({
      where: {
        streak_current: { gt: 0 },
        OR: [
          { last_checkin_date: { lt: yesterdayUTC } },
          { last_checkin_date: null },
        ],
      },
      data: { streak_current: 0 },
    });

    if (reset.count > 0) {
      app.log.info(
        `[Streak] Reset streak for ${reset.count} users who missed yesterday`,
      );
    }
  });

  // Cron: Mark challenges as completed when end_date has passed
  cron.schedule("0 * * * *", async () => {
    const completed = await prisma.challenge.updateMany({
      where: {
        status: "active",
        end_date: { lt: new Date() },
      },
      data: { status: "completed" },
    });
    if (completed.count > 0) {
      app.log.info(`Marked ${completed.count} challenges as completed`);
    }
  });

  // Cron: Send daily reminder notifications (at 8 PM UTC)
  cron.schedule("0 20 * * *", async () => {
    const activeParticipants = await prisma.challengeParticipant.findMany({
      where: { challenge: { status: "active" } },
      select: {
        user_id: true,
        challenge_id: true,
        challenge: { select: { title: true } },
      },
    });

    if (activeParticipants.length === 0) return;

    await prisma.notification.createMany({
      data: activeParticipants.map((p) => ({
        user_id: p.user_id,
        type: "daily_reminder",
        payload: {
          challenge_id: p.challenge_id,
          challenge_title: p.challenge.title,
        },
      })),
    });

    app.log.info(
      `Sent ${activeParticipants.length} daily reminder notifications`,
    );
  });

  const port = parseInt(process.env.PORT ?? "4000");
  await app.listen({ port, host: "127.0.0.1" });
  app.log.info(`DoIt API running on http://127.0.0.1:${port}`);
}

bootstrap().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
