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
│   │       │   └── auth.ts                # requireAuth + requireSupabaseAuth — verifies Supabase JWT
│   │       ├── plugins/
│   │       │   ├── db.ts                  # Prisma singleton
│   │       │   ├── redis.ts               # ioredis client + leaderboard + rateLimiter helpers
│   │       │   └── supabase.ts            # Supabase admin client
│   │       └── routes/
│   │           ├── auth.ts                # POST /auth/sync-user, /auth/me, /auth/check-username
│   │           ├── challenges.ts          # CRUD + /start /cancel /join
│   │           ├── checkins.ts            # POST /checkins, GET /checkins, POST /checkins/:id/react
│   │           ├── friends.ts             # Friends system — search, request, accept/reject, list, sent
│   │           ├── groups.ts              # CRUD + /join/:inviteCode, /invite, /invite-friend, /members, /feed
│   │           ├── leaderboard.ts         # GET /leaderboard/:challengeId
│   │           ├── notifications.ts       # GET/PATCH /notifications
│   │           └── users.ts               # GET/PATCH /users/:id, /stats, /challenges
│   │
│   └── mobile/
│       ├── app/
│       │   ├── _layout.tsx                # Root layout — auth guard, redirects auth↔tabs
│       │   ├── index.tsx                  # Entry point — reads AsyncStorage+session, routes to intro/tabs/sign-in
│       │   ├── intro.tsx                  # 5 animated onboarding slides (no FlatList, Animated API)
│       │   ├── (auth)/
│       │   │   ├── _layout.tsx
│       │   │   ├── sign-in.tsx            # Email+password auth — method/register/login/verify-otp/verify-recovery steps
│       │   │   ├── onboarding.tsx         # Username + display name + optional avatar after first login
│       │   │   └── reset-password.tsx     # New password (×2) after clicking reset email link
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx            # Tab bar (Inicio, Grupos, Competir, Perfil)
│       │   │   ├── index.tsx              # Home — daily progress, stats, challenge task list
│       │   │   ├── compete.tsx            # Global leaderboard / compete tab
│       │   │   ├── groups.tsx             # Groups list — My Groups / Discover tabs
│       │   │   └── profile.tsx            # User profile — edit modal, stats, friends count, Active/History tabs
│       │   ├── friends/
│       │   │   ├── index.tsx              # Friends screen — Amigos / Recibidas / Enviadas tabs
│       │   │   └── search.tsx             # Search users by username with debounce
│       │   ├── user/
│       │   │   └── [id].tsx               # Public user profile — avatar, stats, friends count (read-only)
│       │   ├── group/
│       │   │   └── [id].tsx               # Group detail — Retos tab + Feed tab + invite modal
│       │   └── challenge/
│       │       ├── [id].tsx               # Challenge detail — header, "Do It" btn, Leaderboard/Activity tabs
│       │       ├── create.tsx             # Create challenge modal
│       │       └── photo-checkin.tsx      # Full-screen photo check-in — camera/gallery, notes, upload
│       ├── components/
│       │   ├── AvatarPicker.tsx           # Reusable avatar picker — opens gallery, uploads, shows preview
│       │   ├── ChallengeCard.tsx
│       │   ├── CheckinButton.tsx          # Legacy modal check-in (kept, not used in main flow)
│       │   ├── FriendRow.tsx              # Tappable friend row — real avatar, name, adaptive action button
│       │   ├── GroupCard.tsx              # Real member avatar bubbles + Spanish labels + action buttons
│       │   ├── LeaderboardItem.tsx
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       └── Logo.tsx               # "DoIt" text logo in two colors
│       ├── constants/
│       │   ├── colors.ts                  # Brand colors — primary #fe7d1b, bg #111111, etc.
│       │   └── index.ts                   # HABIT_CATEGORY_CONFIG, formatDaysLeft, formatRelativeTime
│       ├── hooks/
│       │   └── useAuth.ts                 # useAuthGuard (session listener + routing) + useAuth (store accessor)
│       ├── lib/
│       │   ├── api.ts                     # All API calls — authApi, usersApi, groupsApi, challengesApi,
│       │   │                              #   checkinsApi, leaderboardApi, notificationsApi, friendsApi
│       │   │                              #   + uploadCheckinPhoto() + uploadAvatarPhoto()
│       │   └── supabase.ts                # Supabase JS client
│       └── store/
│           └── auth.ts                    # Zustand store — session, supabaseUser, user, isLoading, isRecovery
│
└── packages/
    └── shared/
        └── src/
            ├── constants.ts               # HABIT_CATEGORIES, CHALLENGE_STATUSES, STREAK_MILESTONES, etc.
            └── types.ts                   # User, Group, Challenge, Checkin, LeaderboardEntry,
                                           #   Friend, FriendRequest, SentFriendRequest, UserSearchResult,
                                           #   FriendshipStatus, etc.
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

**Auth flow:** Supabase handles authentication (email+password). After login, the mobile app calls `POST /auth/sync-user` to create/sync the user record in our PostgreSQL DB.

- `requireAuth` — verifies Supabase JWT + looks up user in `users` table; used for all normal protected routes
- `requireSupabaseAuth` — verifies Supabase JWT only, no DB lookup; used for `/auth/sync-user` since the user doesn't exist yet

**Route structure:** Each domain is a separate file in `apps/api/src/routes/` registered as a Fastify plugin. Input validation uses Zod schemas inline in route handlers.

**Leaderboard:** Scores stored in Redis sorted sets keyed `leaderboard:{challengeId}`. On challenge start, participants seeded into Redis. Check-ins increment score. Redis optional — falls back to DB queries if unavailable.

**Database:** Prisma with PostgreSQL (Supabase). Schema in `apps/api/prisma/schema.prisma`. Models: `User`, `Group`, `GroupMember`, `Challenge`, `ChallengeParticipant`, `Checkin`, `LeaderboardSnapshot`, `Notification`, `Friendship`.

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

- `POST /auth/sync-user` — create/sync user after Supabase sign-in; accepts `username`, `display_name`, `timezone`, `avatar_url`
- `GET /auth/me` — get current user record
- `POST /auth/check-username` — check username availability (public)
- `GET /groups` — returns groups with up to 5 member previews (including `avatar_url`) for bubble display
- `POST /groups`, `GET /groups/:id`, `POST /groups/join/:code`
- `POST /groups/:id/invite`, `DELETE /groups/:id/members/:userId`
- `POST /groups/:id/invite-friend` — send in-app invite notification to a friend
- `GET /groups/:id/feed` — all checkins across all challenges in a group (WhatsApp feed)
- `POST /challenges`, `GET /challenges/:id`, `PATCH /challenges/:id`
- `POST /challenges/:id/start`, `POST /challenges/:id/cancel`, `POST /challenges/:id/join`
- `POST /checkins`, `GET /checkins?challengeId=`, `POST /checkins/:id/react`
- `GET /leaderboard/:challengeId`
- `GET /users/:id`, `PATCH /users/:id` (accepts `display_name`, `avatar_url`, `timezone`, `username` with uniqueness check), `GET /users/:id/stats`, `GET /users/:id/challenges`
- `GET /notifications`, `PATCH /notifications/:id`
- `GET /friends/search?q=` — search users by username prefix (returns `friendship_status` + `friendship_id`)
- `POST /friends/request` — send friend request (creates `friend_request` notification)
- `GET /friends/requests` — incoming pending requests
- `GET /friends/requests/sent` — outgoing pending requests (registered before `/:id` to avoid param clash)
- `PATCH /friends/requests/:id` — accept or reject (`{ action: 'accept' | 'reject' }`)
- `GET /friends` — accepted friends list
- `GET /friends/count/:userId` — friend count for profile display

## Mobile Architecture

**Routing:** expo-router file-based routing. Route groups:

- `index.tsx` — entry point: reads AsyncStorage + Supabase session, routes to `/intro`, `/(tabs)`, or `/(auth)/sign-in`
- `intro.tsx` — 5 animated onboarding slides; on complete routes to `/(auth)/sign-in?register=true`
- `(auth)/` — sign-in, onboarding, reset-password (shown when not authenticated or in recovery mode)
- `(tabs)/` — main tab navigation (Inicio, Grupos, Competir, Perfil)
- `friends/` — friends list (3 tabs) + search screens (stack routes from profile)
- `user/[id]` — public profile screen for any user (avatar, stats, friend count)
- `group/[id]` — group detail with Retos + Feed tabs
- `challenge/[id]` — challenge detail with leaderboard + activity
- `challenge/photo-checkin` — photo check-in screen (modal); params: `challengeId`, `challengeTitle?`, `groupId?`
- `challenge/create` — create challenge modal

**Auth state:** `store/auth.ts` (Zustand) holds `session`, `supabaseUser`, `user`, `isLoading`, `isRecovery`. The auth guard in `useAuthGuard()` (called from `_layout.tsx`) redirects between auth and main flows.

**Auth guard routing logic:**
- `index.tsx` and `intro.tsx` manage their own routing — guard ignores them
- `isRecovery = true` → `/(auth)/reset-password` (takes priority over all other rules)
- No session → `/(auth)/sign-in`
- Anonymous session → `/(tabs)`
- Session but no DB user → `/(auth)/onboarding`
- Session + DB user → `/(tabs)`
- On `onAuthStateChange` with event `PASSWORD_RECOVERY` → sets `isRecovery = true`, skips `authApi.me()`
- On `onAuthStateChange`, `setLoading(true)` is called before `authApi.me()` to prevent premature redirect to onboarding

**Data fetching:** TanStack Query wraps all API calls. The `request<T>()` helper in `lib/api.ts` attaches the Supabase session JWT and only sends `Content-Type: application/json` when there is a body (critical: no-body POSTs like `/start` must not send the header).

**API client objects in `lib/api.ts`:** `authApi`, `usersApi`, `groupsApi`, `challengesApi`, `checkinsApi`, `leaderboardApi`, `notificationsApi`, `friendsApi` + `uploadCheckinPhoto(uri)` + `uploadAvatarPhoto(uri)`.

**Supabase Storage:** Public bucket `checkin-photos` — used for both check-in photos and avatars.
- Check-in photos: `{userId}/{timestamp}.{ext}`
- Avatar photos: `avatars/{userId}/{timestamp}.{ext}` — uploaded with `uploadAvatarPhoto()`, upsert-style via timestamp

## Shared Package

`packages/shared/src/constants.ts`:

- `HABIT_CATEGORIES`: `gym | reading | sleep | diet | study | custom`
- `CHALLENGE_STATUSES`: `pending | active | completed | cancelled`
- `CHALLENGE_DURATIONS`: `7 | 30 | 90` (days only)
- `CHALLENGE_FREQUENCIES`: `daily | weekly`
- `STREAK_MILESTONES`: `[7, 14, 21, 30, 60, 90]`

`packages/shared/src/types.ts` — all shared interfaces. Import as `import type { ... } from '@doit/shared'`. Includes: `User`, `Group`, `GroupMember`, `Challenge`, `ChallengeParticipant`, `Checkin`, `LeaderboardEntry`, `Notification`, `Friend`, `FriendRequest`, `SentFriendRequest`, `UserSearchResult`, `FriendshipStatus`.

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
- Loading states: always use `<ActivityIndicator size="large" color={Colors.primary} />`, never text
- Avatars: show `<Image>` when `avatar_url` is set, otherwise show initials in colored circle

## Auth Flow (Email + Password)

Sign-in screen (`(auth)/sign-in.tsx`) has steps: `method | register | login | forgot | verify-otp | verify-recovery`

- `method` — choose register, login, or Google
- `register` — email + password + confirm → `supabase.auth.signUp()`; if no session → `verify-otp`
- `login` — email + password → `supabase.auth.signInWithPassword()`
- `forgot` — email → `supabase.auth.resetPasswordForEmail()`; user receives email with deep link
- `verify-otp` / `verify-recovery` — 6-digit code input → `supabase.auth.verifyOtp({ type: 'signup' | 'recovery' })`
- Intro last slide routes to `/(auth)/sign-in?register=true` to open directly on register step

**Password reset flow:**
1. User taps "Olvidé mi contraseña" → `supabase.auth.resetPasswordForEmail()` sends email
2. User opens link → app receives deep link → Supabase fires `PASSWORD_RECOVERY` event
3. `useAuthGuard` catches `PASSWORD_RECOVERY`, sets `isRecovery = true` in store
4. Auth guard redirects to `/(auth)/reset-password`
5. User enters new password twice → `supabase.auth.updateUser({ password })` → clears `isRecovery` → `/(tabs)`

**Supabase email OTP:** For 6-digit codes to be sent (instead of magic links), the Supabase email template for "Confirm signup" must use `{{ .Token }}`. Configure in Supabase Dashboard → Authentication → Email Templates.

## Profile & Avatars

**AvatarPicker component** (`components/AvatarPicker.tsx`):
- Tapping opens `expo-image-picker` gallery directly (no action sheet — avoids Android/web issues)
- Uploads via `uploadAvatarPhoto()` in `lib/api.ts` to `checkin-photos` bucket under `avatars/` prefix
- Shows local preview immediately, rolls back on upload error
- Used in onboarding screen and edit profile modal

**Edit profile modal** (in `profile.tsx`):
- Opens as bottom sheet over profile screen
- Fields: avatar (AvatarPicker), display name, username (with live availability check)
- Saves via `PATCH /users/:id`, then calls `setUser()` on Zustand store to update UI immediately

**Public user profile** (`app/user/[id].tsx`):
- Accessible by tapping any `FriendRow` — `FriendRow` uses `useRouter` internally to navigate to `/user/{id}`
- Shows avatar, display name, username, level badge, stats (challenges/check-ins/streak), friend count

## Friends System

`Friendship` table: `requester_id`, `addressee_id`, `status` (`pending | accepted | rejected`). One row per pair — no symmetric rows.

`FriendshipStatus` in search results: `none | pending_sent | pending_received | accepted`. Search also returns `friendship_id` so the mobile can call `PATCH /friends/requests/:id` directly for `pending_received` items.

`FriendRow` component (`components/FriendRow.tsx`):
- Shows real avatar photo when `avatar_url` is set, initials fallback otherwise
- Entire row is tappable → navigates to `/user/{id}`
- Action button adapts to `friendship_status`: "Agregar" / "Enviado" / "Aceptar" / "Amigos"

Friends screen (`friends/index.tsx`) has **3 tabs**:
- **Amigos** — accepted friends list
- **Recibidas** — incoming pending requests with Aceptar/Rechazar buttons; badge count shown; 409 Conflict handled gracefully (treated as already-processed, queries refreshed)
- **Enviadas** — outgoing pending requests with "Enviado" badge

Profile screen shows friend count (tappable → `/friends`). Search screen has 300ms debounce, minimum 2 chars.

Group invite modal (`group/[id].tsx`) shows friends not already in the group + share-link option. Inviting a friend sends a `group_invite` notification.

## Check-in Flow

1. User taps **"Do It"** button on `challenge/[id].tsx`
2. Navigates to `challenge/photo-checkin.tsx` (modal)
3. User takes photo with camera or picks from gallery
4. Optional note added
5. On submit: photo uploaded to Supabase Storage → `POST /checkins` with `photo_url` + `notes`
6. Checkin appears in group Feed tab and challenge Activity tab

## Group Feed

`GET /groups/:id/feed` returns all checkins across all challenges in a group, newest first.
Displayed in `group/[id].tsx` under the **Feed** tab as WhatsApp-style chat bubbles with real user avatars.
Auto-refreshes every 30 seconds.

## Group Member Avatars

`GET /groups` includes up to 5 member previews (`id`, `username`, `display_name`, `avatar_url`) per group for bubble display in `GroupCard`. Member chips in `group/[id].tsx` also show real avatars. All text is in Spanish: "miembro/miembros", "Activo/Sin reto", "Ver Grupo", "Invitar".

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
- Storage bucket: `checkin-photos` (public) — used for both checkin photos and avatars

## Language

- All UI text must be written in Spanish (labels, buttons, error messages, placeholders)
