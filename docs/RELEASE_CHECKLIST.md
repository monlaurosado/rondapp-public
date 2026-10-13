# Rondapp Release Checklist

Fecha: 2026-07-09  
Estado general: HISTÓRICO; DELTA_BETA_2026_07_13_PASS_LOCAL_CON_BLOQUEOS_EXTERNOS
Objetivo: dejar el repositorio preparado como release candidate publicable cuando se aporten credenciales externas de Supabase, EAS, Apple Developer y Google Play.

> Los DONE/PASS inferiores describen el corte de 2026-07-09 y no validan la migración beta ni
> los cambios posteriores. El estado vigente está en `BETA_READINESS.md`; no promover hasta
> completar el delta siguiente con evidencia nueva.

## Leyenda

- DONE: verificado con evidencia concreta.
- TODO: pendiente de corregir o validar.
- BLOCKED_EXTERNAL: bloqueado por cuenta, credencial, dashboard o dispositivo externo; el codigo debe quedar preparado.
- DONE_LOCAL: verificado contra Supabase local con usuarios reales de prueba.
- DONE_WEB: verificado en Expo web con Supabase local y evidencia nueva.
- PASS_LOCAL: gate repetido desde una pila/base local limpia después del último cambio.
- BLOCKED_NATIVE: requiere simulador, dispositivo o credenciales nativas no disponibles.
- Prioridad: P0 bloquea release candidate, P1 bloquea calidad de tienda, P2 mejora posterior.

## Delta beta 2026-07-13 — estado vigente

- [x] P0 `DONE_LOCAL` + `DONE_WEB`: una reacción activa por persona/foto, con
  añadir/cambiar/retirar, rollback optimista y RPC `toggle_reaction`.
- [x] P0 `DONE_LOCAL` + `DONE_WEB`: una Estrella por persona/ronda,
  asignable/movible/retirable, sin foto propia ni ronda cerrada, mediante
  `toggle_round_star` y `src/components/rondas/star-button.tsx`.
- [x] P0 `DONE_WEB`: las cinco tabs Inicio, Grupos, Cámara/Lanzar, Ranking y Perfil son
  visibles en 320, 360, 390 y 430 px.
- [x] P0 `DONE_LOCAL` + `DONE_WEB`: Ranking muestra selector explícito de grupo, última
  selección válida, estados con/cero actividad y desglose descriptivo.
- [x] P0 `DONE_LOCAL` + `DONE_WEB`: Perfil muestra `Tus momentos por bebida` solo para
  `auth.uid()` mediante `get_my_profile_stats()`; bebida no puntúa.
- [x] P0 `DONE_WEB`: logout limpia sesión/cache privada, vuelve a onboarding y no deja
  warnings de app en consola. El coordinador de token push y aislamiento A→B pasó auditoría
  de código; la desvinculación de un token nativo real figura aparte.
- [x] P0 `DONE_LOCAL`: publicación y dispatch push son idempotentes ante retry; no duplican
  ronda, momento, objeto ni notificación.
- [x] P0 `DONE_LOCAL`: reportes, bloqueos y Storage aplican visibilidad estricta en el QA
  multiusuario de backend.
- [x] P0 `DONE_WEB`: un outsider no puede abrir el grupo ajeno, recibe error humano y la
  consola web queda limpia.
- [x] P0 `DONE_LOCAL`: la cadena completa, incluida
  `supabase/migrations/20260713092422_beta_integrity_star_reactions_stats.sql`, aplica desde
  cero y pasa QA multiusuario.
- [x] P0 `DONE_WEB`: el deep link protegido conserva el destino exacto a través de
  login → age gate → grupo.
- [x] P1 `DONE_WEB`: QA visual nueva con datos locales reales en 320×568, 360×800, 390×844 y
  430×932; evidencia válida 01–04 y 06–20.
- [x] P0 `PASS_LOCAL`: `qa:supabase:local`, `qa:release:local`, typecheck, lint, Expo Doctor
  20/20, exports web/iOS/Android, Deno, db reset/lint/advisors y `git diff --check` repetidos
  después del último cambio. DB lint queda sin resultados; Advisors conserva solo INFO y npm
  11 moderadas documentadas, sin vulnerabilidad alta/crítica.
- [ ] P0 `BLOCKED_NATIVE`: probar token push real, cámara/galería/subida, teclado, safe areas,
  texto ampliado, background, deep links y logout/login A→B en iOS y Android.
- [ ] P0 `BLOCKED_EXTERNAL`: aplicar/verificar la migración en un Supabase remoto autorizado,
  ejecutar smoke/advisors remotos y generar builds EAS Android/iOS del árbol actual.

El contenido inferior conserva el corte histórico del 2026-07-09. Para el estado actual
prevalecen este delta y `BETA_READINESS.md`.

## Producto

- [x] P0 Onboarding entiende la propuesta en menos de 10 segundos
  - Estado: DONE
  - Archivos: `app/(auth)/onboarding.tsx`, `src/constants/copy.ts`
  - Criterio: pantalla inicial explica rondas privadas, momento social y no gamifica consumo.
  - Prueba: Browser QA en `http://localhost:8081/onboarding`, desktop y mobile `390x844`; `npm run typecheck`, `npm run lint`, `npx expo export --platform all --output-dir /tmp/rondapp-export`.
  - Resultado: copy validado y sin overlay; se compacto layout porque los CTAs quedaban demasiado bajos en mobile. El QA estatico bloquea copy que gamifique consumo.

- [ ] P0 Age gate 18+ persiste y no deja avanzar sin aceptar
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(auth)/age-gate.tsx`, `src/features/auth/auth-context.tsx`
  - Criterio: usuario nuevo declara 18+, el estado persiste y la navegacion respeta el gate.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: persistencia de `is_age_confirmed` cubierta por QA local; prueba end-to-end en build con usuario real queda bloqueada por Supabase remoto/EAS/dispositivo.

- [ ] P0 Registro email/password
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(auth)/register.tsx`, `src/features/auth/api.ts`, `src/lib/errors.ts`
  - Criterio: valida email/password, registra usuario, informa confirmacion si aplica y no deja errores tecnicos.
  - Prueba: `npm run typecheck`, `npm run lint`; configuracion Auth documentada.
  - Resultado: implementado a nivel codigo; prueba funcional requiere Supabase Auth remoto, SMTP/branding y usuario real.

- [ ] P0 Login email/password
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(auth)/login.tsx`, `src/features/auth/api.ts`, `src/features/auth/auth-context.tsx`
  - Criterio: login inicia sesion persistente y redirige segun perfil/edad.
  - Prueba: `npm run typecheck`, `npm run lint`.
  - Resultado: implementado a nivel codigo; login end-to-end requiere usuario real en Supabase remoto y build/runtime.

- [ ] P1 Login Google/Apple rapido
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/features/auth/social-auth.ts`, `src/components/auth/social-auth-buttons.tsx`, `supabase/config.toml`, `docs/SOCIAL_AUTH_SETUP.md`
  - Criterio: Google y Apple estan activados en Supabase y login devuelve sesion.
  - Prueba: `/auth/v1/settings` con publishable key.
  - Resultado: Google OAuth aplicado y verificado con `external.google=true`; Apple sigue bloqueado por credenciales Apple Developer/secret. Login real requiere probar en runtime con cuenta Google.

- [ ] P0 Deep link callback Auth
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/auth/callback.tsx`, `src/features/auth/callback.ts`, `src/lib/deep-links.ts`, `src/lib/navigation.ts`, `supabase/config.toml`
  - Criterio: callback intercambia code/session, maneja errores de forma humana y conserva destino interno `next`.
  - Prueba: `npm run typecheck`, `npm run lint`, `npx expo export --platform all --output-dir /tmp/rondapp-export`; falta prueba con magic link/OAuth real.
  - Resultado: ruta compila; `next` se transporta por email confirmation/OAuth sin aceptar URLs externas. Prueba real requiere magic link/OAuth/provider activo y build/dispositivo.

- [ ] P0 Perfil completo
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(auth)/complete-profile.tsx`, `app/(tabs)/profile.tsx`, `src/features/auth/api.ts`
  - Criterio: username/display name/age gate quedan guardados, perfil no se ve vacio.
  - Prueba: `npm run typecheck`, `npm run lint`, `npm run qa:supabase:local`.
  - Resultado: implementado a nivel codigo; prueba completa requiere usuario autenticado real en runtime.

- [ ] P0 Grupos: empty state, crear grupo y listar mis grupos
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(tabs)/groups.tsx`, `app/modals/create-group.tsx`, `src/features/groups/api.ts`, `supabase/migrations/20260706184037_create_group_rpc.sql`
  - Criterio: usuario autenticado crea grupo de 2-40 caracteres, queda owner y aparece sin refresco manual.
  - Prueba: `npm run qa:supabase:local`.
  - Resultado: PASS backend local; owner crea grupo, outsider no lo lee y member entra por invite. Validacion UI final en build/app real queda bloqueada por entorno externo.

- [ ] P0 Invitaciones: unirse con codigo/enlace
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/modals/join-group.tsx`, `app/join/[inviteCode].tsx`, `src/features/groups/api.ts`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/age-gate.tsx`, `app/(auth)/complete-profile.tsx`, `src/lib/navigation.ts`
  - Criterio: usuario introduce codigo o abre link y queda miembro del grupo.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: PASS backend local por RPC `join_group_by_invite`; deep link conserva `/join/{code}` a traves de login, registro, confirmacion email, age gate y completar perfil. Prueba en dispositivo/build interna queda bloqueada por EAS/dispositivo.

- [ ] P1 Silenciar grupo
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/group/[groupId].tsx`, `src/features/groups/api.ts`, `supabase/migrations/20260709144527_fix_group_members_update_policy.sql`
  - Criterio: `group_members.muted` se actualiza y edge function respeta silencio.
  - Prueba: `npm run qa:supabase:local`.
  - Resultado: PASS backend local tras corregir recursion RLS en `group_members_update_self_muted_or_admin`; edge function respeta `muted`, deploy remoto pendiente por Supabase secrets/access token.

- [ ] P0 Lanzar ronda con foto inicial
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(tabs)/launch.tsx`, `src/features/rounds/api.ts`, `src/features/rounds/components/moment-composer.tsx`, `src/lib/images.ts`, `supabase/migrations/20260709133155_create_round_with_moment_rpc.sql`
  - Criterio: selecciona grupo, pide permisos, comprime imagen, sube a Storage, crea ronda y momento, actualiza Home.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: PASS backend local para Storage privado + RPC transaccional; permisos camara/galeria y upload real quedan bloqueados por dispositivo/build y Supabase remoto.

- [x] P0 Tipo de bebida opcional no puntua
  - Estado: DONE
  - Archivos: `src/constants/drinks.ts`, `src/features/rounds/api.ts`, `supabase/migrations/20260706174227_rondapp_mvp_init.sql`, `supabase/migrations/20260706175034_move_rls_helpers_to_private_schema.sql`
  - Criterio: bebida se almacena como metadata opcional y no participa en ranking.
  - Prueba: `rg drink_type` + revision de `get_weekly_leaderboard` en migraciones.
  - Resultado: `drink_type` solo se guarda/muestra como metadata; la formula usa rondas, momentos, participacion, reacciones, Estrellas y ganadoras.

- [ ] P0 Ronda detalle
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/round/[roundId].tsx`, `src/features/rounds/api.ts`, `src/features/rounds/components/moment-card.tsx`, `src/components/rondas/star-button.tsx`
  - Criterio: muestra estado/cuenta atras/momentos, permite foto-respuesta si abierta y bloquea acciones si cerrada.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: PASS backend local con dos momentos y cierre de ronda; UI runtime final queda bloqueado por build/dispositivo.

- [ ] P0 Reacciones rapidas
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/components/rondas/reaction-dock.tsx`, `src/features/rounds/api.ts`, `src/features/rounds/hooks.ts`, `src/constants/reactions.ts`, `supabase/migrations/20260713092422_beta_integrity_star_reactions_stats.sql`
  - Criterio: una reacción activa por usuario/foto; otro emoji cambia, el mismo retira y un
    error revierte la UI optimista.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: PASS backend local; member reacciona, outsider no puede reaccionar y ronda cerrada no acepta nuevas reacciones. Prueba tactil final requiere dispositivo/build.

- [ ] P0 Estrella de la ronda
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/components/rondas/star-button.tsx`, `src/features/rounds/api.ts`, `src/features/rounds/hooks.ts`, `supabase/migrations/20260713092422_beta_integrity_star_reactions_stats.sql`
  - Criterio: una Estrella por usuario/ronda; se asigna, mueve o retira si está abierta, no se
    usa en foto propia y un error revierte la UI optimista.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: PASS backend local; member da Estrella de la ronda, owner no puede votar su propia foto y ganador cerrado coincide con el momento con Estrella de la ronda. Prueba tactil final requiere dispositivo/build.

- [ ] P0 Ranking semanal por grupo
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/(tabs)/ranking.tsx`, `src/features/ranking/api.ts`, `src/components/ranking/ranking-podium.tsx`, `supabase/migrations/20260713092422_beta_integrity_star_reactions_stats.sql`
  - Criterio: tab visible, selector explícito, podio/lista/desglose completo, semana lunes y
    sin puntos por bebida.
  - Prueba: `npm run qa:supabase:local`, revision SQL `get_weekly_leaderboard`.
  - Resultado: PASS backend local; ranking devuelve owner/member con actividad social y no expone `drink_type`. UI runtime final queda bloqueado por build/dispositivo.

- [ ] P0 Reportar contenido
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/modals/report.tsx`, `src/features/moderation/api.ts`, `supabase/migrations/20260706174227_rondapp_mvp_init.sql`
  - Criterio: usuario reporta momento, reporte queda privado y contenido reportado se oculta para ese usuario.
  - Prueba: `npm run qa:supabase:local`.
  - Resultado: PASS backend local; member reporta momento y lee su reporte. UI modal final requiere build/runtime con usuario real.

- [ ] P0 Bloquear usuario
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/features/moderation/api.ts`, `src/features/rounds/api.ts`, `src/features/rounds/components/moment-card.tsx`, `supabase/migrations/20260706174227_rondapp_mvp_init.sql`
  - Criterio: usuario bloqueado queda oculto en listados y no rompe rondas/grupos.
  - Prueba: `npm run qa:supabase:local`.
  - Resultado: PASS backend local; bloquear usuario oculta contenido entre ambos. UI runtime final requiere build/dispositivo.

- [ ] P0 Borrar mi propio momento
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/features/rounds/api.ts`, `src/features/rounds/components/moment-card.tsx`
  - Criterio: autor borra momento propio y storage se limpia si procede.
  - Prueba: `npm run qa:supabase:local`, `npm run typecheck`, `npm run lint`.
  - Resultado: PASS backend local; member borra su momento y Storage deja de firmar la imagen borrada. Storage remoto y runtime final pendientes por Supabase/EAS.

- [x] P1 Ajustes, privacidad, terminos y normas
  - Estado: DONE
  - Archivos: `app/settings.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `app/community-guidelines.tsx`, `app/support.tsx`, `src/constants/support.ts`
  - Criterio: usuario puede consultar legal/normas, soporte, privacidad, logout y borrado de cuenta.
  - Prueba: `npm run typecheck`, `npm run lint`, export final.
  - Resultado: rutas existen, placeholders legales sustituidos por borradores base; soporte y borrado de cuenta estan enlazados desde ajustes.

- [ ] P1 Borrado de cuenta
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/delete-account.tsx`, `app/settings.tsx`, `src/features/auth/api.ts`, `supabase/functions/delete-account/index.ts`
  - Criterio: usuario autenticado puede solicitar borrado desde Ajustes con confirmacion explicita; service role queda solo en Edge Function.
  - Prueba: `npm run typecheck`, `npm run lint`, `npx --yes deno check supabase/functions/delete-account/index.ts`, export final.
  - Resultado: codigo cliente y Edge Function implementados y typechecked; despliegue/prueba real BLOCKED_EXTERNAL por `SUPABASE_SERVICE_ROLE_KEY` y deploy functions.

- [x] P1 Empty/loading/error states cuidados
  - Estado: DONE
  - Archivos: `src/components/ui/empty-state.tsx`, `src/components/ui/loading-state.tsx`, `src/components/ui/error-state.tsx`, `app/(tabs)/groups.tsx`, `app/group/[groupId].tsx`, `app/(tabs)/launch.tsx`, rutas en `app/`
  - Criterio: cada flujo principal tiene estado vacio/carga/error con CTA claro.
  - Prueba: auditoria de codigo + `npm run typecheck` + `npm run lint`.
  - Resultado: anadidos empty states en grupos/detalle de grupo y error persistente en composer; errores de red se traducen con retry cuando aplica.

- [ ] P1 Accesibilidad mobile
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `app/`, `src/components/`, `src/components/ui/reaction-chip.tsx`, `src/components/ui/glass-button.tsx`, `app/modals/report.tsx`
  - Criterio: tap targets, labels, contraste, reduced motion, textos no dependen solo de color.
  - Prueba: Browser QA mobile `390x844` en onboarding; auditoria de componentes interactivos; `npm run typecheck`, `npm run lint`.
  - Resultado: no se detectaron tap targets menores de 44x36 ni overflow horizontal en onboarding; `StarButton`, reacciones, botones y motivos de reporte exponen role/label/state. Auditoria completa con lector de pantalla queda bloqueada por dispositivo.

## Tecnico

- [x] P0 TypeScript estricto
  - Estado: DONE
  - Archivos: `tsconfig.json`, `app/`, `src/`
  - Criterio: `tsc --noEmit` pasa.
  - Prueba: `npm run typecheck`.
  - Resultado: PASS el 2026-07-09.

- [x] P0 ESLint
  - Estado: DONE
  - Archivos: `eslint.config.js`, `app/`, `src/`
  - Criterio: `eslint .` pasa sin errores.
  - Prueba: `npm run lint`.
  - Resultado: PASS el 2026-07-09.

- [x] P0 Expo Doctor
  - Estado: DONE
  - Archivos: `package.json`, `package-lock.json`
  - Criterio: 20/20 checks.
  - Prueba: `npx expo-doctor`.
  - Resultado: PASS tras actualizar `expo` a `~57.0.4`.

- [x] P0 Export all platforms
  - Estado: DONE
  - Archivos: proyecto completo.
  - Criterio: web/iOS/Android bundles se generan.
  - Prueba: `npx expo export --platform all --output-dir /tmp/rondapp-export`.
  - Resultado: PASS despues de ultimos cambios, exportado en `/tmp/rondapp-export` (14M).

- [x] P0 App arranca localmente
  - Estado: DONE
  - Archivos: proyecto completo.
  - Criterio: Metro arranca y responde por HTTP.
  - Prueba: `curl -I http://localhost:8081` y `curl http://localhost:8081/status`.
  - Resultado: PASS, HTTP 200 y `packager-status:running`.

- [x] P0 Supabase client sin service role en cliente
  - Estado: DONE
  - Archivos: `src/lib/supabase.ts`, `.env.local`, `.env.example`
  - Criterio: cliente usa URL + publishable key; no service role en `EXPO_PUBLIC_`.
  - Prueba: inspeccion de env y `rg process.env`.
  - Resultado: PASS; service role solo documentado para Edge Functions.

- [x] P0 QA estatico de release
  - Estado: DONE
  - Archivos: `scripts/qa-release-static.mjs`, `package.json`, `app.config.ts`, `app/`, `src/`, `docs/`
  - Criterio: gate repetible comprueba docs obligatorios, checklist cerrada sin `TODO`/`IN_PROGRESS`, ausencia de secretos en cliente, copy sin gamificacion de consumo y permisos/config nativa de tienda.
  - Prueba: `npm run qa:release:static`.
  - Resultado: PASS; la checklist solo contiene `DONE` o `BLOCKED_EXTERNAL`, no hay service role/access token en cliente, no hay copy prohibido en app/src, docs obligatorios no estan vacios y Expo config no declara `RECORD_AUDIO`.

- [x] P0 QA release local agregado
  - Estado: DONE
  - Archivos: `scripts/qa-release-local.mjs`, `package.json`
  - Criterio: un comando local ejecuta gates no externos de release y falla ante la primera regresion.
  - Prueba: `npm run qa:release:local`.
  - Resultado: PASS; ejecuta `qa:release:static`, typecheck, lint, Expo Doctor, Deno check de Edge Functions, export multiplataforma y `git diff --check`.

- [ ] P0 Supabase Auth config
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `supabase/config.toml`, `scripts/apply-supabase-auth-settings.mjs`, `scripts/apply-supabase-google-oauth.mjs`, `docs/SOCIAL_AUTH_SETUP.md`, `docs/SUPABASE_REMOTE_APPLY_REPORT.md`
  - Criterio: redirect URLs y providers aplicados en proyecto Supabase.
  - Prueba: `npx supabase projects list`, `/auth/v1/settings`, `npm run supabase:auth:configure`, `npm run supabase:auth:google` y authorize Google con redirect manual.
  - Resultado: email activo, `mailer_autoconfirm=false`, Site URL y cinco callbacks aplicados; Google `external.google=true` y redirige a `accounts.google.com`. Apple sigue bloqueado por credenciales Apple; HIBP requiere plan Pro.

- [x] P0 RLS y politicas privadas por grupo
  - Estado: DONE
  - Archivos: `supabase/migrations/*.sql`, `docs/SUPABASE_RELEASE_AUDIT.md`, `docs/SUPABASE_REMOTE_APPLY_REPORT.md`
  - Criterio: usuarios solo leen/escriben datos de grupos donde son miembros.
  - Prueba: `npx supabase db push --linked`, `npx supabase migration list --linked`, consulta remota a `pg_class`/`pg_policy`, `npx supabase db advisors --linked --type all --level warn --fail-on error`.
  - Resultado: PASS remoto; 10 tablas publicas del MVP con RLS activo y policies, RPCs sin grant `anon`; advisors sin errores, con warnings aceptados/documentados de RPCs `SECURITY DEFINER`.

- [x] P0 Storage bucket y policies
  - Estado: DONE
  - Archivos: `supabase/migrations/20260706174227_rondapp_mvp_init.sql`, `src/lib/images.ts`
  - Criterio: bucket `moments` existe con acceso coherente con privacidad de grupos.
  - Prueba: consulta remota a `storage.buckets` y `pg_policies`; `npm run qa:supabase:local`.
  - Resultado: PASS local y remoto; bucket `moments` existe con `public=false`, policies de Storage preparadas y QA local cubre acceso member/outsider.

- [x] P0 Supabase local QA multiusuario
  - Estado: DONE
  - Archivos: `scripts/qa-supabase-local.mjs`, `package.json`, `supabase/migrations/*.sql`
  - Criterio: QA repetible crea usuarios reales locales y valida RLS/RPC/Storage sin mocks.
  - Prueba: `npm run qa:supabase:local`.
  - Resultado: PASS; cubre age gate DB, grupo privado, invite, silenciar grupo, Storage privado, ronda+momento transaccional, foto-respuesta, reaccion, Estrella de la ronda, ranking, reporte, cierre, bloqueo y borrado de momento propio.

- [x] P1 Edge functions
  - Estado: DONE_LOCAL; DEPLOY_BETA_BLOCKED_EXTERNAL
  - Archivos: `supabase/functions/_shared/supabase-env.ts`, `supabase/functions/send-round-notification/index.ts`, `supabase/functions/close-round/index.ts`, `supabase/functions/delete-account/index.ts`, `supabase/functions/delete-moment/index.ts`, `supabase/functions/cleanup-storage-deletions/index.ts`
  - Criterio: deployables, no exponen secretos, fallos de push no rompen creacion de ronda.
  - Prueba vigente: Deno fmt sobre 6 fuentes, Deno check de las 5 funciones y smoke local
    multiusuario. El worker acepta secret opaca en `apikey`, fallback Bearer legacy y rechaza
    credenciales no administrativas.
  - Resultado: PASS local. El corte histórico tenía tres funciones ACTIVE en remoto; las dos
    funciones beta nuevas y la configuración hosted del worker no se desplegaron en este corte.

- [x] P0 QA smoke remoto Supabase
  - Estado: DONE
  - Archivos: `scripts/qa-supabase-remote-smoke.mjs`, `scripts/qa-supabase-remote-managed.mjs`, `package.json`, `docs/SUPABASE_REMOTE_APPLY_REPORT.md`
  - Criterio: smoke remoto crea owner/member/outsider temporales, valida grupo privado, invite, ronda, Storage, reaccion, Estrella de la ronda, ranking, reporte y bloqueo, y elimina las cuentas QA.
  - Prueba: `SUPABASE_ACCESS_TOKEN=... npm run qa:supabase:remote:managed`.
  - Resultado: PASS remoto; operaciones de producto con publishable key y sesiones reales, alta/limpieza con secret key efimera en memoria, cuentas y datos eliminados, `mailer_autoconfirm=false` sin cambios.

- [ ] P1 Push notifications
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/features/notifications/api.ts`, `supabase/functions/send-round-notification/index.ts`, `app.config.ts`
  - Criterio: permisos, token Expo, guardado, envio al grupo excluyendo creador y silenciados.
  - Prueba: requiere build/dispositivo/credenciales Expo push.
  - Resultado: codigo preparado; prueba real bloqueada por entorno externo.

- [ ] P0 Deep links
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/lib/deep-links.ts`, `src/lib/navigation.ts`, `app/auth/callback.tsx`, `app/join/[inviteCode].tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/age-gate.tsx`, `app/(auth)/complete-profile.tsx`, `app/round/[roundId].tsx`, `app.config.ts`
  - Criterio: auth, invite y ronda abren correctamente con/sin sesion.
  - Prueba: `npm run typecheck`, `npm run lint`, `npx expo export --platform all --output-dir /tmp/rondapp-export`.
  - Resultado: invite deep link ya preserva destino interno seguro con `next`; validacion runtime con enlaces reales queda bloqueada por build/dispositivo.

- [ ] P1 Offline/network error states
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `src/lib/errors.ts`, `src/components/ui/state.tsx`, `app/group/[groupId].tsx`, rutas con `ErrorState`
  - Criterio: errores de red dan retry/mensaje humano sin bloquear UI.
  - Prueba: auditoria de codigo; pendiente QA con red cortada en dispositivo.
  - Resultado: `parseSupabaseError` cubre errores de red comunes y `ErrorState` soporta retry; prueba real offline queda bloqueada por dispositivo/build.

- [x] P1 Performance imagenes/listas
  - Estado: DONE
  - Archivos: `src/features/rounds/components/moment-card.tsx`, `src/lib/images.ts`, `app/round/[roundId].tsx`, `app/(tabs)/ranking.tsx`
  - Criterio: usa compresion, placeholders y listas adecuadas; no bloquea UI en upload.
  - Prueba: auditoria de codigo, `npm run typecheck`, `npm run lint`.
  - Resultado: imagenes se comprimen a JPEG 1280px y se renderizan con `expo-image`; momentos de ronda y ranking usan `FlatList` con separadores y padding estable.

- [x] P0 Variables de entorno
  - Estado: DONE
  - Archivos: `.env.example`, `.env.local`, `src/lib/env.ts`, `supabase/.env.example`
  - Criterio: app falla con mensaje dev-friendly si faltan env; secretos fuera del cliente.
  - Prueba: inspeccion de `app/index.tsx` + `MissingEnvScreen`; `EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= EXPO_PUBLIC_APP_ENV=development npx expo export --platform web --output-dir /tmp/rondapp-export-no-env`.
  - Resultado: PASS; el bundle web se genera y la ruta inicial muestra pantalla de configuracion pendiente en vez de crear cliente Supabase nulo.

- [ ] P0 EAS development/preview/production
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `eas.json`, `app.config.ts`
  - Criterio: development client, Android preview APK, Android production AAB, iOS production listo.
  - Prueba: inspeccion de `eas.json`, `app.config.ts`, `npx eas-cli whoami`.
  - Resultado vigente: EAS CLI autenticado como `rdrosado`, proyecto `@rdrosado/rondapp`
    enlazado y perfiles configurados. No se generó un build del árbol actual; el APK preview
    visible es del corte anterior del 2026-07-09 y no valida esta beta.

- [ ] P0 Android APK preview
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `eas.json`
  - Criterio: `eas build -p android --profile preview` genera APK.
  - Prueba: requiere lanzar un build EAS del árbol actual.
  - Resultado: autenticación EAS disponible; build actual no iniciado para no consumir cuota ni
    publicar artefactos sin autorización explícita.

- [ ] P0 Android production AAB
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `eas.json`
  - Criterio: `eas build -p android --profile production` genera AAB.
  - Prueba: requiere Google Play signing/config y lanzar el build externo.
  - Resultado: bloqueado por Play y por build externo no autorizado, no por login EAS.

- [ ] P0 iOS preview/TestFlight/App Store build
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `eas.json`, `app.config.ts`
  - Criterio: `eas build -p ios --profile preview/production` listo.
  - Prueba: requiere Apple Developer y lanzar el build externo.
  - Resultado: bloqueado por Apple Developer y distribución, no por login EAS.

- [ ] P1 Store metadata/legal
  - Estado: BLOCKED_EXTERNAL
  - Archivos: `docs/STORE_READINESS_CHECKLIST.md`, `app/privacy.tsx`, `app/terms.tsx`, `app/community-guidelines.tsx`, `app/support.tsx`, `app/delete-account.tsx`
  - Criterio: checklist de datos, privacidad, screenshots y soporte lista para tiendas.
  - Prueba: revision de `app.config.ts`, `eas.json`, rutas legales, `npx expo config --type public`.
  - Resultado: checklist de tienda creada; buildNumber/versionCode y permisos nativos verificados; soporte y borrado de cuenta implementados a nivel codigo; formularios de tiendas, screenshots finales y email real quedan bloqueados por cuentas externas.

- [x] P0 Documentacion release
  - Estado: DONE
  - Archivos: `docs/RELEASE_CHECKLIST.md`, `docs/REPO_AUDIT_REPORT.md`, `docs/PRODUCT_UX_AUDIT.md`, `docs/UI_UX_IMPROVEMENT_REPORT.md`, `docs/SUPABASE_RELEASE_AUDIT.md`, `docs/STORE_READINESS_CHECKLIST.md`, `docs/BUILD_RELEASE_GUIDE.md`, `docs/FINAL_RELEASE_REPORT.md`
  - Criterio: todos los documentos obligatorios existen con conclusiones y evidencia.
  - Prueba: `npm run qa:release:static`.
  - Resultado: los 8 documentos obligatorios existen, superan el minimo de contenido y contienen acciones/evidencia.

## Riesgos abiertos P0/P1

- RLS/Storage/RPC y la migración beta pasan localmente; este delta no se aplicó ni verificó en
  Supabase remoto.
- Los flujos principales sí se verificaron end-to-end con usuarios reales de Supabase local;
  runtime hosted, SMTP/proveedores y dispositivo siguen marcados `BLOCKED_EXTERNAL/NATIVE`.
- EAS está autenticado; los builds actuales y stores siguen bloqueados por autorización de
  publicación, cuentas de tienda y credenciales Apple/Play.
- Google OAuth remoto activado; Apple social login bloqueado por credenciales Apple.
- `npm audit` informa 11 moderadas transitivas en tooling Expo; en el corte final
  `npm audit fix --force` propone un downgrade breaking de `expo-sharing`, no aceptable.
- QA visual web completada; QA física iOS/Android pendiente tras export final local correcto.
