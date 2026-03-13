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
│   │           ├── family.ts              # Family module — raw SQL tables, admin approval flow
│   │           ├── friends.ts             # Friends system — search, request, accept/reject, list, sent
│   │           ├── groups.ts              # CRUD + /join/:inviteCode, /invite, /invite-friend, /members, /messages, /invites
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
│       │   │   ├── _layout.tsx            # Tab bar (Inicio, Grupos, Competir, Perfil); Inicio header overridden by index.tsx via useLayoutEffect
│       │   │   ├── index.tsx              # Home — daily progress, stats, 3-tab task list (Hoy/Próximos/Completados), streak pill in header
│       │   │   ├── compete.tsx            # Global leaderboard / compete tab
│       │   │   ├── groups.tsx             # Groups list — My Groups / Discover tabs
│       │   │   └── profile.tsx            # User profile — edit modal, stats, friends count, Active/History tabs
│       │   ├── friends/
│       │   │   ├── index.tsx              # Friends screen — Amigos / Recibidas / Enviadas tabs
│       │   │   └── search.tsx             # Search users by username with debounce
│       │   ├── user/
│       │   │   └── [id].tsx               # Public user profile — avatar, stats, friends count (read-only)
│       │   ├── group/
│       │   │   └── [id].tsx               # Group detail — Retos tab + Chat tab + invite modal
│       │   ├── premium.tsx                # Premium paywall — free vs premium comparison table, slide_from_bottom animation
│       │   ├── family/
│       │   │   ├── [id].tsx               # Family challenge detail — participants, pending checkins, admin approve/reject
│       │   │   ├── create.tsx             # Create family challenge
│       │   │   ├── join.tsx               # Join via FAM-XXXX invite code
│       │   │   └── checkin.tsx            # Family check-in screen
│       │   └── challenge/
│       │       ├── [id].tsx               # Challenge detail — header, "Do It" btn, Leaderboard/Activity tabs; tappable photos with fullscreen modal + share
│       │       ├── create.tsx             # Create challenge modal
│       │       └── photo-checkin.tsx      # Full-screen photo check-in — camera/gallery (portrait 3:4), notes, upload
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
│       │   ├── colors.ts                  # Brand colors — primary #FF7A00, bg #0B0B0B; also exports Colors.gym/diet/etc.
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
- `GET /groups/invites` — pending group_invite notifications for current user (enriched with inviter info)
- `POST /groups/invites/:id/accept` — join group via notification + auto-join active challenges; marks notification read
- `POST /groups/invites/:id/decline` — marks notification read (no join)
- `GET /groups/:id/messages?before=` — paginated chat messages, newest first (max 100)
- `POST /groups/:id/messages` — send a chat message `{ content: string }`
- `GET /groups/:id/feed` — all checkins across all challenges in a group (kept for internal use)
- `POST /challenges`, `GET /challenges/:id`, `PATCH /challenges/:id`
- `POST /challenges/:id/start`, `POST /challenges/:id/cancel`, `POST /challenges/:id/join`
- `POST /checkins`, `GET /checkins?challengeId=`, `POST /checkins/:id/react`
- `GET /leaderboard/:challengeId`
- `GET /users/:id`, `PATCH /users/:id` (accepts `display_name`, `avatar_url`, `timezone`, `username` with uniqueness check), `GET /users/:id/stats`, `GET /users/:id/challenges`, `DELETE /users/:id` (GDPR soft delete via `deleted_at`)
- `DELETE /groups/:id/members/:userId` — removes member + all their `ChallengeParticipant` rows in group + Redis `ZREM` from all leaderboards
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
- `group/[id]` — group detail with Retos + Chat tabs
- `challenge/[id]` — challenge detail with leaderboard + activity; accepts optional `initialTab` param (`leaderboard | activity`)
- `challenge/photo-checkin` — photo check-in screen (modal); params: `challengeId`, `challengeTitle?`, `groupId?`; opens camera automatically on mount, gallery is a fallback option; captures in portrait `aspect: [3, 4]`
- `premium` — paywall screen; `slide_from_bottom` animation; comparison table Gratis vs Premium; "Suscribirse" button (no-op for now); "Ahora no" goes back
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

**API client objects in `lib/api.ts`:** `authApi`, `usersApi`, `groupsApi`, `challengesApi`, `checkinsApi`, `leaderboardApi`, `notificationsApi`, `friendsApi`, `familyApi` + `uploadCheckinPhoto(uri)` + `uploadAvatarPhoto(uri)`.

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

`packages/shared/src/types.ts` — all shared interfaces. Import as `import type { ... } from '@doit/shared'`. Includes: `User`, `Group`, `GroupMember`, `Challenge`, `ChallengeParticipant`, `Checkin`, `LeaderboardEntry`, `Notification`, `Friend`, `FriendRequest`, `SentFriendRequest`, `UserSearchResult`, `FriendshipStatus`, `GroupMessage`, `GroupInviteNotification`.

`apps/mobile/constants/index.ts` (mobile-only):

- `HABIT_CATEGORY_CONFIG` — maps category keys to `{ label, color }` (Spanish labels)
- `QUICK_REACTIONS` — `["+1", "strong", "clap", "fire", "let's go"]`
- `LEVEL_THRESHOLDS` — XP thresholds for levels 1–11; use `getLevel(xp)` helper
- `formatRelativeTime(dateStr)` / `formatDaysLeft(endDateStr)` — Spanish locale display

## UI Design System

**Mandatory color palette** (`apps/mobile/constants/colors.ts`) — use ONLY these colors. Never use blues, greens, purples, or pinks:

| Token | Hex | Usage |
|---|---|---|
| `Colors.primary` | `#FF7A00` | Primary orange — CTA buttons, active tabs, accents |
| `Colors.primarySoft` | `#FF9A3D` | Soft orange — secondary stats, reading category, success |
| `Colors.primaryDim` | `#CC6200` | Dim orange — avatar borders |
| `Colors.background` | `#0B0B0B` | Screen background |
| `Colors.surface` | `#151515` | Cards, inputs |
| `Colors.surfaceElevated` | `#1E1E1E` | Modals, elevated cards |
| `Colors.border` | `#242424` | All borders |
| `Colors.text` | `#EAEAEA` | Primary text |
| `Colors.textSecondary` | `#9A9A9A` | Secondary text, labels |
| `Colors.textMuted` | `#5A5A5A` | Muted text, placeholders |
| `Colors.success` | `#FF9A3D` | Success states (same as primarySoft) |
| `Colors.error` | `#E84444` | Error states only |
| `Colors.streakFire` | `#FF7A00` | Streak fire icon |
| `Colors.streakGold` | `#FF9A3D` | Streak gold accents |
| `Colors.warning` | `#FF7A00` | Warning states (same as primary) |
| `Colors.secundary` | `#f87858` | Secondary orange variant |
| `Colors.secundarySoft` | `#f3a05c` | Soft secondary orange variant |

**Habit category colors** — exported both as `Colors.gym`, `Colors.diet`, etc. (direct tokens on the `Colors` object) and via `HABIT_CATEGORY_CONFIG[category].color` in `apps/mobile/constants/index.ts`:

| Token | Hex |
|---|---|
| `Colors.gym` | `#FF7A00` |
| `Colors.reading` | `#FF9A3D` |
| `Colors.sleep` | `#9A9A9A` |
| `Colors.diet` | `#C8A060` |
| `Colors.study` | `#E8A820` |
| `Colors.custom` | `#8A8070` |

**Medal / rank colors** (hardcoded in `challenge/[id].tsx` `PODIUM_COLORS`):

- 1st place: `#f0a500`
- 2nd place: `#9CA3AF`
- 3rd place: `#CD7C2F`

**Design patterns:**

- Cards: `borderRadius: 16`, `borderWidth: 1`, `borderColor: Colors.border`, `backgroundColor: Colors.surface` — used consistently for ALL cards (stat cards, group cards, task rows, etc.)
- Stat cards: same surface card style (NO tinted backgrounds) — icon + label (uppercase, small, muted) + large number + small delta text, all centered vertically
- Icons inside stat cards: no background circle, `size={24}`, always `color={Colors.primary}` (orange)
- Stat card order: icon → LABEL (uppercase) → number → delta text
- Tab pills: multi-option switcher inside a `Colors.surface` container — active = `Colors.primary` bg + `#000` text
- Primary CTA: `Colors.primary` bg, `#000` text — always
- Secondary CTA: outlined (`borderColor: Colors.border`), `Colors.textSecondary` text
- Category indicators: colored dot (6×6 circle) + label, never emoji
- Progress card: `Colors.surface` bg + border, label "PROGRESO DIARIO" (uppercase muted), motivational text left (26px bold) + percentage right (40px bold orange), progress bar, subtitle below
- Group/list row cards: left colored icon square (`borderRadius: 14`, 48×48, `color + '25'` bg) + info column (name bold + subtitle muted) + right chevron `chevron-right`
- Section headers: title (18px bold white) + link (13px bold orange) in a `space-between` row, `marginBottom: 12`
- Leaderboard top 3: podium layout (2nd–1st–3rd order) with `PodiumCard` inline in `challenge/[id].tsx`
- Logo: text-only `Logo` component ("**Do**It" in two colors); the Inicio tab header uses a Cloudinary image instead of the `Logo` component
- Chat bubbles: right-aligned (orange tint, `Colors.primary + '22'`) for current user, left-aligned (surface) for others; chat uses `FlatList` with `[...messages].reverse()` (no `inverted`) + `scrollToEnd` to avoid text rotation bug
- Loading states: always use `<ActivityIndicator size="large" color={Colors.primary} />`, never text
- Avatars: show `<Image>` when `avatar_url` is set, otherwise show initials in colored circle
- Empty states: centered icon (muted) + text + optional CTA button

## Home Screen Layout (reference implementation — `app/(tabs)/index.tsx`)

The Home screen establishes the visual language for the whole app:

1. **Greeting** — `fontSize: 28, fontWeight: "800"` name + `fontSize: 14` muted subtitle
2. **Progress Card** (full-width `Colors.surface` card):
   - `"PROGRESO DIARIO"` — `fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: Colors.textMuted`
   - Row: motivational text left (`fontSize: 26, fontWeight: "800"`) + `"%"` right (`fontSize: 40, fontWeight: "900", color: Colors.primary`)
   - Progress bar: `height: 8`, track `Colors.border`, fill `Colors.primary` or `Colors.success` at 100%
   - Subtitle below in `Colors.textSecondary`
3. **Stats Row** — 3 equal `flex: 1` cards side by side with `gap: 10`:
   - Each: `Colors.surface` bg + border, centered, order = icon → LABEL → number → delta
   - Icons: no background, `size={24}`, `color={Colors.primary}`
   - Label: `fontSize: 9, fontWeight: "700", letterSpacing: 0.8, color: Colors.textMuted`, uppercase
   - Value: `fontSize: 22, fontWeight: "900"`
   - Delta: `fontSize: 11, fontWeight: "600"`, colored
4. **List section with section header** — title + "Ver todos" link, then vertical list of row cards
5. **Row card pattern** — `Colors.surface` bg + border + `borderRadius: 16` + left icon square + info + right chevron

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
3. Camera opens automatically; user takes photo (or picks from gallery as fallback)
4. **Group challenges only**: optional note field shown ("Cuéntale a tu grupo cómo te fue")
5. On submit: photo uploaded to Supabase Storage → `POST /checkins` with `photo_url` + `notes`
6. **Group challenges**: navigates to Activity tab; **Personal challenges**: navigates to Mi Progreso tab

Button text: "Enviar al grupo" for group challenges, "¡Lo hice!" for personal.

## Group Chat

`group/[id].tsx` has two tabs: **Retos** and **Chat**.

**Chat tab** is a real-time group chat (not check-in feed):
- `GroupMessage` DB table: `id`, `group_id`, `user_id`, `content` (TEXT), `created_at`
- `GET /groups/:id/messages` — newest first, paginated by `?before=<ISO timestamp>`
- `POST /groups/:id/messages` — sends `{ content }`, returns created message with user info
- Mobile: `FlatList` with `[...messages].reverse()` (oldest→newest top→bottom) + `onContentSizeChange` scroll to end. **Do NOT use `inverted` prop** — it applies `scaleY: -1` which flips text on some devices
- Input row at bottom with `KeyboardAvoidingView` (`behavior="padding"` iOS, `behavior="height"` Android, `keyboardVerticalOffset=90` on iOS)
- Polling every 15 seconds via TanStack Query `refetchInterval`

**Retos tab** layout: regular `ScrollView` with hero card + tab pills + challenge list.
**Chat tab** layout: `KeyboardAvoidingView` with fixed header (hero + tabs) + `FlatList` (flex: 1) + input row. The two tabs use different root layouts — switching tabs re-renders appropriately.

`autoJoinActiveChallenges(groupId, userId)` is a helper in `groups.ts` called when a user joins a group (via invite accept OR invite code). It creates `ChallengeParticipant` records with 0 score for all active challenges and seeds them into Redis, so they immediately appear on the leaderboard.

## Group Invites

`groups.tsx` shows a **"Invitaciones pendientes"** section above "Mis Grupos" when the user has pending `group_invite` notifications:
- `GET /groups/invites` — reads unread `group_invite` notifications, enriches with inviter user info
- Each invite card shows: inviter avatar, group name, "X te invitó a unirte", Aceptar/Rechazar buttons
- Accepting calls `POST /groups/invites/:id/accept` → joins group + auto-joins active challenges → navigates to group
- Declining calls `POST /groups/invites/:id/decline` → marks notification read → card disappears

## Group Member Avatars

`GET /groups` includes up to 5 member previews (`id`, `username`, `display_name`, `avatar_url`) per group for bubble display in `GroupCard`. Member chips in `group/[id].tsx` also show real avatars. All text is in Spanish: "miembro/miembros", "Activo/Sin reto", "Ver Grupo", "Invitar".

## Personal vs Group Challenges

Challenges are separated into two distinct types based on `group_id`:

**Personal challenges** (`group_id = null`):
- Created from the **Retos** tab (compete.tsx) FAB → `/challenge/create` with no `groupId` param
- Auto-start immediately (`status: 'active'`, `start_date: now()`) — no manual start needed
- Only the creator is a participant; `POST /:id/join` returns 400
- Auth: checked against creator or participant, not group membership
- No `reward_description`, no `ghost_mode` in the create form
- `challenge/[id].tsx` shows **"Mi Progreso" + "Actividad"** tabs (no leaderboard)
  - Mi Progreso: 3-stat row (racha actual / mejor racha / % completado) + streak vs record bar comparison + full day calendar grid (circle per day, orange filled = done, orange border = today, dimmed = future)
- `checkins.ts`: skips group member notifications when `challenge.group_id` is null
- Per-challenge streak tracked in `ChallengeParticipant.streak_current/streak_longest`; effective streak computed at read time (returns 0 if last check-in was >1 day ago)

**Group challenges** (`group_id` set):
- Created from group detail screen or group challenge flow; require group membership
- Start manually once 2+ participants have joined
- `challenge/[id].tsx` shows **"Clasificación" + "Actividad"** tabs
- Create form includes: reward/apuesta field + Ghost Mode toggle
- Freemium limit: 1 active group challenge per group (redirects to `/premium`)

**Schema**: `challenges.group_id` is nullable (`String? @db.Uuid`). Migration applied: `ALTER TABLE challenges ALTER COLUMN group_id DROP NOT NULL;`. Run `npm run db:generate` in `apps/api` after restarting the dev server to regenerate the Prisma client.

**`ChallengeRetoCard` component** (`components/ChallengeRetoCard.tsx`): unified card with two variants:
- `variant="personal"` — streak row (🔥 current / 🏆 best) + progress bar (checkin-based) + motivational message + "Do It" / "Ver" buttons
- `variant="group"` — participant count row + reward + progress bar (time-based) — no Do It button
Used in: `compete.tsx` Personal tab (personal variant) and `group/[id].tsx` active challenges (group variant).

## Key Business Rules

- A challenge requires at least 2 participants before it can be started (group challenges only)
- Only the challenge creator can call `POST /challenges/:id/start`
- Only the creator or a group admin can update or cancel a challenge
- Only `pending` challenges can be updated; only `pending`/`active` can be cancelled
- Group capacity: 2–10 members
- Challenge durations are fixed at 7, 30, or 90 days
- "Ghost Mode" hides exact leaderboard scores, showing rank order only (group challenges only)
- No monetary stakes in MVP — `reward_description` is free text only (group challenges only)
- Redis is optional — checkin rate-limiting falls back to DB if Redis is unavailable

## Supabase Project

- Project name: **DoIt**
- Project ID: `vqkxpnsynmwpgyjwhxwx`
- Region: `us-east-2`
- Storage bucket: `checkin-photos` (public) — used for both checkin photos and avatars

## Freemium Model

Free tier limits enforced on the client:
- **1 group** — FAB in `groups.tsx` checks `groups.length >= 1` before showing create modal; redirects to `/premium` if over limit
- **1 personal challenge** — FAB in `compete.tsx` checks `activeChallenges.length >= 1` (personal only, `group_id === null`); redirects to `/premium`
- **1 group challenge** — "Crear nuevo reto" in `group/[id].tsx` checks `myChallengesData.challenges.length >= 1`; redirects to `/premium`

`app/premium.tsx` — comparison table (Gratis vs Premium), "Suscribirse — Próximamente" button (no-op), "Ahora no" calls `router.back()`. When payment is implemented, replace the `>= 1` conditions with `!user.isPremium`.

## Google Sign-In

Implemented in `(auth)/sign-in.tsx` using `expo-web-browser`:
1. `supabase.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } })` — gets OAuth URL without opening browser
2. `WebBrowser.openAuthSessionAsync(url, redirectTo)` — opens Google auth in Chrome Custom Tab (Android) / SFSafariViewController (iOS)
3. Redirect lands at `doit://auth/callback` — parse `access_token` + `refresh_token` from URL fragment
4. `supabase.auth.setSession()` — triggers `onAuthStateChange` → auth guard handles routing

Required Supabase config: Dashboard → Authentication → URL Configuration → Redirect URLs must include `doit://auth/callback`.
Google Cloud Console: Web client with `https://vqkxpnsynmwpgyjwhxwx.supabase.co/auth/v1/callback` in authorized redirect URIs. `WebBrowser.maybeCompleteAuthSession()` called at module level.

## Photo Upload

**Image normalization** (`lib/api.ts`): `toJpeg()` runs before every upload. Converts `avif`, `webp`, `heic`, `heif`, `bmp`, `tiff` → JPEG using `expo-image-manipulator` (`compress: 0.85`). This prevents Supabase Storage 400 errors from Android phones that save in AVIF format. Applied to both `uploadCheckinPhoto()` and `uploadAvatarPhoto()`.

**Portrait format**: Camera and gallery both use `aspect: [3, 4]`. Activity feed photos use `aspectRatio: 3/4` style. Check-in preview uses `aspectRatio: 3/4`.

**Sharing photos** (`challenge/[id].tsx`): Tapping an activity photo opens a fullscreen modal with:
- "DoIt APP" branding text (orange "Do" + white "It" + muted "APP")
- Share button (iOS/Android only — hidden on web via `Platform.OS` check)
- Download flow: `expo-file-system/legacy` `downloadAsync()` to cache → `expo-sharing` `shareAsync()` with `mimeType: 'image/jpeg'` + `UTI: 'public.image'`
- File named `doit_share_{timestamp}.{ext}` to avoid stale cache

## Group Invite Code

The `invite_code` is returned by `GET /groups/:id` as part of the group object (no extra API call needed). It is displayed in the invite modal (`group/[id].tsx`) as large orange text with letter-spacing. The "Compartir enlace" option uses `group.invite_code` directly in the share message — not `POST /groups/:id/invite` which requires admin role.

`openInvite: '1'` param on `group/[id]` route auto-opens the invite modal on mount — used by both `GroupCard` "Invitar" button and when accepting a group invite from `groups.tsx`.

## Remove Group Member (Admin)

`DELETE /groups/:id/members/:userId` now performs full cleanup:
1. Deletes `GroupMember` record
2. `deleteMany` on `ChallengeParticipant` for all challenges in the group
3. `leaderboard.removeUser(challengeId, userId)` — `ZREM` from Redis sorted set for each challenge

New Redis helper: `leaderboard.removeUser(challengeId, userId)` → `redis.zrem(key, userId)`.

UI: Admin sees an `✕` (`close-circle` icon) on each member chip except their own. Tapping shows a confirmation `Alert` warning that progress will be deleted.

## Installed Packages (Mobile)

Beyond the original dependencies:
- `expo-web-browser` — Google OAuth flow
- `expo-file-system` — image download before sharing (import from `expo-file-system/legacy`)
- `expo-sharing` — native share sheet with actual image file
- `expo-image-manipulator` — normalize images to JPEG before upload

## Family Module

A separate accountability system distinct from Groups/Challenges, designed for smaller trusted circles (e.g., family members).

**DB tables** — NOT in Prisma schema; created via raw SQL migrations:
- `family_challenges` — `id`, `admin_id`, `title`, `description`, `duration_days`, `frequency`, `require_photo`, `reward_description`, `invite_code` (`FAM-XXXX` format), `status`, `start_date`, `end_date`, `created_at`
- `family_participants` — `id`, `challenge_id`, `user_id`, `total_checkins`, `joined_at`
- `family_checkins` — `id`, `challenge_id`, `user_id`, `photo_url`, `notes`, `approved` (nullable bool), `checked_in_at`, `created_at`

**Key difference from group challenges:** Checkins require **admin approval** (`approved IS NULL` = pending, `true` = approved, `false` = rejected). If `require_photo = false`, checkins are auto-approved on submit.

**API routes** (registered at `/family` in `apps/api/src/routes/family.ts`):
- `POST /family` — create (admin)
- `GET /family` — list mine (admin or participant)
- `GET /family/:id` — detail; returns `{ challenge, role, participants, admin, pending_checkins, has_checked_in_today }`
- `POST /family/join` — join via `{ invite_code }` (code format: `FAM-XXXX`)
- `POST /family/:id/start` — start (admin only, needs ≥1 participant)
- `POST /family/:id/checkins` — check in
- `GET /family/:id/checkins` — list checkins
- `PATCH /family/:id/checkins/:cid` — approve/reject (`{ action: 'approve' | 'reject' }`, admin only)
- `POST /family/:id/invite-friend` — sends `family_invite` notification to a friend
- `GET /family/invites` — pending `family_invite` notifications for current user
- `POST /family/invites/:nid/accept` — join via notification
- `POST /family/invites/:nid/decline`

**Mobile:** `familyApi` in `lib/api.ts`; screens at `app/family/[id].tsx`, `create.tsx`, `join.tsx`, `checkin.tsx`.

> **Important:** Because these tables are raw SQL (not Prisma models), schema changes require manual SQL migration — `npm run db:generate` alone is not enough.

## Language

- All UI text must be written in Spanish (labels, buttons, error messages, placeholders)
