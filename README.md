# DoIt — Phase 0 Setup

## Prerequisites
- Node.js 20+
- PostgreSQL (local or Supabase)
- Redis (local or Upstash)
- Supabase project (free tier at supabase.com)
- Expo Go app on your phone

---

## 1. Environment variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Mobile
cp apps/mobile/.env.example apps/mobile/.env
```

Fill in:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Settings → API
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same project, use anon key
- `DATABASE_URL` — your Postgres connection string (Supabase: Settings → Database → Connection string → URI)
- `REDIS_URL` — local `redis://localhost:6379` or Upstash URL

---

## 2. Database setup

```bash
# Push schema to your database
npm run db:push

# (Optional) Seed with demo data
npm run db:seed
```

---

## 3. Run the API

```bash
npm run dev:api
# → API starts at http://localhost:3000
# → GET http://localhost:3000/health should return { status: "ok" }
```

---

## 4. Run the mobile app

```bash
npm run dev:mobile
# → Scan the QR code with Expo Go (iOS/Android)
# → Or press 'i' for iOS simulator / 'a' for Android emulator
```

---

## Project structure

```
doit/
├── apps/
│   ├── api/          # Fastify backend (Node.js + Prisma + Redis)
│   └── mobile/       # React Native Expo app
├── packages/
│   └── shared/       # Shared TypeScript types and constants
├── prd.md            # Product Requirements Document
└── README.md
```

## API endpoints (Phase 0)

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /auth/sync-user | Create user profile after Supabase auth |
| GET | /auth/me | Get current user |
| POST | /auth/check-username | Check username availability |
| GET | /users/:id | Get user profile |
| GET | /users/:id/stats | Get user stats |
| PATCH | /users/:id | Update profile |
| GET | /groups | List my groups |
| POST | /groups | Create group |
| GET | /groups/:id | Get group details |
| POST | /groups/join/:inviteCode | Join by invite code |
| POST | /groups/:id/invite | Get invite link |
| DELETE | /groups/:id/members/:userId | Remove member |
| POST | /challenges | Create challenge |
| GET | /challenges/:id | Get challenge |
| PATCH | /challenges/:id | Update challenge |
| POST | /challenges/:id/start | Start challenge |
| POST | /challenges/:id/cancel | Cancel challenge |
| POST | /challenges/:id/join | Join challenge |
| POST | /checkins | Log a check-in |
| GET | /checkins | List check-ins |
| POST | /checkins/:id/react | Add emoji reaction |
| GET | /leaderboard/:challengeId | Get leaderboard |
| POST | /leaderboard/:challengeId/sync | Sync Redis → DB |
| GET | /notifications/:userId | Get notifications |
| PATCH | /notifications/:id/read | Mark as read |
| PATCH | /notifications/mark-all-read | Mark all as read |
