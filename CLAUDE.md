# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DoIt is a social habit-accountability app where friend groups create challenges, check in daily with photo proof, and compete on a leaderboard — with real-world stakes (e.g., "loser buys brunch"). MVP targeting young adult social groups.

## Monorepo Structure

Turborepo monorepo with two apps and one shared package:

- `apps/api` — Fastify (Node.js) REST API, TypeScript, Prisma ORM, Redis for leaderboards
- `apps/mobile` — React Native (Expo) mobile app, expo-router file-based routing, Zustand + TanStack Query
- `packages/shared` — Shared TypeScript types and constants imported by both apps as `@doit/shared`

## Project File Structure

```
C:\dev\doit\
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   └── schema.prisma              # DB schema (Prisma + PostgreSQL)
│   │   └── src/
│   │       ├── index.ts                   # Fastify bootstrap, CORS, rate limit, cron jobs. PORT=4000
│   │       ├── middleware/
│   │       │   └── auth.ts                # requireAuth / optionalAuth — verifies Supabase JWT
│   │       ├── plugins/
│   │       │   ├── db.ts                  # Prisma singleton
│   │       │   ├── redis.ts               # ioredis client + leaderboard + rateLimiter helpers
│   │       │   └── supabase.ts            # Supabase admin client
│   │       └── routes/
│   │           ├── auth.ts                # POST /auth/sync-user, /auth/me, /auth/check-username
│   │           ├── challenges.ts          # CRUD + /start /cancel /join
│   │           ├── checkins.ts            # POST /checkins, GET /checkins, POST /checkins/:id/react
│   │           ├── groups.ts              # CRUD + /join/:inviteCode, /invite, /members, /feed
│   │           ├── leaderboard.ts         # GET /leaderboard/:challengeId
│   │           ├── notifications.ts       # GET/PATCH /notifications
│   │           └── users.ts               # GET/PATCH /users/:id, /stats, /challenges
│   │
│   └── mobile/
│       ├── app/
│       │   ├── _layout.tsx                # Root layout — auth guard, redirects auth↔tabs
│       │   ├── (auth)/
│       │   │   ├── _layout.tsx
│       │   │   ├── sign-in.tsx            # Phone OTP / Google / Apple sign-in
│       │   │   └── onboarding.tsx         # Username setup after first login
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx            # Tab bar (Home, Compete, Profile)
│       │   │   ├── index.tsx              # Groups home — My Groups / Discover tabs, FAB
│       │   │   ├── compete.tsx            # Global leaderboard / compete tab
│       │   │   ├── groups.tsx             # (alias/secondary groups screen)
│       │   │   └── profile.tsx            # User profile — stats, Active/History challenge tabs
│       │   ├── group/
│       │   │   └── [id].tsx               # Group detail — Retos tab + Feed tab (WhatsApp-style)
│       │   └── challenge/
│       │       ├── [id].tsx               # Challenge detail — header, "Do It" btn, Leaderboard/Activity tabs
│       │       ├── create.tsx             # Create challenge modal
│       │       └── photo-checkin.tsx      # Full-screen photo check-in — camera/gallery, notes, upload
│       ├── components/
│       │   ├── ChallengeCard.tsx
│       │   ├── CheckinButton.tsx          # Legacy modal check-in (kept, not used in main flow)
│       │   ├── GroupCard.tsx              # Member bubble avatars + action buttons
│       │   ├── LeaderboardItem.tsx
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       └── Logo.tsx               # "DoIt" text logo in two colors
│       ├── constants/
│       │   ├── colors.ts                  # Brand colors — primary #fe7d1b, bg #111111, etc.
│       │   └── index.ts                   # HABIT_CATEGORY_CONFIG, formatDaysLeft, formatRelativeTime
│       ├── hooks/
│       │   └── useAuth.ts                 # Reads from auth store
│       ├── lib/
│       │   ├── api.ts                     # All API calls — authApi, groupsApi, challengesApi, checkinsApi, etc.
│       │   └── supabase.ts                # Supabase JS client
│       └── store/
│           └── auth.ts                    # Zustand store — session, supabaseUser, user
│
└── packages/
    └── shared/
        └── src/
            ├── constants.ts               # HABIT_CATEGORIES, CHALLENGE_STATUSES, STREAK_MILESTONES, etc.
            └── types.ts                   # User, Group, Challenge, Checkin, LeaderboardEntry, etc.
```

## Commands

### Root (run from `C:\dev\doit`)

```bash
npx turbo dev          # Start all apps in dev mode
npx turbo build        # Build all packages
npx turbo type-check   # Type-check all packages
```

### API (`apps/api`)

```bash
npm run dev            # tsx watch src/index.ts (hot reload)
npm run build          # tsc compile to dist/
npm run db:migrate     # prisma migrate dev
npm run db:generate    # prisma generate (after schema changes)
npm run db:push        # push schema without migration
npm run db:studio      # open Prisma Studio
npm run db:seed        # seed demo data
```

### Mobile (`apps/mobile`)

```bash
npm run dev            # expo start
npm run ios            # expo run:ios
npm run android        # expo run:android
npm run lint           # eslint
```

## API Architecture

**Port:** `4000` (set via `PORT` env var, defaults to 4000 in `index.ts`)

**Auth flow:** Supabase handles authentication (phone OTP, Google, Apple). After login, the mobile app calls `POST /auth/sync-user` to create/sync the user record in our PostgreSQL DB. All protected routes use `requireAuth` middleware which verifies the Supabase JWT and attaches `request.userId`.

**Route structure:** Each domain is a separate file in `apps/api/src/routes/` registered as a Fastify plugin. Input validation uses Zod schemas inline in route handlers.

**Leaderboard:** Scores are stored in Redis sorted sets keyed `leaderboard:{challengeId}`. On challenge start, participants are seeded into Redis. Check-ins increment the Redis score. Redis is optional — if unavailable, the app falls back to DB queries.

**Database:** Prisma with PostgreSQL (Supabase). Schema in `apps/api/prisma/schema.prisma`. Models: `User`, `Group`, `GroupMember`, `Challenge`, `ChallengeParticipant`, `Checkin`, `LeaderboardSnapshot`, `Notification`.

**Environment variables** (`apps/api/.env`):

- `DATABASE_URL` — PostgreSQL connection string (pooled)
- `DIRECT_URL` — PostgreSQL direct connection (for migrations)
- `REDIS_URL` — Redis connection string
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `PORT` — defaults to 4000
- `ALLOWED_ORIGINS` — CORS origins (e.g., `http://localhost:8081`)

**Environment variables** (`apps/mobile/.env`):

- `EXPO_PUBLIC_API_URL` — API base URL (defaults to `http://localhost:4000`)

**API endpoints summary:**

- `POST /auth/sync-user` — create/sync user after Supabase sign-in
- `GET /groups`, `POST /groups`, `GET /groups/:id`, `POST /groups/join/:code`
- `POST /groups/:id/invite`, `DELETE /groups/:id/members/:userId`
- `GET /groups/:id/feed` — all checkins across all challenges in a group (for WhatsApp feed)
- `POST /challenges`, `GET /challenges/:id`, `PATCH /challenges/:id`
- `POST /challenges/:id/start`, `POST /challenges/:id/cancel`, `POST /challenges/:id/join`
- `POST /checkins`, `GET /checkins?challengeId=`, `POST /checkins/:id/react`
- `GET /leaderboard/:challengeId`
- `GET /users/:id`, `PATCH /users/:id`, `GET /users/:id/stats`, `GET /users/:id/challenges`
- `GET /notifications`, `PATCH /notifications/:id`

## Mobile Architecture

**Routing:** expo-router file-based routing. Route groups:

- `(auth)/` — sign-in and onboarding (shown when not authenticated)
- `(tabs)/` — main tab navigation (Inicio, Grupos, Competir, Perfil)
- `group/[id]` — group detail with Retos + Feed tabs
- `challenge/[id]` — challenge detail with leaderboard + activity
- `challenge/photo-checkin` — photo check-in screen (modal); params: `challengeId`, `challengeTitle?`, `groupId?`
- `challenge/create` — create challenge modal

**Auth state:** `store/auth.ts` (Zustand) holds `session`, `supabaseUser`, and the synced `user` record. The auth guard in `_layout.tsx` redirects between auth and main flows.

**Data fetching:** TanStack Query wraps all API calls. The `request<T>()` helper in `lib/api.ts` attaches the Supabase session JWT and only sends `Content-Type: application/json` when there is a body (important: no-body POSTs like `/start` must not send the header).

**API client objects in `lib/api.ts`:** `authApi`, `usersApi`, `groupsApi`, `challengesApi`, `checkinsApi`, `leaderboardApi`, `notificationsApi` + `uploadCheckinPhoto(uri)`.

**Supabase Storage:** Public bucket `checkin-photos` — photos uploaded via `uploadCheckinPhoto()` in `lib/api.ts`. Files stored as `{userId}/{timestamp}.{ext}`. Public read, authenticated upload/delete.

## Shared Package

`packages/shared/src/constants.ts`:

- `HABIT_CATEGORIES`: `gym | reading | sleep | diet | study | custom`
- `CHALLENGE_STATUSES`: `pending | active | completed | cancelled`
- `CHALLENGE_DURATIONS`: `7 | 30 | 90` (days only)
- `CHALLENGE_FREQUENCIES`: `daily | weekly`
- `STREAK_MILESTONES`: `[7, 14, 21, 30, 60, 90]`

`packages/shared/src/types.ts` — all shared interfaces. Import as `import type { ... } from '@doit/shared'`.

`apps/mobile/constants/index.ts` (mobile-only):

- `HABIT_CATEGORY_CONFIG` — maps category keys to `{ label, color }` (Spanish labels)
- `QUICK_REACTIONS` — `["+1", "strong", "clap", "fire", "let's go"]`
- `LEVEL_THRESHOLDS` — XP thresholds for levels 1–11; use `getLevel(xp)` helper
- `formatRelativeTime(dateStr)` / `formatDaysLeft(endDateStr)` — Spanish locale display

## UI Design System

**Brand colors** (`apps/mobile/constants/colors.ts`):

- `#fe7d1b` — primary (orange)
- `#111111` — background
- `#fff9f9` — text
- `#1c1c1c` — surface
- `#252525` — surfaceElevated
- `#2e2e2e` — border

**Design patterns:**

- Cards: `borderRadius: 16-18`, `borderWidth: 1`, `borderColor: Colors.border`, `backgroundColor: Colors.surface`
- Stat cards: tinted background `color + '20'` (no border)
- Tab pills: two-option switcher — active = `Colors.primary` bg + `#000` text
- Primary CTA: `Colors.primary` bg, `#000` text — always
- Secondary CTA: outlined (`borderColor: Colors.border`), `Colors.textSecondary` text
- Category indicators: colored dot (7×7 circle) + label, never emoji
- Leaderboard top 3: podium layout (2nd–1st–3rd order) with `PodiumCard` inline in `challenge/[id].tsx`
- Logo: text-only `Logo` component ("**Do**It" in two colors)
- Feed bubbles: right-aligned (orange tint) for current user, left-aligned (surface) for others

## Check-in Flow

1. User taps **"Do It"** button on `challenge/[id].tsx`
2. Navigates to `challenge/photo-checkin.tsx` (modal)
3. User takes photo with camera or picks from gallery
4. Optional note added
5. On submit: photo uploaded to Supabase Storage → `POST /checkins` with `photo_url` + `notes`
6. Checkin appears in group Feed tab and challenge Activity tab

## Group Feed

`GET /groups/:id/feed` returns all checkins across all challenges in a group, newest first.
Displayed in `group/[id].tsx` under the **Feed** tab as WhatsApp-style chat bubbles.
Auto-refreshes every 30 seconds.

## Key Business Rules

- A challenge requires at least 2 participants before it can be started
- Only the challenge creator can call `POST /challenges/:id/start`
- Only the creator or a group admin can update or cancel a challenge
- Only `pending` challenges can be updated; only `pending`/`active` can be cancelled
- Group capacity: 2–10 members
- Challenge durations are fixed at 7, 30, or 90 days
- "Ghost Mode" hides exact leaderboard scores, showing rank order only
- No monetary stakes in MVP — `reward_description` is free text only
- Redis is optional — checkin rate-limiting falls back to DB if Redis is unavailable

## Supabase Project

- Project name: **DoIt**
- Project ID: `vqkxpnsynmwpgyjwhxwx`
- Region: `us-east-2`
- Storage bucket: `checkin-photos` (public)

## Language

- All UI text must be written in Spanish (labels, buttons, error messages, placeholders)
