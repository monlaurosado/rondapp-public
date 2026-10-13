# Rondapp Repo Audit Report

> **HISTÓRICO — corte previo al beta 2026-07-13.** El inventario y los resultados pueden haber
> cambiado; ver `BETA_READINESS.md` y reejecutar los gates.

Fecha: 2026-07-09  
Rama: `main`  
Remoto: `git@github.com:monlaurosado/rondapp.git`  
Estado: auditoria inicial de release candidate.

## Resumen ejecutivo

Rondapp ya es un proyecto Expo/React Native funcional con estructura de app real, Expo Router, Supabase, migraciones, Edge Functions, UI system propio y documentacion de producto. Los gates tecnicos base pasan despues de corregir la version de `expo` a `~57.0.4`.

El repositorio todavia no puede declararse release candidate final porque faltan pruebas end-to-end reales sobre Supabase, RLS, Storage, Auth, push notifications, builds EAS y flujos multiusuario. Varios puntos estan bloqueados externamente por credenciales: EAS, Apple Developer, Google Play, Google/Apple OAuth y Supabase Management API token.

## Stack real detectado

- Expo SDK 57 (`expo ~57.0.4`)
- React 19.2.3
- React Native 0.86.0
- Expo Router 57
- TypeScript 6 con `strict: true`
- ESLint 9 + `eslint-config-expo`
- Supabase JS 2.110
- TanStack Query 5
- Zustand 5
- Expo Camera, Image Picker, Image Manipulator, Notifications, Haptics, Secure Store, Apple Authentication, Web Browser
- Supabase migrations + Edge Functions en `supabase/`
- EAS profiles en `eas.json`

## Archivos revisados en la fase inicial

- `package.json`
- `package-lock.json`
- `app.config.ts`
- `eas.json`
- `tsconfig.json`
- `eslint.config.js`
- `.env.local`
- `.env.example`
- `supabase/.env.example`
- `supabase/config.toml`
- Estructura `app/`
- Estructura `src/`
- Estructura `supabase/migrations`
- Estructura `supabase/functions`
- Docs existentes en `docs/`

## Comandos ejecutados

```bash
npm install
npm audit --json
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform all --output-dir /tmp/rondapp-export
npx eas-cli whoami
```

## Resultados

| Comando | Resultado | Evidencia |
| --- | --- | --- |
| `npm install` | PASS | Dependencias al dia; audit reporta 11 moderadas |
| `npm run typecheck` | PASS | `tsc --noEmit` sin errores |
| `npm run lint` | PASS | `eslint .` sin errores |
| `npx expo-doctor` inicial | FAIL | `expo` esperado `~57.0.4`, encontrado `57.0.3` |
| `npx expo install expo@~57.0.4` | DONE | Actualizo `package.json`/lockfile |
| `npx expo-doctor` final | PASS | 20/20 checks |
| `npx expo export --platform all --output-dir /tmp/rondapp-export` | PASS | Bundles web/iOS/Android generados |
| `npx eas-cli whoami` / `project:info` | PASS | `rdrosado`, proyecto `@rdrosado/rondapp` |

## Puntos fuertes

- Arquitectura modular por features: auth, groups, rounds, ranking, moderation, notifications.
- Navegacion Expo Router completa con auth routes, tabs, modals y detail routes.
- Supabase definido como fuente real, no mock.
- Migrations versionadas y Edge Functions incluidas.
- Design system propio con tokens, glass components, botones, cards, estados y componentes de marca.
- Documentacion de producto amplia ya presente.
- TypeScript estricto y lint pasan.
- Export multiplataforma pasa.
- EAS tiene perfiles `development`, `preview` y `production`.
- `service_role` no esta expuesto en variables `EXPO_PUBLIC_`.

## Riesgos detectados

1. **Apple Auth y QA remoto pendientes**
   - Google OAuth remoto esta activo; Apple social login requiere credenciales Apple Developer.
   - El smoke remoto gestionado pasa con tres cuentas temporales y conserva `mailer_autoconfirm=false`; falta QA funcional en dispositivos.

2. **Distribucion iOS pendiente**
   - EAS y Android estan configurados; iOS Ad Hoc/TestFlight requiere Apple Developer.
   - Project ID y EAS environments ya estan aplicados.

3. **Flujos core no verificados end-to-end en remoto**
   - QA local multiusuario ya cubre crear grupo, join, ronda, Storage, reacciones, Estrella de la ronda, ranking, report/block.
   - Falta repetirlo contra Supabase remoto/build interna con usuarios reales.

4. **RLS/Storage remoto pendiente**
   - RLS/Storage local pasan `db reset`, `db lint`, `db advisors` y `npm run qa:supabase:local`.
   - Falta aplicar migraciones remotas y repetir advisors/QA con credenciales reales.

5. **Push notifications bloqueado externamente**
   - Requiere build fisica/dev client, Expo project ID y credenciales/configuracion de push.

6. **`npm audit` moderado en tooling Expo**
   - 11 vulnerabilidades moderadas transitivas relacionadas con `@expo/*`, `xcode`, `uuid`.
   - `npm audit fix --force` propone bajar `expo` a 46.0.21, lo cual rompe el stack. No se aplica automaticamente.

## Errores encontrados y acciones realizadas

- Error: Expo Doctor fallaba por version de `expo`.
  - Accion: `npx expo install expo@~57.0.4`.
  - Resultado: Expo Doctor ahora pasa 20/20.

- EAS CLI/proyecto: resuelto con `@rdrosado/rondapp`, entornos cloud y EAS Update.
  - Pendiente externo: credenciales Apple para iOS y cuentas de tienda para submit.

- Riesgo funcional: creacion de ronda y primer momento no era transaccional.
  - Accion: nueva RPC `create_round_with_moment` y uso desde `src/features/rounds/api.ts`.
  - Resultado: ronda + primer momento se crean juntos tras subir imagen; cleanup de Storage si falla.

- Riesgo funcional: Estrella de la ronda podia parecer accionable en ronda cerrada.
  - Accion: estado visual "Ronda cerrada", guard cliente y migracion RLS para deletes de interacciones.
  - Resultado: `npm run typecheck` y `npm run lint` pasan.

## Deuda tecnica inicial

- Falta QA funcional automatizada/manual documentada por flujo.
- Falta auditoria RLS exhaustiva y pruebas multiusuario.
- Falta comprobar UX real en viewport movil y dispositivo.
- Falta completar docs obligatorios de release.
- Falta store metadata y privacidad/datos para App Store / Play Store.
- Falta validar app sin `.env.local`.
- Falta confirmar que report/block estan expuestos en UI suficiente para tienda.

## Archivos criticos

- App config: `app.config.ts`, `eas.json`
- Env: `.env.example`, `.env.local`, `src/lib/env.ts`, `supabase/.env.example`
- Supabase client: `src/lib/supabase.ts`
- Auth: `src/features/auth/*`, `app/(auth)/*`, `app/auth/callback.tsx`
- Groups: `src/features/groups/*`, `app/(tabs)/groups.tsx`, `app/group/[groupId].tsx`, `app/modals/*group*`
- Rounds: `src/features/rounds/*`, `app/(tabs)/launch.tsx`, `app/round/[roundId].tsx`
- Moderation: `src/features/moderation/*`, `app/modals/report.tsx`
- Ranking: `src/features/ranking/*`, `app/(tabs)/ranking.tsx`
- Notifications: `src/features/notifications/*`, `supabase/functions/send-round-notification/index.ts`
- Database: `supabase/migrations/*.sql`

## Prioridades de cierre

1. Auditar Supabase/RLS/Storage/Functions contra invariantes de privacidad.
2. Auditar y mejorar UX pantalla por pantalla, especialmente onboarding, home, launch, round detail, ranking, report/block.
3. Validar flujos core con Supabase real o documentar bloqueo externo con pasos exactos.
4. Completar docs obligatorios de release.
5. Dejar `eas.json`, app metadata, legal pages y build guide listos para tiendas.
6. Ejecutar QA visual/export final y registrar evidencia en `FINAL_RELEASE_REPORT.md`.
