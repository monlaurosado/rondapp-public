# QA Audit Report - Rondapp MVP

> **HISTÓRICO — corte previo al beta 2026-07-13.** Mantener solo como trazabilidad; no usar
> sus resultados como PASS actual.

Fecha: 2026-07-06

## Alcance revisado

- Documentos de producto y QA en `README.md` y `docs/00` a `docs/12`.
- Configuracion Expo/EAS/TypeScript: `app.config.ts`, `eas.json`, `tsconfig.json`, `package.json`.
- Rutas Expo Router en `app/`.
- Cliente Supabase, Auth, grupos, rondas, ranking, notificaciones, moderacion y UI base en `src/`.
- Migraciones y Edge Functions en `supabase/`.

## Hallazgos y soluciones aplicadas

| Area | Error / riesgo encontrado | Causa probable | Archivos | Solucion aplicada |
| --- | --- | --- | --- | --- |
| Grupos | Crear grupo podia fallar despues de insertar `social_groups` | Insercion en dos pasos desde cliente; RLS de `group_members` necesita consultar un grupo que el usuario todavia no puede ver como miembro | `src/features/groups/api.ts`, `supabase/migrations/*` | Nueva RPC `public.create_group(text)` transaccional. Crea grupo + owner membership. App llama RPC y se revocan inserts directos a `authenticated` |
| Auth email | Registro no pasaba `emailRedirectTo` ni tenia callback nativo | Flujo de confirmacion email incompleto para mobile | `src/features/auth/api.ts`, `app/auth/callback.tsx`, `src/features/auth/callback.ts`, `src/lib/deep-links.ts` | `signUp` y `resend` usan `rondapp://auth/callback`; callback soporta code, token hash y fragment session |
| Auth UX | No habia pantalla dedicada de "revisa tu email" ni reenvio | Registro solo mostraba notice local | `app/(auth)/check-email.tsx`, `app/(auth)/register.tsx` | Nueva pantalla con reenvio de confirmacion |
| Feedback | Errores crudos de Supabase y Alerts dispersos | Falta de parser central y snackbar global | `src/lib/errors.ts`, `src/components/feedback/toast.tsx`, `app/round/[roundId].tsx` | `parseSupabaseError`, `ToastProvider`, feedback de exito/error en Auth, grupos y rondas |
| Estabilidad | Falta de ErrorBoundary global | Una excepcion de render podia dejar pantalla en blanco | `src/components/feedback/error-boundary.tsx`, `app/_layout.tsx` | ErrorBoundary global con logger seguro |
| Logs | `console.warn` directo en funciones no criticas | Faltaba wrapper dev/prod | `src/lib/logger.ts`, `src/features/rounds/api.ts`, `src/features/notifications/hooks.ts` | Logger redactor de claves/tokens y logs solo fuera de produccion |
| UI | Pantallas principales con jerarquia limitada | Componentes base simples | `src/components/ui/*`, `app/(tabs)/*` | Tokens refinados, cards con tonos, badges, avatars, tabs con iconos, Home/Groups/Launch/Ranking/Profile rediseñadas |
| Deep links invite | Se podia unir por ruta, pero no se copiaba enlace app | Solo se copiaba codigo | `app/group/[groupId].tsx`, `src/lib/deep-links.ts` | Copia `rondapp://join/{code}` equivalente generado por Expo Linking |

## Verificaciones realizadas

- `npm run typecheck`: OK.
- `npm run lint`: OK.
- `npm install`: OK, sin cambios pendientes.
- `npx expo-doctor`: OK, 20/20 checks.
- `npx expo export --platform all --output-dir /tmp/rondapp-export`: OK.
- `npm audit --omit=dev --audit-level=high`: OK; 11 moderadas transitivas de Expo/xcode/uuid quedan sin fix seguro porque `--force` propone downgrade incompatible.
- Supabase remoto: migration `create_group_rpc` aplicada.
- Supabase remoto: prueba SQL de QA creo grupo + membership owner y luego se limpio.
- Supabase advisors:
  - Security: WARN esperados por RPCs `SECURITY DEFINER` expuestas a `authenticated` (`create_group`, `join_group_by_invite`, `close_round`, `get_weekly_leaderboard`) y aviso manual de leaked password protection desactivado.
  - Performance: INFO de indices aun no usados en tablas nuevas.

## Pendientes manuales

- Enlazar CLI local si se quiere usar `supabase migration list` desde terminal: `supabase link --project-ref bckrwqvvmjjorunbzxbo`.
- Arrancar Supabase local si se quieren pruebas locales de migraciones: `supabase start`.
- Configurar Auth email branding, SMTP y redirect URLs segun `docs/SUPABASE_AUTH_EMAIL_SETUP.md`.
- Login de EAS (`eas login`) antes de generar builds internas.
