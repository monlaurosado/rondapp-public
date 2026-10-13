# Final QA Report

> **HISTÓRICO — no es el QA final del beta 2026-07-13.** Se conserva como registro del corte
> anterior; todas las comprobaciones afectadas deben reejecutarse.

Fecha: 2026-07-06

## Resultado

Rondapp queda como MVP navegable con Auth, grupos privados, rondas, momentos, reacciones, Estrella de la ronda, ranking semanal, notificaciones preparadas, moderacion basica, estados de carga/vacio/error y UI principal rediseñada.

## Cambios clave

- Auth email:
  - `emailRedirectTo` configurado.
  - `/auth/callback` implementado.
  - Pantalla `/check-email` con reenvio.
- Grupos:
  - `create_group` RPC transaccional remota y local.
  - App crea grupos via RPC.
  - Inserts directos de cliente revocados en tablas de grupos.
- Estabilidad:
  - ErrorBoundary global.
  - Toast/Snackbar global.
  - `parseSupabaseError`.
  - Logger seguro para dev.
- UI:
  - Tokens refinados.
  - Avatars, badges, cards con tonos.
  - Home, Grupos, Lanzar, Ranking y Perfil rediseñadas.
  - Tabs con iconos SF Symbols via `expo-image`.
- Docs:
  - Setup Supabase.
  - Auth email.
  - RLS policies.
  - Build/testing.
  - QA audit.

## Verificaciones completadas

- TypeScript: OK.
- ESLint: OK.
- Expo Doctor: OK, 20/20 checks.
- Expo export: OK para web/iOS/Android en `/tmp/rondapp-export`.
- `npm audit --omit=dev --audit-level=high`: OK; quedan moderadas transitivas sin fix seguro.
- Supabase migration remota `create_group_rpc`: OK.
- RPC create group: verificada con usuario QA temporal, grupo y membership owner creados, datos limpiados.
- Security advisors: revisados.
- Performance advisors: revisados.

## Pendientes antes de probar con amigos

- Configurar Supabase Auth email branding, SMTP y redirect allow list.
- Activar leaked password protection en Supabase Auth.
- Instalar y probar el APK preview generado; iOS preview sigue bloqueado por Apple Developer.
- Prueba real en dos dispositivos para confirmar push/deep links fuera del simulador.
