# Final Release Report

> **HISTÓRICO — no es el release report del beta 2026-07-13.** Los PASS y capturas inferiores
> pertenecen a un corte anterior y no validan la migración o UI actual.

Fecha: 2026-07-09  
Estado final de esta pasada: DONE_LOCAL_WITH_EXTERNAL_BLOCKERS, no publicable todavia sin resolver bloqueos externos y QA runtime.

## 1. Resumen ejecutivo

Rondapp avanzo de proyecto funcional a candidato mucho mas cercano a release: gates locales pasan, Expo Doctor fue corregido, la creacion de ronda inicial ahora es transaccional, la UI bloquea interacciones en rondas cerradas, se reforzaron estados vacios/errores, se anadieron soporte/borrado de cuenta y se completaron documentos de release, Supabase, UX, store y builds.

En esta pasada se anadio QA local multiusuario repetible para Supabase. Ese QA encontro una recursion real en la policy de silenciar grupo, se corrigio con una migracion nueva y el QA completo paso despues.

Tambien se corrigio una friccion de deep links: abrir una invitacion sin sesion ya no pierde el codigo al pasar por login, registro, confirmacion email, age gate o completar perfil.

Se anadio un QA estatico de release para bloquear regresiones de secretos en cliente, permisos nativos no justificados, docs obligatorios vacios, checklist incompleta y copy que gamifique consumo.

Tambien se anadio un gate agregado `npm run qa:release:local` para ejecutar los checks locales no externos de release con un solo comando.

Despues de QA visual web se compacto el onboarding para que los CTAs principales no queden tan bajos en viewport movil `390x844`.

No se declara release candidate final porque faltan builds EAS, pruebas en dispositivos fisicos, push notifications reales, cuentas de tiendas, Apple OAuth y QA end-to-end con usuarios confirmados. Supabase remoto ya quedo aplicado: migraciones, RLS/storage/RPCs, Google OAuth y Edge Functions.

## 2. Estado final

Estado: DONE_LOCAL_WITH_EXTERNAL_BLOCKERS.

Listo localmente:

- TypeScript.
- ESLint.
- QA release local agregado.
- QA estatico de release.
- Expo Doctor.
- Export multiplataforma final.
- Arranque local verificado.
- Config EAS base.
- Versionado inicial de tienda: `ios.buildNumber = "1"` y `android.versionCode = 1`, con EAS remote autoIncrement para production.
- Permisos nativos reducidos: camara/fotos/notificaciones; `RECORD_AUDIO` bloqueado porque la app no graba audio/video.
- Missing env y errores de red reforzados con mensajes humanos.
- Accesibilidad basica mejorada en reacciones, botones y motivos de reporte.
- Supabase client sin secretos.
- Edge Functions soportan `SUPABASE_SECRET_KEYS`/`SUPABASE_PUBLISHABLE_KEYS` y fallback legacy.
- Google OAuth aplicado en remoto desde JSON local sin guardar secretos.
- Supabase local y remoto verificados: migraciones aplican desde cero localmente, `db push --linked` aplicado, RLS activo en tablas MVP, bucket `moments` privado, RPCs presentes y QA multiusuario local pasando.
- Edge Functions desplegadas en remoto y ACTIVE.
- UI/UX principal mejorada.
- Soporte visible y borrado de cuenta implementados localmente.
- Ruta de detalle de momento reemplazada por contenido real.
- Deep link de invitacion conserva destino interno seguro durante auth/onboarding.
- QA estatico verifica docs obligatorios, checklist sin `TODO`/`IN_PROGRESS`, permisos nativos, secretos de cliente y copy anti-gamificacion.
- Ranking y ronda detalle usan `FlatList` para listas con crecimiento real.
- `npm run qa:release:local` agrupa los gates locales no externos.
- QA visual web parcial con capturas desktop/mobile.
- Docs obligatorios creados.

Bloqueado externamente:

- EAS login/proyecto.
- Apple Developer.
- Google Play Console.
- Apple OAuth credentials/secret.
- Leaked password protection de Supabase bloqueado por plan; HIBP requiere Pro o superior.
- SMTP/branding real.
- QA en build interna con usuarios reales.

## 3. Checklist completada

Archivo principal:

- `docs/RELEASE_CHECKLIST.md`

Estado:

- Gates tecnicos locales: DONE.
- Build/store remoto: BLOCKED_EXTERNAL.
- Flujos core: codigo listo o mejorado, QA end-to-end pendiente por entorno externo.

## 4. Que se arreglo

## Expo SDK

Archivos:

- `package.json`
- `package-lock.json`

Accion:

- Actualizado `expo` a `~57.0.4`.

Evidencia:

- `npx expo-doctor`: PASS 20/20.

## Creacion transaccional de ronda

Archivos:

- `src/features/rounds/api.ts`
- `supabase/migrations/20260709133155_create_round_with_moment_rpc.sql`

Accion:

- Nueva RPC `create_round_with_moment`.
- Cliente sube imagen y crea ronda + primer momento en una transaccion.
- Cleanup de Storage si falla la RPC.

Riesgo eliminado:

- Rondas huerfanas sin primer momento si fallaba el segundo insert.

## Interacciones en ronda cerrada

Archivos:

- `src/components/rondas/star-button.tsx`
- `src/features/rounds/components/moment-card.tsx`
- `src/features/rounds/api.ts`
- `supabase/migrations/20260709133913_restrict_closed_round_interactions.sql`

Accion:

- Estrella de la ronda muestra estado "Ronda cerrada".
- API rechaza reaccionar/votar en ronda expirada.
- RLS delete de reacciones/Estrellas exige ronda activa.

## Recursion RLS en silenciar grupo

Archivos:

- `scripts/qa-supabase-local.mjs`
- `package.json`
- `supabase/migrations/20260709144527_fix_group_members_update_policy.sql`

Problema:

- El QA local detecto `infinite recursion detected in policy for relation "group_members"` al actualizar `group_members.muted`.

Accion:

- Nuevo helper `private.is_group_admin`.
- Policy `group_members_update_self_muted_or_admin` recreada sin subquery directa a la misma tabla.
- Trigger `validate_group_member_update` limita a miembros normales a cambiar solo `muted`.

Evidencia:

- `npm run qa:supabase:local`: PASS.
- `npx --yes supabase db lint --local --fail-on error`: PASS.
- `npx --yes supabase db advisors --local --type all --level warn --fail-on error`: PASS.

## Deep links de invitacion durante auth

Archivos:

- `src/lib/navigation.ts`
- `src/lib/deep-links.ts`
- `app/join/[inviteCode].tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/check-email.tsx`
- `app/(auth)/age-gate.tsx`
- `app/(auth)/complete-profile.tsx`
- `app/auth/callback.tsx`
- `src/components/auth/social-auth-buttons.tsx`
- `src/features/auth/api.ts`
- `src/features/auth/social-auth.ts`

Problema:

- Si un usuario abria `rondapp://join/CODIGO` sin sesion, la app redirigia a login y perdia el codigo de invitacion.

Accion:

- Anadido helper `normalizeNextPath` para aceptar solo rutas internas conocidas.
- Login/registro/check-email/age-gate/complete-profile propagan `next`.
- Email confirmation y OAuth usan `getAuthRedirectUrl(nextPath)`.
- La pantalla de join redirige a auth con `next=/join/CODIGO` cuando falta sesion, edad o perfil.

Evidencia:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npx expo export --platform all --output-dir /tmp/rondapp-export`: PASS.

## QA estatico de release

Archivos:

- `scripts/qa-release-static.mjs`
- `package.json`

Accion:

- Nuevo comando `npm run qa:release:static`.
- Verifica que los 8 documentos obligatorios existan y no esten vacios.
- Verifica que `docs/RELEASE_CHECKLIST.md` no contenga `Estado: TODO` ni `Estado: IN_PROGRESS`.
- Escanea `app/`, `src/`, `.env.example`, `.env.local` y `app.config.ts` para impedir `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` o `sb_secret_` en cliente.
- Escanea copy de `app/` y `src/` para bloquear frases de gamificacion de consumo.
- Lee `npx expo config --type public --json` y valida identidad/versionado/permisos nativos, incluyendo ausencia de `RECORD_AUDIO`.

Evidencia:

- `npm run qa:release:static`: PASS.

## QA release local agregado

Archivos:

- `scripts/qa-release-local.mjs`
- `package.json`

Accion:

- Nuevo comando `npm run qa:release:local`.
- Ejecuta `qa:release:static`, `typecheck`, `lint`, `expo-doctor`, `deno check` de Edge Functions, export multiplataforma y `git diff --check`.
- No arranca ni resetea Supabase local; `qa:supabase:local` queda separado para evitar borrar datos locales por sorpresa.

Evidencia:

- `npm run qa:release:local`: PASS.

## Estados vacios y errores

Archivos:

- `app/(tabs)/groups.tsx`
- `app/group/[groupId].tsx`
- `app/(tabs)/launch.tsx`
- `src/features/rounds/components/moment-composer.tsx`
- `app/(auth)/age-gate.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`

Accion:

- Empty state para "Mis grupos".
- Empty/loading/error state para rondas recientes en detalle de grupo.
- Error persistente en composer de lanzamiento.
- Errores usan `colors.danger`.

## Onboarding movil

Archivos:

- `app/(auth)/onboarding.tsx`

Accion:

- Compactadas las tres tarjetas de pasos en una tarjeta unica.
- Hero reducido de 210 a 148 px.

Evidencia:

- Captura previa mobile en `/tmp/rondapp-qa-mobile-onboarding.png` mostro CTAs demasiado bajos.
- `npm run typecheck`, `npm run lint` y export final pasan tras el cambio.

## Soporte y borrado de cuenta

Archivos:

- `app/support.tsx`
- `app/delete-account.tsx`
- `app/settings.tsx`
- `app/(tabs)/profile.tsx`
- `src/constants/support.ts`
- `src/features/auth/api.ts`
- `supabase/functions/delete-account/index.ts`

Accion:

- Soporte visible desde perfil/ajustes con mailto a `soporte@rondapp.app`.
- Borrado de cuenta visible desde ajustes con doble confirmacion.
- Edge Function autenticada usa service role solo en servidor, borra tokens/interacciones/memberships, limpia Storage y elimina el usuario con API admin.

Pendiente:

- Verificar buzon real y desplegar/probar `delete-account` en Supabase.

## Detalle de momento

Archivos:

- `app/moment/[momentId].tsx`

Accion:

- Sustituida pantalla preparatoria por vista real del momento con imagen firmada, autor, texto, bebida opcional, CTA a ronda y reporte.

## 5. Que se mejoro en UX/UI

- En aquel corte, Launch preseleccionaba el unico grupo manteniendo visible su contexto.
- Launch conserva error visible si falla upload/RPC.
- Grupo nuevo guia a lanzar la primera ronda.
- El botón de Estrella en ronda cerrada deja de parecer accionable.
- Auth/age gate usan tokens del design system.
- Onboarding movil acerca los CTAs principales al primer viewport.
- Reacciones, botones y reporte exponen labels/estados accesibles basicos.
- Copy se mantiene alineado con "momentos sociales", no consumo.

Detalle completo:

- `docs/PRODUCT_UX_AUDIT.md`
- `docs/UI_UX_IMPROVEMENT_REPORT.md`

## 6. Bloqueos externos

## Supabase

Estado:

- Migraciones remotas aplicadas y alineadas.
- RLS/storage/RPCs verificados en remoto.
- Google OAuth activo.
- Edge Functions desplegadas.

Completado: `npm run qa:supabase:remote:managed` valida Auth/RLS/Storage/RPC con tres cuentas temporales y las elimina. Auth mantiene `mailer_autoconfirm=false`.

Pendiente: rotar el `SUPABASE_ACCESS_TOKEN` usado en esta tanda si ya no se necesita.

## Google/Apple Auth

Bloqueo:

- Google activo; Apple no activo sin credenciales Apple Developer.

Resolver:

```bash
set -a
source supabase/.env
set +a
npx supabase config push --project-ref bckrwqvvmjjorunbzxbo
```

## EAS y tiendas

Bloqueo:

- `npx eas-cli whoami` devuelve `Not logged in`.

Resolver:

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build -p android --profile preview
```

## 7. Que falta antes de publicar realmente

- Configurar Apple OAuth si se quiere mostrar ese provider fuera de Apple nativo.
- Configurar EAS project id.
- Generar Android APK preview y probar con amigos.
- Generar iOS preview/TestFlight.
- Probar push notifications en dispositivo real.
- Verificar buzon de soporte y probar borrado de cuenta desplegado.
- Completar App Store privacy y Play Data Safety.
- Generar screenshots reales.
- Ejecutar QA multiusuario.

## 8. Comandos ejecutados

```bash
npm install
npm audit --json
npm run qa:release:local
npm run typecheck
npm run lint
npm run qa:release:static
npx expo-doctor
npx expo install expo@~57.0.4
npx expo export --platform all --output-dir /tmp/rondapp-export
npx eas-cli whoami
curl -L --max-time 20 https://supabase.com/changelog.md
npx --yes supabase --version
npx --yes supabase migration --help
npx --yes supabase db --help
npx --yes supabase db lint --help
npx --yes supabase db advisors --help
npx --yes supabase db query --help
npx --yes supabase db push --help
npx --yes supabase config push --help
npx --yes supabase functions deploy --help
npx --yes supabase link --help
npx --yes supabase start
npx --yes supabase status
npx --yes supabase migration list --local
npx --yes supabase migration up --local
npx --yes supabase db reset --local
npx --yes supabase db lint --local --fail-on error
npx --yes supabase db advisors --local --type all --level warn --fail-on error
npx --yes supabase db query --local "<RLS/storage/grants verification queries>"
npm run qa:supabase:local
npx --yes supabase migration new create_round_with_moment_rpc
npx --yes supabase migration new restrict_closed_round_interactions
npx --yes supabase migration new fix_group_members_update_policy
command -v deno
npx --yes deno --version
npx --yes deno check supabase/functions/send-round-notification/index.ts
npx --yes deno check supabase/functions/close-round/index.ts
npx --yes deno check supabase/functions/delete-account/index.ts
npx expo config --type public
EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= EXPO_PUBLIC_APP_ENV=development npx expo export --platform web --output-dir /tmp/rondapp-export-no-env
git diff --check
```

## 9. Resultados de gates

- `npm run typecheck`: PASS despues de ultimos cambios.
- `npm run lint`: PASS despues de ultimos cambios.
- `npm run qa:release:local`: PASS; gate agregado local no externo.
- `npm run qa:release:static`: PASS; docs obligatorios, checklist cerrada, secretos de cliente, copy prohibido y config nativa.
- `npx expo-doctor`: PASS tras actualizar Expo.
- `npx expo export --platform all --output-dir /tmp/rondapp-export`: PASS despues de ultimos cambios; salida final 14M en `/tmp/rondapp-export`.
- `npx --yes deno check` en `send-round-notification`, `close-round` y `delete-account`: PASS; se corrigio una firma tipada en `delete-account`.
- `npx expo config --type public`: PASS; renderiza `ios.buildNumber = "1"`, `android.versionCode = 1` y Android solo con `POST_NOTIFICATIONS` + `CAMERA`, sin `RECORD_AUDIO`.
- Missing env: export web con `EXPO_PUBLIC_SUPABASE_URL=` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` PASS; `app/index.tsx` deriva a `MissingEnvScreen`.
- Supabase local: `migration list --local` PASS, `db lint --local --fail-on error` PASS sin errores, `db advisors --local --type all --level warn --fail-on error` PASS sin issues.
- Supabase clean reset: `npx --yes supabase db reset --local` PASS; aplica todas las migraciones desde cero.
- `npm run qa:supabase:local`: PASS; cubre age gate DB, grupo privado, invite, silenciar grupo, Storage privado, ronda+momento transaccional, foto-respuesta, reaccion, Estrella de la ronda, ranking, reporte, cierre, bloqueo y borrado de momento propio.
- `npm run qa:supabase:remote:managed`: PASS; tres usuarios reales temporales, grupo privado, invite, Storage, ronda, reaccion, Estrella de la ronda, ranking, reporte, bloqueo y limpieza de cuentas/datos.
- RLS/Storage local: consultas a catalogos confirman RLS activo en las 10 tablas publicas del MVP, bucket `moments` privado, policies de Storage presentes y sin grants `anon`/`PUBLIC` en funciones sensibles revisadas.
- `git diff --check`: PASS.
- App local: Metro reiniciado en `http://localhost:8081`; Browser confirma login renderizado y botones Google/Apple en el estado remoto correcto.
- Browser visual QA: desktop onboarding, desktop login y mobile onboarding capturados en `/tmp/rondapp-qa-*.png`; Browser path fallo al recapturar la version actualizada por error interno de snapshot/timeout.
- `npx eas-cli whoami`: BLOCKED_EXTERNAL, no logueado.
- `npx supabase projects list` y `npx supabase link --project-ref bckrwqvvmjjorunbzxbo`: PASS con token efimero.
- `npx supabase db push --linked` y `npx supabase migration list --linked`: PASS.
- `npx --yes deno check` despues de adaptar Edge Functions a claves modernas: PASS.
- `npx supabase functions deploy` para las tres Edge Functions: PASS.
- `GOOGLE_OAUTH_JSON=... npm run supabase:auth:google`: PASS; `/auth/v1/settings` confirma `external.google=true`.
- `npm audit --audit-level=moderate --json`: 11 moderadas transitivas en tooling Expo/xcode/uuid; no se aplica fix forzado porque propone degradaciones incompatibles.

## 10. Como probar en local

```bash
npm install
npx expo start
```

En iPhone:

- Abrir Expo Go o development build.
- Escanear QR.
- Si se necesita build nativa, usar EAS development build.

## 11. Como generar APK

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

## 12. Como preparar iOS

```bash
npx eas-cli login
npx eas-cli device:create
npx eas-cli build -p ios --profile preview
```

Para TestFlight:

```bash
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest
```

## 13. Como publicar mas adelante

1. Resolver EAS, Apple Auth y cuentas de tienda.
2. Generar build interna Android/iOS.
3. Ejecutar QA funcional y visual en dispositivos.
4. Completar privacy/data safety.
5. Subir screenshots.
6. Enviar a TestFlight/Play internal.
7. Corregir feedback.
8. Promover a production.

## 14. Riesgos conocidos

- El QA remoto automatizado pasa; falta repetir la matriz funcional en dispositivos con usuarios testers.
- No hay build EAS generada desde esta sesion.
- Push notifications no esta probado en dispositivo.
- Google social login esta activo; Apple social login sigue pendiente de credenciales/dashboard Apple.
- `npm audit` reporta vulnerabilidades moderadas transitivas en tooling Expo; no se aplico `audit fix --force` porque propone degradar Expo.
- Ranking y ronda detalle ya usan `FlatList`; home/grupos conservan `map` solo para bloques acotados o formularios.
- Falta auditoria completa con lector de pantalla en dispositivo fisico.

## 15. Proximas mejoras recomendadas

- QA de borrado de cuenta desplegado con usuario de prueba y revision de retencion legal.
- QA automatizado minimo para funciones puras/ranking si se anade test runner.
- Capturas Play/App Store.
- Observabilidad basica de errores en production.
- Better upload progress/retry para fotos.
- Revisar accessibility labels en todos los controles compuestos.
