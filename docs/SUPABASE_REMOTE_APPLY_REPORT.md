# Supabase Remote Apply Report

> **HISTÓRICO — anterior a
> `20260713092422_beta_integrity_star_reactions_stats.sql`.** No asumir que el remoto actual
> contiene la migración beta; verificar antes de aplicar cambios.

Fecha: 2026-07-09  
Project ref: `bckrwqvvmjjorunbzxbo`  
Supabase URL: `https://bckrwqvvmjjorunbzxbo.supabase.co`

## Resumen

Estado: `DONE_WITH_EXTERNAL_BLOCKERS`.

Aplicado y verificado:

- Supabase CLI autenticada con `SUPABASE_ACCESS_TOKEN` efimero, sin guardarlo en archivos.
- Proyecto remoto enlazado con `npx supabase link --project-ref bckrwqvvmjjorunbzxbo`.
- Historial local de migraciones renombrado para coincidir con las versiones ya aplicadas en remoto.
- Migraciones remotas pendientes aplicadas con `npx supabase db push --linked`.
- RLS, bucket `moments`, RPCs y grants remotos verificados por SQL.
- Google OAuth aplicado desde JSON local sin imprimir ni guardar el secret.
- Site URL y cinco redirect URLs de Auth aplicadas y verificadas con `npm run supabase:auth:configure`.
- Edge Functions desplegadas: `send-round-notification`, `close-round`, `delete-account`.
- QA smoke remoto ejecutado con tres usuarios temporales; RLS, Storage, RPCs, ranking, reportes y bloqueos pasaron y las cuentas QA fueron eliminadas.

Bloqueos restantes:

- Apple Auth: falta Apple Developer Services ID/secret.
- Leaked password protection: el proyecto actual no tiene plan Pro, requisito de Supabase para habilitar HIBP.
- EAS/iOS: proyecto enlazado y Android preparado; iOS sigue requiriendo Apple Developer.

## Seguridad

No se ha escrito ningun secreto real en el repo.

El `SUPABASE_ACCESS_TOKEN` se uso solo como variable de entorno efimera en shells locales. El OAuth Google se leyo desde el JSON local, comprobando/aplicando solo por API y sin imprimir el `client_secret`.

Revision ejecutada:

```bash
rg -n "<patrones de OAuth secrets y tokens Supabase>" . --glob '!node_modules/**' --glob '!deno.lock'
git diff --check
```

Resultado esperado: sin secretos trackeados y sin whitespace errors.

Nota: como el token de gestion fue pegado en una conversacion, conviene rotarlo cuando termines esta tanda.

## Documentacion Supabase revisada

- Changelog: nuevas tablas en `public` pueden requerir `GRANT` explicitos para Data API; las migraciones incluyen grants explicitos.
- Google Auth: Supabase usa callback `https://<project-ref>.supabase.co/auth/v1/callback` y se configura por Management API con Client ID y Client Secret.
- Edge Functions secrets: hosted functions exponen `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`; el codigo mantiene fallback legacy.

## Metodo de acceso remoto

### MCP

No hay herramientas Supabase MCP expuestas en esta sesion despues de discovery con `tool_search`. Se uso Supabase CLI, como fallback definido.

### CLI

Comandos relevantes:

```bash
npx supabase --version
npx supabase projects list
npx supabase link --project-ref bckrwqvvmjjorunbzxbo
npx supabase migration list --linked
```

Resultado:

- CLI version: `2.109.1`.
- Proyecto remoto visible: `Rondapp`, region `eu-west-1`, status `ACTIVE_HEALTHY`, Postgres `17.6`.
- Link remoto: `DONE`.

## Migraciones

El remoto tenia las primeras migraciones aplicadas con timestamps Supabase distintos a los nombres locales iniciales. Para evitar `migration repair` remoto y conservar el SQL intacto, se renombraron archivos locales para coincidir con el historial remoto:

- `20260706174227_rondapp_mvp_init.sql`
- `20260706174400_security_performance_hardening.sql`
- `20260706174447_restrict_function_execute_grants.sql`
- `20260706175034_move_rls_helpers_to_private_schema.sql`
- `20260706175425_tighten_domain_grants.sql`
- `20260706175623_optimize_rls_auth_uid.sql`
- `20260706184037_create_group_rpc.sql`

Despues del renombre, `npx supabase db push --linked --dry-run` mostro solo estas migraciones pendientes:

- `20260709133155_create_round_with_moment_rpc.sql`
- `20260709133913_restrict_closed_round_interactions.sql`
- `20260709144527_fix_group_members_update_policy.sql`

Resultado final:

- `npx supabase db push --linked`: PASS.
- `npx supabase migration list --linked`: las 10 migraciones locales/remotas coinciden.

## Verificacion Remota

Tablas publicas verificadas con RLS activo:

- `profiles`
- `social_groups` (equivalente de dominio para grupos)
- `group_members`
- `rounds`
- `moments`
- `reactions`
- `photo_votes`
- `device_tokens`
- `reports`
- `blocks`

Storage:

- Bucket `moments`: existe.
- `public=false`.

RPCs verificadas:

- `create_group(text)`
- `join_group_by_invite(text)`
- `create_round_with_moment(uuid, uuid, uuid, text, text, text)`
- `get_weekly_leaderboard(uuid, date)`
- `close_round(uuid)`

Grants:

- RPCs principales tienen `EXECUTE` para `authenticated`.
- No aparecen grants para `anon` en esas RPCs.

Policies clave verificadas por metadata:

- `moments_insert_members_active_round`
- `reactions_insert_members_active_round`
- `photo_votes_insert_members`
- `reactions_delete_own`
- `photo_votes_delete_own`
- `group_members_update_self_muted_or_admin`

Advisors remotos:

```bash
npx supabase db advisors --linked --type all --level warn --fail-on error
```

Resultado: PASS sin errores. Warnings no bloqueantes:

- RPCs `SECURITY DEFINER` ejecutables por `authenticated`; intencional para RPCs de cliente, con validaciones internas y sin grant `anon`.
- Leaked password protection desactivado; `npm run supabase:auth:configure` confirmo que Supabase lo limita a planes Pro o superiores.

## Edge Functions

Archivos actualizados:

- `supabase/functions/_shared/supabase-env.ts`
- `supabase/functions/send-round-notification/index.ts`
- `supabase/functions/close-round/index.ts`
- `supabase/functions/delete-account/index.ts`

Cambios:

- `send-round-notification` y `delete-account` usan `SUPABASE_SECRET_KEYS.default` cuando existe y fallback a `SUPABASE_SERVICE_ROLE_KEY`.
- `close-round` usa `SUPABASE_PUBLISHABLE_KEYS.default` cuando existe y fallback a `SUPABASE_PUBLISHABLE_KEY` o `SUPABASE_ANON_KEY`.
- No se imprimen secretos.
- Los errores de env faltante devuelven mensaje claro sin valores.

Verificacion:

```bash
npx --yes deno check supabase/functions/send-round-notification/index.ts supabase/functions/close-round/index.ts supabase/functions/delete-account/index.ts
```

Resultado: PASS.

Deploy remoto:

- `send-round-notification`: ACTIVE, version 2.
- `close-round`: ACTIVE, version 2.
- `delete-account`: ACTIVE, version 1.

Secrets remotos:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- fallbacks legacy presentes por plataforma

No se copiaron valores de secrets.

## Auth

Google OAuth:

- Aplicado con `npm run supabase:auth:google`.
- Verificado por `/auth/v1/settings`: `external.google=true`.

Email/password:

- Activo: `external.email=true`.
- Signup permitido: `disable_signup=false`.
- Confirmacion de email requerida: `mailer_autoconfirm=false`.

Apple:

- `external.apple=false`.
- Sigue `BLOCKED_EXTERNAL` por falta de credenciales Apple OAuth.

Callback Google esperado en Google Cloud:

```txt
https://bckrwqvvmjjorunbzxbo.supabase.co/auth/v1/callback
```

Redirect URLs esperadas en Supabase:

```txt
rondapp://auth/callback
rondapp://**
exp://**
http://localhost:8081/auth/callback
http://127.0.0.1:8081/auth/callback
```

Estado remoto: `site_url=http://localhost:8081` y las cinco URLs anteriores estan aplicadas. El endpoint de autorizacion Google devuelve `302` hacia `accounts.google.com`.

## Smoke QA remoto

Archivo:

- `scripts/qa-supabase-remote-smoke.mjs`
- `scripts/qa-supabase-remote-managed.mjs`

Script npm:

```bash
npm run qa:supabase:remote:managed
```

Estado:

- PASS remoto con owner, member y outsider temporales.
- El runner obtiene una secret API key solo en memoria mediante Management API para crear y borrar usuarios confirmados; las operaciones de producto se ejecutan con sesiones y publishable key.
- Valida grupo privado, invite, Storage, ronda, reaccion, Estrella de la ronda, ranking, reporte y bloqueo.
- Limpia cuentas y datos QA y verifica que `mailer_autoconfirm=false` no cambia.

## Estado Final

- Supabase remote link: `DONE`.
- Migraciones remotas: `DONE`.
- RLS remoto: `DONE`.
- Storage remoto: `DONE`.
- RPCs remotas: `DONE`.
- Edge Functions modernas: `DONE`.
- Edge Functions deploy: `DONE`.
- Google Auth: `DONE`.
- Email/password Auth: `DONE`, incluido smoke remoto con sesiones reales.
- Apple Auth: `BLOCKED_EXTERNAL`.
- QA smoke remoto: `DONE` y limpieza verificada.
- Leaked password protection: `BLOCKED_PLAN`, requiere Supabase Pro.
- EAS: `DONE_CONFIG`; Android preview en proceso de build, iOS bloqueado por Apple Developer.
