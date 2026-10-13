# Rondapp

Rondapp is a private social mobile app for 18+ groups. Users create private groups, launch a temporary round, upload spontaneous photo moments, react, assign their single **Estrella de la ronda**, close the round, and see a weekly group ranking.

The app does not reward alcohol consumption. Drink type is optional visual metadata and is not used in scoring.

## Stack

- Expo + React Native + TypeScript
- Expo Router
- Supabase Auth, Postgres, Storage, RLS, Edge Functions
- TanStack Query
- expo-camera, expo-image-picker, expo-image-manipulator
- expo-notifications
- EAS Build + EAS Update

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run start
```

Fill `.env.local` before using the backend:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

If Supabase env vars are missing, the app opens a dev-friendly configuration screen instead of crashing.

## Supabase

Apply the MVP schema and policies:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Run local Supabase QA before release changes:

```bash
npx supabase start
npm run qa:supabase:local
npx supabase stop
```

Deploy Edge Functions:

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-publishable-or-anon-key
supabase functions deploy send-round-notification
supabase functions deploy close-round
supabase functions deploy delete-account
supabase functions deploy delete-moment
supabase functions deploy delete-group
supabase functions deploy cleanup-storage-deletions
supabase functions deploy web-push-config
supabase functions deploy send-test-notification
```

Never put the service role key in `.env` or the mobile app.

## Scripts

```bash
npm run start
npm run typecheck
npm run lint
npx expo-doctor
npm run qa:release:local
npm run build
npm run qa:pwa
npm run qa:supabase:local
npm run build:android:preview
npm run build:ios:preview
npm run update:preview -- --message "Describe el cambio"
```

## MVP Checklist

- Auth + 18+ age gate + profile
- Private groups + invite codes + mute group
- Launch round with camera/gallery, compressed upload, first moment
- Existing round moment upload
- At most one active reaction per user/photo; tapping another emoji replaces it
- One Estrella de la ronda per user/round, movable and removable while the round is open
- No self-vote and no interactions after close enforced in SQL
- Five visible tabs: Home, Groups, Camera, Ranking, and Profile
- Visible weekly leaderboard by group, Monday week start, score breakdown, no drink scoring
- Group-scoped views use an explicit selector and remember the last valid group
- Private `Tus momentos por bebida` statistics use the authenticated user's identity; drink metadata never scores
- Report moment, block user, delete own moment
- Support/contact route and account deletion flow
- Push token registration and non-blocking round notification function
- EAS preview build config

The beta contract and outstanding verification are tracked in
[docs/BETA_READINESS.md](docs/BETA_READINESS.md). Detailed setup and QA instructions are in
[docs/SETUP.md](docs/SETUP.md), [docs/BUILD_AND_TESTING.md](docs/BUILD_AND_TESTING.md), and
[docs/PWA_BETA_GUIDE.md](docs/PWA_BETA_GUIDE.md).
