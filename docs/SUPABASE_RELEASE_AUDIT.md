# Supabase Release Audit

> **HISTÓRICO — anterior a
> `20260713092422_beta_integrity_star_reactions_stats.sql`.** No prueba el estado local o remoto
> posterior a esa migración.

Fecha: 2026-07-09  
Estado: DONE remoto para migraciones/RLS/Storage/RPC/Edge Functions/Google Auth/QA multiusuario; quedan bloqueos externos de Apple Auth, HIBP por plan y EAS.

## Alcance revisado

- Variables de entorno Supabase.
- Cliente Supabase movil.
- Auth y deep links.
- Tablas publicas.
- RLS.
- RPCs.
- Storage bucket `moments`.
- Edge Functions.
- Device tokens.
- Reports/blocks.
- Ranking.
- Migraciones locales.

## Evidencia disponible

### Verificado localmente

- `src/lib/supabase.ts` crea cliente con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- No hay `service_role` en variables `EXPO_PUBLIC_`.
- `.env.example` solo incluye variables publicas.
- `supabase/.env.example` separa secrets de Supabase Management/Auth providers.
- Migraciones locales definen tablas, RLS, RPCs, bucket y storage policies.
- `npx --yes supabase migration list --local`: PASS; incluye las migraciones nuevas `20260709133155`, `20260709133913` y `20260709144527`.
- `npx --yes supabase db lint --local --fail-on error`: PASS, sin errores de esquema.
- `npx --yes supabase db advisors --local --type all --level warn --fail-on error`: PASS, sin issues.
- `npx --yes supabase db reset --local`: PASS; todas las migraciones aplican desde cero en base limpia.
- `npm run qa:supabase:local`: PASS; crea usuarios locales reales y valida RLS/RPC/Storage multiusuario.
- Consultas locales confirman RLS activo en `profiles`, `social_groups`, `group_members`, `rounds`, `moments`, `reactions`, `photo_votes`, `device_tokens`, `reports` y `blocks`.
- Consultas locales confirman bucket `moments` privado y policies de Storage para `SELECT`, `INSERT` y `DELETE`.
- Consultas locales confirman que funciones sensibles revisadas no tienen grants para `anon` ni `PUBLIC`.
- Edge Functions no contienen secrets hardcodeados; leen `SUPABASE_URL` y soportan `SUPABASE_SECRET_KEYS`/`SUPABASE_PUBLISHABLE_KEYS` con fallback a `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` o `SUPABASE_ANON_KEY`.
- `delete-account` mantiene el service role en Edge Function y llama APIs admin solo desde servidor.
- `https://supabase.com/changelog.md` revisado el 2026-07-09; el punto relevante es que nuevas tablas pueden no exponerse automaticamente a Data API, por lo que se mantiene como verificacion remota pendiente.
- `npx supabase link --project-ref bckrwqvvmjjorunbzxbo`: PASS.
- `npx supabase db push --linked`: PASS; aplica `20260709133155`, `20260709133913` y `20260709144527`.
- `npx supabase migration list --linked`: PASS; 10 migraciones locales/remotas alineadas.
- Consultas remotas confirman RLS activo en las 10 tablas publicas del MVP y bucket `moments` privado.
- Consultas remotas confirman RPCs principales presentes y sin grant `anon`.
- `npx supabase db advisors --linked --type all --level warn --fail-on error`: PASS sin errores; warnings documentados para RPCs `SECURITY DEFINER` intencionales y leaked password protection desactivado.
- `npm run supabase:auth:google`: PASS; `/auth/v1/settings` confirma `external.google=true`.
- `npm run supabase:auth:configure`: PASS para Site URL y cinco redirects; HIBP rechazado porque requiere plan Pro.
- `npm run qa:supabase:remote:managed`: PASS con tres usuarios, limpieza completa y Auth sin cambios.
- `npx supabase functions deploy` para las tres Edge Functions: PASS; funciones remotas ACTIVE.

### Bloqueado externamente

- Herramientas MCP Supabase no estan expuestas en esta sesion tras discovery.
- EAS ya esta autenticado y enlazado a `@rdrosado/rondapp`; iOS sigue requiriendo Apple Developer.
- Apple social auth requiere credenciales Apple externas.
- Leaked password protection no puede activarse en el plan actual; Supabase lo limita a Pro o superior.

## Variables y secretos

| Variable | Uso | Estado |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Cliente movil | Configurada localmente |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente movil | Configurada localmente |
| `SUPABASE_ACCESS_TOKEN` | Aplicar config/migraciones/deploy por CLI/API | Usado efimeramente; no guardado |
| `SUPABASE_SECRET_KEYS` | Hosted Edge Functions admin modernas | Soportada y verificada como secret remoto existente |
| `SUPABASE_PUBLISHABLE_KEYS` | Hosted Edge Functions RLS modernas | Soportada y verificada como secret remoto existente |
| `SUPABASE_SERVICE_ROLE_KEY` | Fallback legacy Edge Functions admin | Fallback soportado |
| `SUPABASE_ANON_KEY` | Fallback legacy Edge Function `close-round` | Fallback soportado |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | Google Auth provider | Aplicado en remoto |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | Google Auth provider | Aplicado en remoto sin guardarlo ni imprimirlo |
| `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID` | Apple provider | BLOCKED_EXTERNAL |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | Apple provider | BLOCKED_EXTERNAL |

## Modelo de datos local

Tablas detectadas en `supabase/migrations/20260706174227_rondapp_mvp_init.sql` y verificadas en remoto:

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

Enums:

- `group_role`: owner, admin, member.
- `round_status`: active, closed.
- `report_status`: pending, reviewed, dismissed, actioned.

## RLS y privacidad por grupo

### Reglas cubiertas localmente

- `profiles`: seleccion visible para self o miembros de grupos compartidos.
- `social_groups`: seleccion solo si usuario es miembro.
- `group_members`: seleccion si usuario es miembro del grupo o su propio row.
- `rounds`: seleccion/insert solo para miembros.
- `moments`: seleccion solo miembros, no hidden, sin bloqueos entre autor y viewer.
- `reactions`: seleccion/insert solo miembros; trigger impide reaccionar a foto propia, ronda cerrada o usuario bloqueado.
- `photo_votes`: seleccion/insert/update solo miembros; trigger impide votar foto propia, ronda cerrada o usuario bloqueado.
- `device_tokens`: CRUD solo propio.
- `reports`: insert propio si miembro; select propio o admin/owner del grupo.
- `blocks`: select propio o donde es bloqueado; insert/delete propio.

### Riesgos pendientes de verificacion remota

- Confirmar que las politicas aplicadas en Supabase remoto coinciden exactamente con las migraciones locales.
- Confirmar que los grants remotos no exponen tablas nuevas fuera de RLS.
- Confirmar Data API exposed schemas/settings en Supabase Dashboard.
- Ejecutar advisors cuando el MCP/CLI vuelva a estar autenticado.

### Verificacion local ejecutada

```bash
npx --yes supabase migration list --local
npx --yes supabase db reset --local
npx --yes supabase db lint --local --fail-on error
npx --yes supabase db advisors --local --type all --level warn --fail-on error
```

Resultado: PASS. Ademas, consultas a catalogos Postgres confirmaron RLS activo en todas las tablas publicas del MVP, bucket `moments` privado, policies de Storage presentes y sin grants `anon`/`PUBLIC` en las funciones sensibles revisadas.

### QA multiusuario local

Comando:

```bash
npm run qa:supabase:local
```

Resultado: PASS despues de corregir `group_members_update_self_muted_or_admin`, incluido tras `db reset --local` desde base limpia.

Cobertura:

- Auth local con usuarios owner/member/outsider y usuario sin age gate.
- Age gate bloquea `create_group`.
- Owner crea grupo privado y outsider no puede leerlo.
- Member entra por invite code y silencia grupo.
- Storage permite firmar imagen a miembros y bloquea outsider.
- `create_round_with_moment` crea ronda + momento inicial.
- Member sube foto-respuesta.
- Owner no puede dar la Estrella a su propia foto.
- Member reacciona y da Estrella de la ronda.
- Outsider no puede reaccionar.
- Ranking semanal devuelve actividad social y no expone `drink_type`.
- Reporte privado.
- Cierre de ronda expirada elige ganador por Estrella de la ronda.
- Ronda cerrada no acepta nuevas reacciones ni borrado de reaccion propia.
- Bloqueo oculta contenido entre usuarios.
- Borrado de momento propio limpia Storage.

## RPCs

| RPC | Estado | Observaciones |
| --- | --- | --- |
| `create_group(text)` | OK local | Transaccional: crea grupo, invite code unico, owner membership. Valida edad y nombre 2-40. |
| `join_group_by_invite(text)` | OK local | Valida auth, edad, invite activo. Inserta membership idempotente. |
| `close_round(uuid)` | OK local | Cierra solo si miembro y ronda expirada; elige ganador por Estrellas/reacciones/tiempo. |
| `get_weekly_leaderboard(uuid,date)` | OK local | Formula documentable: rondas, momentos, participantes, reacciones, Estrellas, ganadoras, participacion. No usa bebida. |
| `create_round_with_moment(...)` | OK local | Añadida para evitar rondas huerfanas si falla el primer momento. Valida auth, edad, membresia e image path. |

Verificacion anti-gamificacion de consumo:

- `drink_type` aparece solo en tabla/momentos y en la RPC de creacion como metadata.
- `get_weekly_leaderboard` no referencia `drink_type`.

## Fix aplicado durante auditoria

### Problema

`src/features/rounds/api.ts` creaba una ronda y luego el primer momento con dos inserts cliente separados. Si el primer insert pasaba y el segundo fallaba, podia quedar una ronda activa sin momento inicial.

### Accion

- Creada migracion `supabase/migrations/20260709133155_create_round_with_moment_rpc.sql`.
- Añadida RPC `public.create_round_with_moment(...)`.
- Actualizado `createRoundWithMoment` para llamar la RPC despues de subir la imagen.
- Se conserva cleanup de Storage si la RPC falla.

### Prueba

```bash
npm run typecheck
npm run lint
```

Resultado: PASS.

### Interacciones en ronda cerrada

Problema:

Las politicas originales permitian borrar reacciones/Estrellas propias aunque una ronda ya
estuviera cerrada. Aunque la UI no muestra esa accion como flujo principal, backend debe
preservar la regla de producto: no interactuar si la ronda esta cerrada.

Accion:

- Creada migracion `supabase/migrations/20260709133913_restrict_closed_round_interactions.sql`.
- `reactions_delete_own` ahora exige ronda activa y `closes_at > now()`.
- `photo_votes_delete_own` ahora exige ronda activa y `closes_at > now()`.
- Cliente anade `assertRoundOpen` antes de reaccionar o dar su Estrella de la ronda.

Prueba:

```bash
npm run typecheck
npm run lint
```

Resultado: PASS local y remoto; migracion aplicada con `npx supabase db push --linked`.

### Recursion RLS al silenciar grupo

Problema:

`npm run qa:supabase:local` fallo en `group_members.muted` con `infinite recursion detected in policy for relation "group_members"`. La policy `group_members_update_self_muted_or_admin` consultaba `group_members` directamente dentro de una policy de la misma tabla.

Accion:

- Creada migracion `supabase/migrations/20260709144527_fix_group_members_update_policy.sql`.
- Añadida funcion `private.is_group_admin(uuid, uuid)` como helper `security definer`.
- Recreada policy `group_members_update_self_muted_or_admin` usando el helper privado para evitar recursion.
- Añadido trigger `validate_group_member_update` para impedir que un miembro normal cambie `role`, `group_id`, `user_id` o `joined_at`; el self-service queda limitado a `muted`.

Prueba:

```bash
npm run qa:supabase:local
npx --yes supabase db reset --local
npx --yes supabase db lint --local --fail-on error
npx --yes supabase db advisors --local --type all --level warn --fail-on error
```

Resultado: PASS.

## Storage

Bucket local:

- `moments`, privado (`public = false`).

Policies:

- Select: miembro del grupo indicado por el primer segmento del path.
- Insert: miembro del grupo y tercer segmento del path igual a `auth.uid()`.
- Delete: miembro del grupo y tercer segmento del path igual a `auth.uid()`.

Path usado por app:

```text
{groupId}/{roundId}/{userId}/{momentId}.jpg
```

Estado: PASS local. Pendiente confirmar bucket/policies en Supabase remoto y QA real de URLs firmadas.

## Edge Functions

### `send-round-notification`

Estado local: OK con bloqueo externo de deploy/secrets.

Comportamiento:

- Requiere JWT de usuario.
- Usa service role solo dentro de Edge Function.
- Verifica que caller pertenece al grupo.
- Excluye creador.
- Respeta `group_members.muted = false`.
- Envia Expo push tickets.
- El cliente captura fallo y no rompe creacion de ronda.

### `close-round`

Estado local: OK con bloqueo externo de deploy/secrets.

Comportamiento:

- Usa anon key + Authorization del usuario.
- Llama RPC `close_round`.
- Devuelve errores 400 si RPC rechaza.

### `delete-account`

Estado local: OK con bloqueo externo de deploy/secrets.

Comportamiento:

- Requiere `POST` y JWT de usuario.
- Usa service role solo dentro de Edge Function.
- Verifica el JWT con `admin.auth.getUser`.
- Transfiere grupos propios al miembro mas antiguo si existe.
- Recoge paths de Storage afectados y elimina objetos del bucket `moments`.
- Borra tokens, interacciones propias, reportes propios, bloqueos y memberships.
- Anonimiza reportes donde el usuario era reportado.
- Llama `admin.auth.admin.deleteUser(userId)` desde servidor.

Prueba:

```bash
npx --yes deno check supabase/functions/delete-account/index.ts
```

Resultado: PASS despues de corregir la firma tipada del helper de Storage.

## Auth

Estado:

- Email/password implementado en cliente.
- Social auth Google/Apple implementado en cliente.
- Google esta activo y su authorize redirige a `accounts.google.com`; Apple sigue inactivo por falta de credenciales externas.
- `supabase/config.toml` incluye redirect URLs y provider env vars.

Redirects esperados:

- `rondapp://auth/callback`
- `rondapp://**`
- `exp://**`
- `http://localhost:8081/auth/callback`
- `http://127.0.0.1:8081/auth/callback`

## Invariantes de release

| Invariante | Estado | Evidencia |
| --- | --- | --- |
| Usuario solo ve grupos donde es miembro | DONE_REMOTE_METADATA | RLS remoto activo en `social_groups` y policies presentes |
| Usuario solo ve rondas/momentos de sus grupos | DONE_REMOTE_METADATA | RLS remoto activo en `rounds`/`moments` y policies presentes |
| Usuario solo crea ronda en grupo donde es miembro | DONE_REMOTE_METADATA | RLS + RPC remota `create_round_with_moment` |
| Usuario no vota su propia foto | DONE_REMOTE_METADATA | Trigger/function remota y guard cliente |
| Usuario solo tiene una Estrella de la ronda por ronda | DONE_REMOTE_METADATA | Unique `(round_id, voter_id, vote_type)` |
| Usuario no cambia interacciones si la ronda esta cerrada | DONE_REMOTE_METADATA | Policies y triggers remotos aplicados |
| Reportes/bloqueos son privados | DONE_REMOTE_METADATA | `npm run qa:supabase:local`; RLS remoto verificado por metadata |
| Storage no expone fotos fuera de grupos | DONE_REMOTE_METADATA | Bucket remoto `moments` privado; QA local valida member/outsider |
| `create_group` es transaccional | DONE_REMOTE | RPC remota presente y con grant solo a `authenticated` |
| `create_round_with_moment` es transaccional | DONE_REMOTE | RPC remota presente y con grant solo a `authenticated` |
| Edge function de push no bloquea creacion | DONE_REMOTE_DEPLOYED | Cliente captura warning; function desplegada ACTIVE |

## Acciones pendientes

1. Subir a Supabase Pro y activar leaked password protection si se mantiene Auth por password.
2. Configurar Apple OAuth si se requiere provider Apple por OAuth web/Mac.
3. Generar build EAS y probar funciones en dispositivo real.
