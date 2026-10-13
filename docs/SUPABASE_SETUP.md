# Supabase Setup

Proyecto remoto usado en esta auditoria: `bckrwqvvmjjorunbzxbo`.

## Variables de entorno

En `.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bckrwqvvmjjorunbzxbo.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

No incluir `service_role` en la app movil.

## Migraciones

Migraciones relevantes:

- `20260706174227_rondapp_mvp_init.sql`: tablas, RLS, Storage, RPC iniciales.
- `20260706174400_security_performance_hardening.sql`: indices y restricciones de ejecucion.
- `20260706174447_restrict_function_execute_grants.sql`: grants de funciones.
- `20260706175034_move_rls_helpers_to_private_schema.sql`: helpers RLS privados.
- `20260706175425_tighten_domain_grants.sql`: grants de Data API.
- `20260706175623_optimize_rls_auth_uid.sql`: optimizacion RLS.
- `20260706184037_create_group_rpc.sql`: RPC transaccional para crear grupos.
- `20260709133155_create_round_with_moment_rpc.sql`: RPC transaccional para ronda + primer momento.
- `20260709133913_restrict_closed_round_interactions.sql`: bloquea deletes de interacciones si la ronda esta cerrada.
- `20260709144527_fix_group_members_update_policy.sql`: corrige update de `group_members` sin recursion RLS.
- `20260713092422_beta_integrity_star_reactions_stats.sql`: integridad beta, RPCs atómicas de
  reacción/Estrella, idempotencia de publicación y push, privacidad de Storage/reportes,
  ranking robusto, estadísticas privadas de perfil y colas/recibos durables de operaciones
  server-side.
- `20260713212950_enforce_single_active_round_and_group_deletion.sql`: una única ronda activa
  por grupo y borrado de grupos exclusivo del propietario con cleanup durable de Storage.

Para trabajar desde CLI:

```bash
supabase link --project-ref bckrwqvvmjjorunbzxbo
supabase migration list --linked
supabase db push --linked
```

Antes de aplicar remotamente, ejecutar un reset local desde cero y los gates de
`BETA_READINESS.md`. No inferir que el remoto está actualizado solo por este documento.

La migración beta añade tres tablas operativas en el esquema `public` que no forman parte de
la Data API para usuarios:

- `round_notification_dispatches`: reclamación idempotente de una notificación por ronda.
- `moment_storage_deletions`: recibo de borrado de momento y de su objeto de Storage.
- `storage_cleanup_queue`: cola durable para reintentar borrados de Storage fallidos.

Las tres tienen RLS habilitado, revocan todos los privilegios a `public`, `anon` y
`authenticated`, y conceden acceso solo a `service_role`. No necesitan policies de usuario.

## Edge Functions

Funciones esperadas:

- `send-round-notification`: envío idempotente de push a miembros elegibles.
- `close-round`: cierre autenticado de ronda mediante la RPC protegida.
- `delete-account`: borrado de cuenta preservando datos de otros miembros y encolando
  limpieza de objetos.
- `delete-moment`: borrado idempotente de un momento propio con recibo durable y cleanup de
  Storage.
- `delete-group`: borrado exclusivo del propietario, con cascada transaccional y cleanup
  durable de las fotos privadas del grupo.
- `cleanup-storage-deletions`: worker de reintento para la cola de Storage; exige
  `service_role` y se invoca desde una tarea server-side autorizada o manualmente.

Solo `cleanup-storage-deletions` declara `verify_jwt = false` en `supabase/config.toml`,
porque las nuevas `sb_secret_*` son opacas y no son JWT. No queda público: valida una secret
de `SUPABASE_SECRET_KEYS` en el header `apikey` dentro del handler, con comparación en tiempo
constante. Mientras exista la clave legacy también admite el Bearer exacto de
`SUPABASE_SERVICE_ROLE_KEY`. Nunca acepta una publishable key ni un JWT de usuario.

Secrets disponibles en hosted Edge Functions:

```bash
SUPABASE_URL
SUPABASE_SECRET_KEYS
SUPABASE_PUBLISHABLE_KEYS
```

Estas variables se inyectan automáticamente en local y hosted. El código mantiene fallback
a `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY` para proyectos legacy. Para producción se
recomienda una secret nombrada y dedicada al worker, seguida de la retirada planificada del
fallback legacy.

## Storage

- Bucket `moments` privado.
- Las imagenes se guardan por path no adivinable con `groupId/roundId/userId/momentId`.
- La app usa signed URLs temporales para renderizar fotos.

## Verificación remota histórica

Los puntos siguientes describen una auditoría anterior a la migración beta de 2026-07-13.
No son evidencia de que el remoto actual incluya esa migración; hay que volver a verificarlos.

- `public.create_group(text)` existe como `SECURITY DEFINER`.
- `anon/public` no tienen `EXECUTE`.
- `authenticated` no tiene `INSERT` directo en `social_groups` ni `group_members`.
- Migraciones remotas aplicadas y alineadas con `migration list --linked`.
- RLS remoto activo en las 10 tablas publicas del MVP.
- Bucket remoto `moments` existe con `public=false`.
- RPCs remotas principales presentes y sin grant `anon`.
- Google OAuth remoto activo (`external.google=true`).
- Edge Functions remotas desplegadas y ACTIVE.
- QA remoto automatico pendiente porque Auth requiere confirmacion de email (`mailer_autoconfirm=false`).
