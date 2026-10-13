# Rondapp Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Configure app environment

```bash
cp .env.example .env.local
```

Required client variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

Only use Supabase publishable/anon keys in the app. Do not expose service role keys.

## 3. Create Supabase project

In Supabase:

1. Create a project.
2. Enable Email/Password Auth.
3. For easiest internal testing, disable mandatory email confirmation or document that testers must confirm email before login.
4. Copy the project URL and publishable/anon key into `.env.local`.

## 4. Apply database schema

Install and login to Supabase CLI, then:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

The initial migration creates:

- `profiles`
- `social_groups`
- `group_members`
- `rounds`
- `moments`
- `reactions`
- `photo_votes`
- `device_tokens`
- `reports`
- `blocks`
- tablas operativas exclusivas de `service_role`: `round_notification_dispatches`,
  `moment_storage_deletions` y `storage_cleanup_queue`
- private Storage bucket `moments`
- RLS policies
- RPCs: `create_group`, `join_group_by_invite`, `create_round_with_moment`, `create_moment`,
  `toggle_reaction`, `toggle_round_star`, `close_round`, `get_weekly_leaderboard`,
  `get_my_profile_stats`, `register_device_token`, `unregister_device_token`,
  `register_web_push_subscription`, `unregister_web_push_subscription` and `delete_owned_group`

The current integrity layer is
`20260720151425_add_web_push_subscriptions.sql`. Validate the complete migration
chain locally with `npx supabase db reset --local` before any remote push.

## 5. Deploy Edge Functions

Supabase inyecta automáticamente `SUPABASE_URL`, `SUPABASE_SECRET_KEYS`,
`SUPABASE_PUBLISHABLE_KEYS` y los fallbacks legacy en Edge Functions. No copies una secret a
variables `EXPO_PUBLIC_*` ni la añadas al repositorio. Configura secretos propios adicionales
solo si una integración externa los necesita:

```bash
npx web-push generate-vapid-keys --json
supabase secrets set \
  WEB_PUSH_VAPID_SUBJECT=https://your-production-domain.example \
  WEB_PUSH_VAPID_PUBLIC_KEY=your-public-key \
  WEB_PUSH_VAPID_PRIVATE_KEY=your-server-only-private-key
```

Deploy:

```bash
supabase functions deploy send-round-notification
supabase functions deploy close-round
supabase functions deploy delete-account
supabase functions deploy delete-moment
supabase functions deploy delete-group
supabase functions deploy cleanup-storage-deletions
supabase functions deploy web-push-config
supabase functions deploy send-test-notification
```

`send-round-notification` sends one idempotent push notification to eligible group members
when a round is created. It excludes the creator, muted members and blocked relationships. If
it fails, round creation still succeeds. It sends both native Expo Push and PWA Web Push.
`send-test-notification` only targets the authenticated user's own registered devices.
`close-round` validates the caller and delegates the
deterministic close to the protected RPC.

`delete-account`, `delete-moment` and `delete-group` run server-side, preserve durable cleanup state and must
never be replaced by client-side service-role access. `cleanup-storage-deletions` retries
queued Storage removals, rejects user JWTs and must be invoked by an authorized server-side
scheduler or manually with una secret de servidor en `apikey`. Solo esta función tiene
`verify_jwt = false`; valida la secret de forma fail-closed dentro del handler y conserva un
Bearer `SUPABASE_SERVICE_ROLE_KEY` como compatibilidad legacy temporal.

The three operational tables have RLS enabled, revoke every privilege from `public`, `anon`
and `authenticated`, and grant access only to `service_role`; no client should query them.

## 6. Run locally

```bash
npm run start
```

Try Expo Go first for general UI/auth/group flow. Native push behavior should be verified in a
native build. Web Push is verified from Ajustes in the PWA installed on an iPhone with iOS 16.4+.

## 7. Manual QA path

1. User A registers, confirms 18+, completes profile.
2. User A creates group.
3. User B registers, confirms 18+, joins by invite code.
4. User A launches round with a photo.
5. User B opens round, uploads a moment, changes/removes a reaction, and assigns/moves/removes
   their Estrella de la ronda.
6. Expire/close round and verify winner.
7. Check the visible weekly Ranking tab, explicit group selector and complete breakdown.
8. Report a moment, block a user, delete own moment.
9. Verify private `Tus momentos por bebida` stats for A and B do not cross accounts or score.
10. Log A out, log B in on the same device, and verify cache, signed images and push token do
    not leak across sessions.
11. Open support/settings and verify account deletion before production deployment.

## Notes

- Week starts Monday.
- Drink type is optional and never affects score.
- Groups are private through RLS.
- Storage bucket is private; signed URLs require current moment visibility, not only membership.
- Location is not requested or stored in the MVP.
