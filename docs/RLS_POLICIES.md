# RLS Policies

## Modelo de acceso

- No hay feed publico.
- Todo contenido de rondas/momentos pertenece a un grupo privado.
- Solo miembros del grupo pueden ver grupos, rondas, momentos, reacciones y ranking.
- Usuarios sin `is_age_confirmed = true` no deben crear/unirse a grupos ni lanzar rondas.

## Tablas publicas

RLS debe estar habilitado en:

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
- `round_notification_dispatches`
- `moment_storage_deletions`
- `storage_cleanup_queue`

Las diez primeras son tablas de dominio accesibles solo según sus grants y policies. Las tres
últimas son tablas operativas server-side: tienen RLS habilitado, no exponen policies a
usuarios y revocan todos los privilegios a `public`, `anon` y `authenticated`.

## Funciones RPC intencionadas

Estas funciones son publicas para `authenticated` por diseño y validan dentro de la funcion:

- `public.create_group(p_name text)`
  - Requiere `auth.uid()`.
  - Requiere perfil con edad confirmada.
  - Valida nombre 2-40.
  - Crea grupo + owner membership en la misma transaccion.
- `public.join_group_by_invite(p_invite_code text)`
  - Requiere edad confirmada.
  - Inserta membership con role `member`.
- `public.close_round(p_round_id uuid)`
  - Valida pertenencia al grupo.
- `public.create_round_with_moment(...)` y `public.create_moment(...)`
  - Reutilizan IDs del borrador y hacen retry idempotente.
- `public.toggle_reaction(p_moment_id uuid, p_type text)`
  - Deriva `auth.uid()` y añade, cambia o retira una única reacción.
- `public.toggle_round_star(p_moment_id uuid)`
  - Deriva `auth.uid()` y asigna, mueve o retira una Estrella.
- `public.get_weekly_leaderboard(p_group_id uuid, p_week_start date)`
  - Valida pertenencia al grupo.
  - No usa tipo de bebida en scoring.
- `public.get_my_profile_stats()`
  - No recibe usuario; devuelve solo metadata de momentos de `auth.uid()`.
- `public.register_device_token(...)` / `public.unregister_device_token(text)`
  - Evitan DML directo y desvinculan el dispositivo al cerrar sesión.

Supabase Security Advisor marca estas RPC como WARN por ser `SECURITY DEFINER` ejecutables por `authenticated`. Es un aviso esperado mientras sean la API controlada para operaciones transaccionales. No conceder `EXECUTE` a `anon`.

## Grants de Data API

- `anon`: sin acceso a tablas de dominio.
- `authenticated`: acceso mínimo por tabla; no tiene DML directo para rondas, reacciones,
  votos ni tokens, ni inserts directos para momentos o reportes.
- `service_role`: reservado para Edge Functions y tareas server-side. Es el único rol con
  `SELECT/INSERT/UPDATE/DELETE` en `round_notification_dispatches`,
  `moment_storage_deletions` y `storage_cleanup_queue`.

Las tablas operativas no se consultan desde el cliente. `send-round-notification` reclama su
  dispatch server-side; `delete-moment`, `delete-group` y `delete-account` escriben recibos/cola; y
`cleanup-storage-deletions` procesa la cola solo con autorización `service_role`.
Su `verify_jwt = false` es intencionado para admitir claves opacas `sb_secret_*`: el handler
compara en tiempo constante `apikey` contra `SUPABASE_SECRET_KEYS` y solo mantiene Bearer
exacto de `SUPABASE_SERVICE_ROLE_KEY` como fallback legacy. Claves públicas y JWT de usuario
se rechazan antes de consultar estas tablas.

## Storage RLS

- Bucket `moments` privado.
- Select aplica membresía, ocultación, reportes y bloqueos mediante la visibilidad del momento;
  insert/delete exige la carpeta exacta del usuario.
- No almacenar signed URLs permanentes en la DB.

## Advisors históricos

El resultado siguiente es anterior a la migración beta de 2026-07-13. Reejecutar advisors y
no tratarlo como estado actual:

- Security WARN:
  - RPCs `SECURITY DEFINER` intencionadas.
  - Leaked password protection desactivado: activar en Dashboard antes de beta publica.
- Performance INFO:
  - Indices sin uso aun por baja actividad de datos. No eliminarlos durante MVP; se esperan consultas futuras.
