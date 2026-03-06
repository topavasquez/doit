# DoIt — Product Requirements Document

**Version:** 1.0
**Date:** March 2026
**Status:** Draft
**Author:** Founding Team

---

## Table of Contents

1. [Refined Product Concept](#1-refined-product-concept)
2. [MVP Definition](#2-mvp-definition)
3. [Scalable System Architecture](#3-scalable-system-architecture)
4. [High-Level Database Model](#4-high-level-database-model)
5. [Monetization Strategy](#5-monetization-strategy)
6. [Risks & Challenges](#6-risks--challenges)
7. [6–12 Month Roadmap](#7-612-month-roadmap)
8. [Differentiators vs. Existing Apps](#8-differentiators-vs-existing-apps)

---

## 1. Refined Product Concept

### Core Thesis

Social stakes — real consequences — drive behavior change more effectively than virtual points or badges. Most habit-tracking apps fail because they rely on intrinsic motivation alone. DoIt bridges the intention-action gap by combining three forces: **peer accountability**, **competitive gamification**, and **real-world rewards**.

> *"DoIt turns your habits into bets you make with the people you actually care about."*

The premise is simple. You and your friends create a group challenge — say, "gym 5x/week for 30 days." Everyone logs their workouts daily. Whoever completes the challenge wins the agreed stake: the losers cook dinner, someone does chores, someone picks up the tab next Friday. The accountability is social. The proof is in-app. The consequence is real.

### Critical Improvements to the Original Concept

Before treating this as an execution document, the following risks must be internalized:

**1. Verification is the #1 product risk.**
Photo proof alone will be gamed within weeks. A sustainable verification system requires layered evidence: photo + optional geolocation + AI anomaly detection + peer voting. Crucially, different habit types require different verification approaches — a gym check-in can be geolocated to a fitness center; a reading habit cannot. The MVP must establish a minimum verification standard that is good enough to deter casual cheating without creating so much friction it kills adoption. This is the hardest UX design problem in the product.

**2. Two target segments need separate UX.**
Early research points to two distinct user groups: (a) teens and young adults competing socially with peers, and (b) families using the app for parent-child accountability. These groups have fundamentally different flows, trust models, safety requirements, and monetization tolerance. Trying to serve both in v1 is a recipe for building neither well. The MVP will focus exclusively on the young adult social segment. Family Mode ships in Phase 4.

**3. Real-money rewards carry serious legal exposure.**
If the app holds, pools, or facilitates the transfer of money between users, it may be classified as a gambling product under state and federal law in the US, and under analogous regulations internationally. This is not a hypothetical risk — apps have been pulled from stores for exactly this reason. The v1 design eliminates monetary stakes entirely. All rewards are text descriptions ("winner picks the restaurant," "losers do dishes"). Monetary pools are a post-MVP, lawyer-reviewed, jurisdiction-restricted feature built on Stripe Connect escrow. The App Store listing must not use the words "bet," "wager," or "gamble."

**4. Habit-agnostic design is strategically double-edged.**
Supporting any habit type maximizes the addressable audience but makes verification harder, marketing less focused, and onboarding more confusing. The MVP will launch with five curated habit categories — **gym, reading, sleep, diet, and study** — that have proven, well-understood verification patterns. Users can enter a custom habit, but discovery and recommendations focus on these five.

**5. Cold-start problem: the app is worthless alone.**
If a new user's friends aren't on DoIt, they have nothing to do. This is the single most common reason social apps die in the first week. The MVP must include: (a) a Solo Mode that delivers personal value before any friends join, and (b) public community challenges a user can join immediately on day one, with no friend required. Virality comes from inviting friends once they've seen the app's value firsthand.

### User Personas

**Persona A — The Competitive College Student**
Sofia, 21, pre-med student. She and her four roommates make verbal commitments constantly ("we're going to the gym every day this semester") and fail within two weeks. She wants something with real teeth — a commitment device that makes defaulting embarrassing and costly. She's competitive, digitally native, uses TikTok and Instagram daily, and is comfortable with gamified apps. She will become the group admin and recruit her friends.

**Persona B — The Friend Group Accountability Squad**
Marcus, 26, early-career professional. He has a WhatsApp group with five friends from college where they hype each other up but never follow through. He wants the group dynamic — the banter, the trash talk, the leaderboard — in a focused space, not buried in a general chat. He's the kind of user who turns on push notifications for apps he cares about.

**Persona C — The Parent + Teen Household (v2 target)**
Jennifer, 42, parent of two teens. She wants a shared accountability tool for screen time, chores, and study hours, with the ability to set tasks and verify completion. She's not the primary v1 target but represents significant LTV potential for a Family tier. Serving her requires COPPA compliance, parental consent flows, and a different reward model entirely (allowance, not social stakes).

### Product Modes

| Mode | Target User | Core Value |
|---|---|---|
| **Social Mode** | Friend groups, college peers | Compete, embarrass losers, win real things |
| **Solo Mode** | Individual users, new users without friends | Personal streak tracking, join public challenges |
| **Family Mode** *(v2)* | Parents + children | Assign tasks, verify completion, manage household accountability |

---

## 2. MVP Definition

### Philosophy

Launch with the smallest set of features that creates a memorable "holy shit" moment for a group of four friends competing over a 30-day habit challenge. Every feature decision is filtered through this question: *does this make the core moment more powerful, or does it add complexity without proportionate value?*

The core loop is: **join group → make public commitment → check in daily → see leaderboard → win real thing**. The MVP ships when this loop works end-to-end for 50 beta users without breaking.

### In Scope — MVP

**Authentication & Onboarding**
- Sign in via phone number (SMS OTP), Google OAuth, or Apple Sign-In
- Username selection, optional profile photo, brief "what are you working on?" prompt
- Onboarding flow branches: "Join a group" (invite link) vs. "Explore solo challenges"

**User Profile**
- Username, avatar, level display (cosmetic only in v1)
- Personal stats: total challenges joined, current streaks, all-time check-ins
- Challenge history

**Groups**
- Create a group: name, optional group photo, invite method
- Invite members via shareable deep link or phone number (SMS)
- Group capacity: 2–10 members
- Group admin controls: remove members, cancel challenges

**Challenges**
- Create a challenge within a group: title, habit category (5 preset + custom), duration (7/30/90 days), check-in frequency (daily or weekly), reward description (free text — e.g., "Losers buy brunch")
- Challenge start: manual (admin triggers) or scheduled (auto-start on set date)
- Challenge status states: `pending` (waiting for participants) → `active` → `completed` / `cancelled`

**Check-ins**
- One-tap check-in per day (or per week for weekly challenges)
- Optional photo attachment per check-in
- Check-in window: defined per challenge (e.g., must check in by 11:59 PM local time)
- Missed check-in = streak break (no penalty points in v1, just a counter reset)

**Leaderboard**
- Ranked by completion percentage (check-ins completed / check-ins required to date)
- Updates in near real-time (within 60 seconds of any check-in)
- Shows: rank, username, avatar, streak, completion %
- **Ghost Mode:** group admin toggle that hides exact percentages, showing only rank order — adds competitive tension without demoralizing bottom performers prematurely

**Streak Tracking**
- Per-user, per-challenge streak counter
- Visual streak flame indicator
- Streak milestone push notifications: 7 days, 14 days, 21 days, 30 days

**Push Notifications**
- Daily reminder (user-configurable time, default 8:00 PM)
- Friend check-in notification ("Sofia just checked in 🔥")
- Streak milestone alerts
- Challenge start / end notifications
- Missed check-in alert (sent at 10:00 PM if no check-in that day)

**Social Feed**
- Group activity feed: "[User] checked in today," "[User] hit a 14-day streak"
- Emoji reactions on check-ins (quick response, no comment threads in v1)

### Out of Scope — Post-MVP

The following are explicitly deferred. They must not creep into v1 scope:

- Monetary / escrow rewards (Stripe, legal review required)
- AI-powered fraud detection on photos
- Full XP / levels / badges system (lightweight level display only)
- Family / parental mode
- Public challenge discovery
- In-app messaging / DMs
- Apple Watch or wearable integrations
- Web app
- Challenge templates library (manual entry only in v1)
- Referral reward system (launch manually, automate in v2)
- Analytics dashboard for users

### MVP Success Metric

**Primary:** 40% of users who complete a challenge start a new one within 7 days.

**Supporting metrics:**
- D1 retention ≥ 40%, D7 ≥ 20%, D30 ≥ 10%
- Daily check-in rate ≥ 60% among active challenge participants
- Challenge completion rate ≥ 50% among started challenges
- Average group size at challenge start ≥ 4 members

---

## 3. Scalable System Architecture

### Recommended Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile | React Native (Expo) | Single codebase for iOS + Android; fast iteration; massive ecosystem; Expo managed workflow reduces native config overhead |
| Backend | Node.js + Fastify | High-throughput API; low-overhead async I/O; large developer pool; easier hiring than Go/Rust at early stage |
| Database | PostgreSQL | Relational model fits challenge/participant/checkin data perfectly; ACID compliance critical for check-in counting and leaderboard integrity |
| Cache / Real-time data | Redis | Sorted sets for leaderboards (O(log N) update, O(N) range query); session store; rate limiting; ephemeral streak locks |
| Object Storage | AWS S3 | Proven at scale; presigned URL pattern keeps photo uploads off the API server |
| Auth | Supabase Auth | Handles phone OTP, Google, Apple out of the box; free tier covers MVP; can self-host later |
| Push Notifications | Expo Push + Firebase Cloud Messaging | Cross-platform; Expo abstracts FCM + APNs; handles token management |
| Real-time events | Supabase Realtime or Socket.io | Leaderboard live updates; group feed events |
| Hosting (MVP) | Railway | Zero-ops deployment; PostgreSQL + Redis + Node in one platform; predictable pricing; migrate to AWS when scale demands it |
| Hosting (Scale) | AWS ECS + RDS + ElastiCache | Container orchestration; managed database with read replicas; production-grade Redis |
| CDN | AWS CloudFront | Media delivery for profile photos and check-in images |
| Analytics | PostHog (self-hosted) | Full funnel analysis; session recording; feature flags; open source — no per-event pricing surprises |
| Error monitoring | Sentry | Real-time error tracking; stack traces; release tracking |
| Performance monitoring | Datadog | APM, uptime, alerting (add at Phase 2+) |

### Architecture Pattern

**Modular monolith for MVP → selective microservice extraction at scale.**

Starting with microservices introduces DevOps overhead that kills early-stage velocity. A well-structured monolith with clear service boundaries is the pragmatic choice. Natural extraction points as load grows:
- `NotificationService` — high volume, can be decoupled to a queue-based worker
- `LeaderboardService` — computationally isolated, Redis-centric
- `VerificationService` — eventually runs ML models, expensive to co-locate

### Core Services

```
AuthService
  POST /auth/phone/request-otp
  POST /auth/phone/verify
  POST /auth/google
  POST /auth/apple
  POST /auth/refresh
  DELETE /auth/session

UserService
  GET /users/:id
  PATCH /users/:id
  GET /users/:id/stats
  DELETE /users/:id  (GDPR compliance)

GroupService
  POST /groups
  GET /groups/:id
  POST /groups/:id/invite
  POST /groups/join/:inviteCode
  DELETE /groups/:id/members/:userId

ChallengeService
  POST /challenges
  GET /challenges/:id
  PATCH /challenges/:id
  POST /challenges/:id/start
  POST /challenges/:id/cancel

CheckinService
  POST /checkins
  GET /checkins?challengeId=&userId=
  POST /checkins/:id/react  (emoji reaction)

LeaderboardService
  GET /leaderboard/:challengeId   (reads from Redis sorted set)
  POST /leaderboard/:challengeId/sync  (internal: DB → Redis reconciliation)

NotificationService
  POST /notifications/schedule
  GET /notifications/:userId
  PATCH /notifications/:id/read
  (Internal: cron jobs for daily reminders, streak alerts)
```

### Scalability Design Decisions

**Leaderboard architecture:**
Leaderboards must feel instant. Querying PostgreSQL to compute rankings on every page load is a non-starter at scale. The design:
1. On each check-in, increment the user's score in a Redis Sorted Set keyed by `leaderboard:{challengeId}`
2. Serve leaderboard reads directly from Redis (ZREVRANGE, O(log N + M))
3. Run a periodic reconciliation job (every 5 minutes) to sync Redis scores back to PostgreSQL for persistence and reporting
4. On challenge completion, snapshot final rankings to `leaderboard_snapshots` table

**Photo upload architecture:**
Check-in photos must not route through the API server — this creates bandwidth bottlenecks and inflates server costs. The design:
1. Client requests a presigned S3 URL from the API (`POST /checkins/upload-url`)
2. Client uploads the photo directly to S3 using the presigned URL
3. Client sends the check-in request with the returned S3 object key
4. API stores the key; CloudFront serves the image via CDN

**Rate limiting on check-ins:**
The check-in endpoint is the most fraud-prone surface. Rate limits:
- Max 1 check-in per user per challenge per day (enforced in Redis with a 24h TTL key)
- Max 10 API requests per second per IP (nginx rate limiting)
- Exponential backoff on failed auth attempts

**Database read replicas:**
At Phase 3+, add a PostgreSQL read replica. Analytics queries (user stats, completion rates, admin dashboards) run against the replica. Write traffic (check-ins, group joins) hits the primary only. This protects transactional performance from analytical query load.

---

## 4. High-Level Database Model

### Schema

```sql
-- Core user record. Minimal PII; keep auth-specific data in the auth provider.
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT UNIQUE,
  email         TEXT UNIQUE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  level         INTEGER NOT NULL DEFAULT 1,
  xp            INTEGER NOT NULL DEFAULT 0,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ  -- soft delete for GDPR
)

-- A social group. The container for challenges.
groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_by    UUID NOT NULL REFERENCES users(id),
  invite_code   TEXT UNIQUE NOT NULL,  -- short random string for deep links
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- Many-to-many: users <-> groups
group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
)

-- A challenge lives inside a group.
challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES users(id),
  title               TEXT NOT NULL,
  description         TEXT,
  habit_category      TEXT NOT NULL CHECK (habit_category IN ('gym', 'reading', 'sleep', 'diet', 'study', 'custom')),
  frequency           TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  duration_days       INTEGER NOT NULL CHECK (duration_days IN (7, 30, 90)),
  start_date          DATE,
  end_date            DATE,
  reward_description  TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  ghost_mode          BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- Tracks each user's participation and progress in a challenge.
challenge_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_current  INTEGER NOT NULL DEFAULT 0,
  streak_longest  INTEGER NOT NULL DEFAULT 0,
  total_checkins  INTEGER NOT NULL DEFAULT 0,
  rank            INTEGER,  -- denormalized from Redis for display
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
)

-- Individual check-in events.
checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_url       TEXT,           -- S3 object key
  lat             DECIMAL(9,6),   -- optional geolocation
  lng             DECIMAL(9,6),
  notes           TEXT,
  verified        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- Periodic snapshots of leaderboard state for historical analytics.
leaderboard_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank            INTEGER NOT NULL,
  score           DECIMAL(5,2) NOT NULL,  -- completion % at snapshot time
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- In-app notifications queue.
notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'friend_checkin', 'streak_milestone', 'challenge_start', etc.
  payload     JSONB NOT NULL DEFAULT '{}',
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- V2: Reward tracking after challenge completion.
rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES challenges(id),
  winner_id       UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL CHECK (type IN ('custom', 'monetary')),
  description     TEXT,
  amount          DECIMAL(10,2),   -- NULL for custom rewards
  currency        TEXT,            -- NULL for custom rewards
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'claimed', 'disputed')),
  claimed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### Key Relationships

- A `User` can be in many `Groups` via `group_members`
- A `Group` can run many `Challenges` over time
- A `Challenge` has many `Participants` via `challenge_participants` (one record per user per challenge)
- Each `Participant` generates many `Checkins` — at most one per day (or week) per challenge
- Check-ins optionally reference an S3 photo key; images are served via CloudFront
- `leaderboard_snapshots` are written by a background job and used for end-of-challenge reporting, not live queries

### Key Indexes

```sql
-- Check-in lookups (frequent)
CREATE INDEX idx_checkins_challenge_user ON checkins(challenge_id, user_id, checked_in_at DESC);

-- Group member lookups
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);

-- Active challenge queries
CREATE INDEX idx_challenges_group_status ON challenges(group_id, status);

-- Notification feed
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
```

---

## 5. Monetization Strategy

### Philosophy

Free to play, pay to win harder. DoIt's network effect depends on virality — charging for basic social features kills word-of-mouth growth. Core functionality (join a group, create a challenge, check in, see the leaderboard) is always free. Monetization targets power users who want more challenges, better tools, or deeper analytics.

### Freemium Tiers

| Tier | Price | Features |
|---|---|---|
| **Free** | $0/mo | 1 active challenge per group, basic leaderboard, streak tracking, up to 3 groups |
| **DoIt Pro** | $4.99/mo or $39.99/yr | Unlimited challenges, advanced personal stats, custom badges, 1 streak freeze per month, priority support, early access to new features |
| **DoIt Family** | $7.99/mo | Everything in Pro + parental mode, up to 6 linked family accounts, family activity dashboard, child-safe content controls |

**Pricing rationale:**
- $4.99 sits just below the $5 psychological threshold — the most common high-converting price point for consumer apps
- Annual plan ($39.99 = $3.33/mo effective) improves LTV by 3–4× vs. monthly; targets high-intent users who can commit
- Family tier at $7.99 is priced relative to comparable parental control apps ($10–15/mo) while being meaningfully cheaper

### Revenue Streams

**1. Subscriptions (primary, Years 1–2)**
DoIt Pro and DoIt Family subscriptions, processed via App Store / Google Play in-app purchase APIs. Target: 3–5% conversion of MAU to paid within 12 months of monetization launch.

**2. Consumable In-App Purchases (secondary)**
One-time purchases for power users who don't want a full subscription:
- Streak Freeze Pack — $1.99 for 3 streak freezes (saves your streak if you miss a day)
- Challenge Extension — $0.99 to extend a challenge by 7 days (all participants must agree)
- Custom Trophy Emoji — $0.49 to set a custom emoji as the challenge winner's trophy

**3. Monetary Challenge Escrow (v2, post-legal review)**
When users want real money on the line:
- DoIt holds the pool via Stripe Connect during the challenge
- Charges 3–5% platform fee on the total pool amount
- Restricted to users 18+ in jurisdictions where social wagers are legal
- Requires one-time ID verification (Stripe Identity)
- "Bet" language is never used — framing is "financial commitment" or "reward pool"
- Revenue potential: if 10% of active groups use monetary stakes at avg $20/person × 4 people × 3% fee = $2.40 per challenge

**4. Brand Partnership Challenges (v3)**
Sponsored challenges — e.g., "Run 30K this month with Nike → win Nike gear." Revenue model: fixed sponsorship fee + performance bonus per completed challenge. Target: fitness, wellness, and lifestyle brands. Average deal size: $5,000–50,000 per campaign. Requires minimum 20,000 MAU to be credible.

**5. B2B / White-Label (v4)**
Sell the platform to corporate wellness programs, universities, and sports teams under a SaaS license. Employers pay per-seat or flat monthly fee. Estimated ARPU: $5–15/seat/month. Long-lead sales cycle but high LTV. Target: 5,000+ employee companies with wellness budget.

### Target Unit Economics

| Metric | Target |
|---|---|
| CAC | < $5 (organic via invite loop; avoid paid UA until LTV is proven) |
| LTV (Pro annual) | $40 (year 1) → $80+ (if D365 retention improves) |
| LTV / CAC ratio | ≥ 8× |
| Break-even subscriber count | ~2,000 Pro subscribers covers early team + infra ops |
| Gross margin | ~85% (App Store takes 15–30%; hosting scales linearly) |

---

## 6. Risks & Challenges

This section is honest about the hardest problems in the product. Every risk listed here needs a named owner and a mitigation plan before MVP launch.

### Technical Risks

| Risk | Severity | Status | Mitigation |
|---|---|---|---|
| Habit verification fraud | **High** | Unresolved | Layered verification: photo + optional GPS + peer flagging + AI anomaly detection (post-MVP). For MVP: honor system + social deterrence. Ghost Mode reduces incentive to lie. |
| Cold-start (no friends on app) | **High** | Partial | Solo mode for day-one value; public challenge discovery in v2; viral invite flow in onboarding. |
| Push notification fatigue | Medium | Addressable | Smart bundling (max 3 pushes/day); user-configurable timing and types; A/B test notification copy. |
| Real-time leaderboard at scale | Medium | Designed | Redis sorted sets; see Section 3. Architecture is proven at orders of magnitude beyond DoIt's near-term user count. |
| Photo storage and bandwidth costs | Low | Addressable | Client-side compression to < 200 KB before upload; 90-day photo retention then delete; presigned S3 direct upload. |

### Legal / Regulatory Risks

| Risk | Severity | Status | Mitigation |
|---|---|---|---|
| Gambling regulation (monetary pools) | **Critical** | Unresolved | No monetary pools in v1. Before v2: engage a gaming/fintech attorney; geofence restricted jurisdictions; use "reward" not "bet" framing throughout; obtain legal opinion memo. |
| COPPA (under-13 users) | **High** | Must design now | Age gate at sign-up; DOB required; COPPA-compliant parental consent flow for users under 13; enforce in Family Mode. No data collection on minors without consent. |
| App Store / Play Store rejection | **High** | Preventable | Review App Store guideline Section 5.3 (gambling) and Section 3.1.1 (in-app purchase) before first submission. Avoid "bet," "wager," "gamble" in any user-facing string or App Store metadata. |
| GDPR / CCPA data compliance | Medium | Addressable | Privacy policy from day one; user data export endpoint; data deletion (soft delete + purge schedule); DPA-compliant AWS region selection (eu-west-1 for EU users); do not sell user data. |

### Market Risks

| Risk | Severity | Status | Mitigation |
|---|---|---|---|
| User churn after challenge ends | **High** | Core product problem | Chain challenges mechanic (challenge auto-suggests next round); seasonal events; group momentum features; completion celebration → immediate next challenge prompt. |
| Friend group adoption gap | **High** | Core growth problem | Viral invite built into challenge creation flow, not an afterthought. Challenge cannot start until ≥ 2 members join — creates pressure to recruit. |
| Large competitor copies feature | Medium | Monitor | Speed to market; build group history and shared memory as switching cost; network effects compound. Feature parity can be copied; culture cannot. |
| Low verification adoption | Medium | UX problem | Make verification optional but meaningfully rewarded (verified check-ins earn 2× streak credit in v1.5). Peer trust — not mandatory verification — is the primary social contract. |

### Product Risks

**Leaderboard demotivation:** A user in last place with 20% completion, watching the leader hit 100%, will quit. The leaderboard design must show personal improvement metrics alongside rank — "You're up 3 spots this week" or "Your best week ever." Rank alone is brutal; rank + trajectory is motivating.

**Trivial habit gaming:** If users create challenges for habits so easy they're guaranteed to win ("drink one glass of water per day"), it undermines the social stakes. Mitigation: group members set the habit standard together at challenge creation, and anyone in the group can flag a check-in as suspicious for peer review.

**Notification permission rates:** iOS requires explicit permission for push notifications. If the onboarding flow prompts too early (before the user has seen value), acceptance rates drop below 40%. Design: request notification permission only after the user joins their first challenge or completes their first check-in.

---

## 7. 6–12 Month Roadmap

### Phase 0 — Foundation (Months 1–2)

Goal: Working software in the hands of 20–30 known users.

- [ ] Finalize and document tech stack; set up monorepo (Turborepo or similar)
- [ ] Set up CI/CD pipeline: GitHub Actions → Railway (staging + production environments)
- [ ] Implement Auth: phone OTP, Google, Apple sign-in via Supabase Auth
- [ ] User profile: create, read, update (no avatar upload yet — use initials avatar)
- [ ] Group creation and joining via invite code
- [ ] Challenge creation: title, habit category (5 preset), duration, frequency, reward description
- [ ] Manual check-in (tap to log, no photo yet)
- [ ] Basic leaderboard: completion % from PostgreSQL query (Redis not required yet at this scale)
- [ ] Push notifications: daily reminder only
- [ ] Internal alpha: 20–30 users (founders' networks, friends, family)
- [ ] Define instrumentation: log every check-in, challenge create/join/complete event to PostHog

**Exit criteria for Phase 0:** 5+ groups have run at least one 7-day challenge to completion. At least one user has spontaneously recruited a friend without being asked.

### Phase 1 — Private Beta (Months 2–3)

Goal: Validate the core social loop with 100–300 real users outside the founding team's network.

- [ ] Photo proof check-ins: presigned S3 upload, CloudFront delivery
- [ ] Redis leaderboard: replace DB query with sorted set; real-time updates via polling (WebSocket in v2)
- [ ] Push notifications: friend check-in, streak milestones, challenge start/end
- [ ] Ghost Mode: admin toggle
- [ ] Streak system: track current and longest streak per participant; break on missed day
- [ ] Deep link invite: share challenge link that opens app to join flow
- [ ] Closed beta recruitment: targeted Discord communities (fitness, self-improvement, study groups), Reddit (r/getdisciplined, r/selfimprovement)
- [ ] User interviews: talk to 20+ beta users; focus on verification trust, leaderboard motivation, notification quality
- [ ] NPS survey embedded in app after first challenge completion

**Exit criteria for Phase 1:** D7 retention ≥ 20% among beta cohort. At least 3 beta users report they recruited a friend specifically because they wanted to beat them.

### Phase 2 — Public Launch (Months 4–5)

Goal: App Store + Google Play launch. First 1,000 MAU.

- [ ] App Store and Google Play submission: metadata, screenshots, privacy policy, age rating
- [ ] Onboarding optimization: separate flows for "I have a group" vs. "I'm starting solo"
- [ ] Public challenge discovery: browse and join challenges from strangers (solo mode unlock)
- [ ] Lightweight XP + level system: XP awarded per check-in, level thresholds displayed on profile
- [ ] Social sharing: generate shareable image on streak milestones and challenge completion
- [ ] Referral program (manual): invite code in profile, track attribution
- [ ] Launch activities: Product Hunt launch, TikTok creator seeding (2–3 micro-influencers in fitness/self-improvement), Reddit launch posts
- [ ] Growth target: 1,000 MAU within 60 days of launch

**Key launch risk:** App Store review can take 1–3 weeks for first submission. Factor buffer time. Have test flight build ready for pre-launch influencer seeding.

### Phase 3 — Growth & Monetization (Months 5–8)

Goal: Prove willingness to pay. 5,000 MAU, 200 paying subscribers.

- [ ] DoIt Pro subscription launch: Stripe + App Store / Play Store IAP
- [ ] Streak Freeze consumable IAP
- [ ] Advanced personal stats dashboard: completion rates by habit category, streak history graph, win/loss record
- [ ] Challenge templates: curated starting points for each of the 5 habit categories
- [ ] Seasonal competitions: "30-Day January Challenge" with a public leaderboard and sponsored prize (negotiate with a fitness brand)
- [ ] Creator partnerships: 2–3 fitness / productivity creators do challenge content; affiliate link for DoIt Pro
- [ ] A/B test notification copy, daily reminder time, onboarding flow steps
- [ ] Revisit cold-start solutions based on data: are users churning before they get a friend to join?

### Phase 4 — Expansion (Months 8–12)

Goal: 20,000 MAU, 1,000 paying subscribers. New segments unlocked.

- [ ] Family Mode: parental account linking, child task assignment, completion verification flow, separate safe-for-kids UX
- [ ] Monetary reward escrow: Stripe Connect, 18+ gate, ID verification, geo-restriction, legal sign-off
- [ ] AI-assisted photo verification: flag anomalous check-ins (photos of wrong location, reused photos, AI-generated images)
- [ ] Public challenge discovery v2: trending challenges, categories, featured challenges
- [ ] Wearable integration: Apple Health and Google Fit for automatic check-in verification for relevant habit types (gym, sleep, running)
- [ ] Corporate wellness pilot: approach 2–3 mid-size companies; propose a paid pilot of DoIt for employee fitness challenges
- [ ] Evaluate international expansion: identify top 3 non-US markets by organic sign-up geography; localize for those markets

---

## 8. Differentiators vs. Existing Apps

### Competitive Landscape

| App | What They Do Well | DoIt's Advantage |
|---|---|---|
| **Habitica** | RPG gamification, deep solo habit system, active community | Real social stakes with real-world consequences; your actual friends, not game avatars; custom rewards you negotiate |
| **Streaks** | Clean, minimal iOS habit tracking; Apple Watch native | Social layer; group competition; streak is meaningful because people are watching |
| **Duolingo** | Streak mechanics mastered; push notification psychology; leagues | Habit-agnostic; customizable rewards; losing to your roommate matters more than losing to a stranger in a league |
| **Strava** | Fitness social graph; segments; KOM culture | Works for any habit, not just fitness; no hardware or fitness tracker required; groups are private and intentional |
| **BeReal** | Authentic daily moment sharing; time-limited prompt | Habit-specific; competitive context; persistent accountability beyond a single daily snapshot |
| **Finch / Reflectly** | Self-care gamification; emotional wellness framing | Extroverted competitive angle; social-first vs. solo introspection; real external consequences |
| **GoalsOnTrack** | Comprehensive goal + habit management; journal | Mobile-first; social-first; youth-oriented UX; no corporate wellness feel |
| **Beachbody / Noom** | Structured programs; coach accountability | No subscription program required; bring your own habit; social peers, not hired coaches |

### DoIt's Unique Intersection

No existing app simultaneously offers all of:
1. **Specific friend groups** (not strangers or algorithmic leagues)
2. **Real-life, user-defined rewards** (not virtual trophies or XP)
3. **Habit-agnostic tracking** (gym, reading, sleep, diet, study, anything)
4. **Layered anti-cheat verification** (photo + geolocation + peer review)
5. **Ghost Mode** (psychological tension without early demotivation)

DoIt's value proposition is not a feature list — it is a social contract. When you join a DoIt challenge with your friends, you are making a public commitment with a real consequence, in front of people whose opinion of you actually matters. That social pressure is more motivating than any algorithm or badge system.

### The Moat to Build

The most durable competitive advantage is **group memory and shared history**. After six months of using DoIt, a friend group has a record of who won which bet, who had the longest streak, who quit in week two. These are stories they reference in real life. Recreating that history on a competitor app requires starting over — not just migrating data, but rebuilding culture.

This is why speed to a loyal early community matters more than feature completeness. The goal in year one is not to build the best habit tracker. The goal is to become the app that a specific group of 100,000 friend pairs cannot imagine deleting because too much of their shared memory lives inside it.

### Acquisition Strategy

**Primary channel: viral invite (free)**
Every challenge invitation is a DoIt acquisition event. The invite deep link is the main growth mechanic. Optimize the install-to-join flow to be under 2 minutes.

**Secondary channel: creator content (low-cost)**
Fitness, study, and self-improvement creators on TikTok and Instagram naturally make "accountability challenge" content. A creator who runs a 30-day challenge with their audience using DoIt generates authentic marketing at the cost of a partnership or affiliate arrangement.

**Avoid in year one:**
- Paid social ads (too early to know LTV; CAC will be too high)
- SEO / content marketing (long lead time, wrong audience demographic)
- PR / press outreach (only effective if there is a story; wait for real traction metrics)

---

## Appendix: Open Questions Before Development Starts

The following decisions must be made before engineering begins. These are not blocking design questions — they are blocking architectural questions.

1. **Verification minimum bar for MVP:** What is the minimum proof standard that prevents casual cheating without adding friction that kills check-in rates? Decision needed: is photo optional or required for challenges above N members?

2. **Jurisdiction scope for launch:** US-only v1? If yes, which verification (phone number) and what data residency rules apply? If international, what changes in the auth and data layer?

3. **Push notification provider commitment:** Expo Push is easiest for React Native MVP but has limits on advanced scheduling and segmentation. Is this acceptable for Phases 0–2, or should we integrate Firebase Cloud Messaging directly from day one?

4. **Railway vs. self-managed AWS from day one:** Railway is faster but migrating later is real work. If there is a team member with AWS experience who can set it up in week one, start there. If not, Railway until 10,000 MAU.

5. **Solo Mode scope in MVP:** Should solo mode include public challenge discovery at launch, or just personal tracking with no social component? The latter is simpler but may not retain users who don't have friends to invite.

---

*This document is a living artifact. Update it as decisions are made, features are cut, and market feedback comes in. The best PRD is the one the team actually reads and argues with.*
