# UI/UX Improvement Report

> **HISTÓRICO — corte previo al beta 2026-07-13.** Las decisiones y PASS siguientes describen
> una versión anterior. Ver el contrato vigente en `BETA_READINESS.md`.

Fecha: 2026-07-09  
Estado: mejoras aplicadas, QA visual final pendiente.

## Resumen

Esta pasada se enfoco en fricciones que podian bloquear una release candidate: errores no visibles en launch, estados vacios incompletos, interacciones permitidas en rondas cerradas y colores hardcodeados en errores. No se sustituyo el sistema visual Afterglow; se reforzo usando los componentes existentes.

Tambien se corrigio la continuidad del flujo de invitacion: un usuario que abre un enlace de grupo sin sesion ya conserva el destino durante login, registro, confirmacion, age gate y perfil.

## Pantallas tocadas

## Onboarding

Archivo:

- `app/(auth)/onboarding.tsx`

Problema:

- QA visual web en viewport movil `390x844` mostro que el usuario entendia el producto, pero los CTAs "Crear cuenta" e "Iniciar sesion" quedaban practicamente fuera del primer viewport.

Solucion:

- Las tres tarjetas separadas de pasos se compactaron en una sola tarjeta de pasos.
- El hero baja de `minHeight: 210` a `148`.
- Se reduce el tamano de `BrandMark` en pasos de 46 a 42.

Antes:

- El usuario tenia que desplazarse para llegar claramente a los CTAs principales.

Despues:

- La propuesta y los CTAs quedan mas cerca en pantallas pequenas, sin eliminar el mensaje de privacidad, 18+ y no gamificacion de consumo.

## Lanzar ronda

Archivo:

- `app/(tabs)/launch.tsx`

Problema:

- Si el usuario tenia un solo grupo, el flujo aun podia exigir una seleccion manual.
- Si fallaba la subida o RPC, el error se guardaba pero no quedaba visible en el composer.
- Habia un color de error hardcodeado.

Solucion:

- Anadido `effectiveSelectedGroupId` para preseleccionar el unico grupo de forma visible.
- `MomentComposer` recibe `errorMessage`.
- Error visual usa `colors.danger`.

Antes:

- "Elige grupo" podia aparecer aunque solo hubiera una opcion.
- Un fallo de subida podia depender de toast temporal.

Despues:

- Un grupo unico queda elegido directamente.
- El error aparece debajo del composer hasta que el usuario reintenta.

## Composer de momento

Archivo:

- `src/features/rounds/components/moment-composer.tsx`

Problema:

- No tenia slot de error persistente.

Solucion:

- Anadida prop `errorMessage?: string | null`.
- El error se renderiza con `colors.danger`.

Resultado:

- El usuario no pierde el motivo del fallo al subir la foto.

## Detalle de ronda y Estrella de la ronda

Archivos:

- `app/round/[roundId].tsx`
- `src/features/rounds/components/moment-card.tsx`
- `src/components/rondas/star-button.tsx`
- `src/features/rounds/api.ts`

Problema:

- `MomentCard` deshabilitaba reacciones si la ronda estaba cerrada, pero el boton de Estrella
  seguia mostrando estado accionable.
- La API cliente podia intentar reaccionar/votar si alguien llamaba el handler por error.

Solucion:

- Nuevo estado visual `disabledClosed` en `StarButton`.
- `MomentCard` pasa "Ronda cerrada" si la ronda expiro.
- `StarButton` ahora expone `accessibilityRole`, `accessibilityLabel` y `accessibilityState`.
- `toggleReaction` y `toggleRoundStar` llaman `assertRoundOpen`.

Antes:

- UI ambigua: una ronda cerrada todavia podia parecer votable.

Despues:

- El boton comunica "Ronda cerrada" y queda deshabilitado.
- La API devuelve error humano si se intenta interactuar tarde.

## Detalle de grupo

Archivo:

- `app/group/[groupId].tsx`

Problema:

- Las rondas recientes no tenian loading/error/empty state dedicado.

Solucion:

- La pantalla espera tambien `recentRoundsQuery`.
- ErrorState incluye retry para grupo, miembros y rondas recientes.
- EmptyState "Aun no hay rondas" con CTA "Lanzar ronda".

Resultado:

- Un grupo nuevo no termina en una seccion vacia sin guia.

## Grupos

Archivo:

- `app/(tabs)/groups.tsx`

Problema:

- "Mis grupos" podia quedarse vacio aunque hubiera CTAs arriba.

Solucion:

- Anadido empty state explicito "Crea tu primer grupo" con CTA a modal.

Resultado:

- La pantalla guia mejor a usuarios nuevos.

## Auth y age gate

Archivos:

- `app/(auth)/age-gate.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`

Problema:

- Errores usaban hex hardcodeado.

Solucion:

- Sustituido por `colors.danger`.

Resultado:

- Menos deuda visual y mas consistencia del design system.

## Perfil, ajustes y soporte

Archivos:

- `app/(tabs)/profile.tsx`
- `app/settings.tsx`
- `app/support.tsx`
- `app/delete-account.tsx`
- `app/privacy.tsx`
- `app/terms.tsx`
- `app/community-guidelines.tsx`
- `src/constants/support.ts`

Problema:

- Para tiendas faltaba una superficie clara de contacto y borrado de cuenta.

Solucion:

- Perfil y ajustes enlazan a soporte.
- Ajustes enlaza a "Borrar cuenta".
- Soporte muestra `soporte@rondapp.app` y abre `mailto:`.
- Borrado de cuenta usa doble confirmacion y explica owner transfer, contenido propio y reportes anonimizados.
- Legal/normas ya no dependen de placeholders visibles.

Resultado:

- El usuario tiene rutas visibles para soporte, privacidad y borrado de cuenta antes de submission.

## Deep links de invitacion

Archivos:

- `app/join/[inviteCode].tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/check-email.tsx`
- `app/(auth)/age-gate.tsx`
- `app/(auth)/complete-profile.tsx`
- `app/auth/callback.tsx`
- `src/lib/navigation.ts`
- `src/lib/deep-links.ts`

Problema:

- El enlace de invitacion funcionaba solo si el usuario ya estaba autenticado y con perfil listo. Si no, la redireccion a auth perdia el codigo.

Solucion:

- Se propaga `next=/join/{codigo}` por login, registro, reenviar email, callback de auth, age gate y completar perfil.
- `normalizeNextPath` rechaza URLs externas o rutas no esperadas para evitar open redirects.

Resultado:

- El flujo queda preparado para que una invitacion continue tras completar auth/onboarding.
- Prueba real pendiente en build interna con enlaces nativos.

## Detalle de momento

Archivo:

- `app/moment/[momentId].tsx`

Problema:

- La ruta de detalle de momento era una pantalla preparatoria sin contenido real.

Solucion:

- La ruta carga el momento por id, firma la imagen, muestra autor/caption/bebida y ofrece acciones para ver ronda o reportar.

Resultado:

- Los deep links o navegaciones a un momento concreto ya no aterrizan en una pantalla de placeholder.

## Backend UX: creacion transaccional de ronda

Archivos:

- `src/features/rounds/api.ts`
- `supabase/migrations/20260709133155_create_round_with_moment_rpc.sql`

Problema:

- Ronda y primer momento se creaban en dos inserts cliente separados. Si fallaba el segundo, podia quedar una ronda huerfana.

Solucion:

- Nueva RPC `create_round_with_moment`.
- El cliente sube imagen y luego crea ronda + momento en una transaccion.
- Si falla la RPC, se elimina la imagen subida.

Resultado:

- Menos estados rotos visibles al usuario.

## Backend UX: interacciones en ronda cerrada

Archivos:

- `supabase/migrations/20260709133913_restrict_closed_round_interactions.sql`

Problema:

- Las politicas permitian borrar reacciones/Estrellas propias aunque la ronda estuviera cerrada.

Solucion:

- RLS delete de `reactions` y `photo_votes` exige ronda activa y no expirada.

Resultado:

- La regla "no interactuar si la ronda esta cerrada" queda reforzada tambien en backend.

## Errores de red y missing env

Archivos:

- `src/lib/errors.ts`
- `src/components/feedback/missing-env.tsx`
- `app/index.tsx`

Problema:

- El checklist pedia errores offline/missing-env humanos, no fallos tecnicos ni crashes raros.

Solucion:

- `parseSupabaseError` cubre mensajes habituales de red en web/iOS/Android, incluyendo `failed to fetch`, `load failed`, timeouts y `status = 0`.
- La app ya redirige a `MissingEnvScreen` cuando faltan URL/key de Supabase.

Resultado:

- Sin variables Supabase, el export web pasa y la app muestra una pantalla de configuracion pendiente.
- Los errores de red tienen copy humano y los `ErrorState` existentes pueden ofrecer retry.

## Borrado de momento propio

Archivos:

- `src/features/rounds/api.ts`
- `app/round/[roundId].tsx`

Problema:

- El borrado eliminaba el row de `moments`, pero no revisaba el `error` de `storage.remove`, por lo que una limpieza de archivo fallida podia quedar escondida.

Solucion:

- `deleteMoment` comprueba el resultado de Storage, registra warning sin secretos y devuelve `storageCleanupFailed`.
- La UI muestra aviso diferenciado si el momento ya desaparecio de la ronda pero la limpieza del archivo requiere revision.

Resultado:

- El flujo deja de tragar errores de Storage de forma silenciosa.

## Accesibilidad de acciones sociales

Archivos:

- `src/components/ui/reaction-chip.tsx`
- `src/components/rondas/reaction-dock.tsx`
- `src/components/ui/glass-button.tsx`
- `app/modals/report.tsx`

Problema:

- Los chips de reaccion y motivos de reporte dependian de texto visual, pero no declaraban label/estado seleccionable completo para lector de pantalla.

Solucion:

- `ReactionChip` recibe `label`, anuncia "Anadir/Quitar reaccion" y expone `selected/disabled`.
- `GlassButton` expone estado `disabled/busy`.
- Los motivos de reporte tienen `accessibilityRole`, `accessibilityLabel` y `accessibilityState`.

Resultado:

- Las acciones sociales principales tienen semantica accesible basica sin cambiar la UI visual.

## Pruebas ejecutadas

```bash
npm run typecheck
npm run lint
npx --yes deno check supabase/functions/send-round-notification/index.ts
npx --yes deno check supabase/functions/close-round/index.ts
npx --yes deno check supabase/functions/delete-account/index.ts
npx expo export --platform all --output-dir /tmp/rondapp-export
EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= EXPO_PUBLIC_APP_ENV=development npx expo export --platform web --output-dir /tmp/rondapp-export-no-env
```

Resultado: PASS despues de las mejoras.

## QA visual ejecutada

Entorno:

- URL: `http://localhost:8081`
- Desktop: viewport por defecto del navegador integrado.
- Mobile: `390x844`.

Capturas temporales generadas fuera del repo:

- `/tmp/rondapp-qa-desktop-initial.png`
- `/tmp/rondapp-qa-desktop-login.png`
- `/tmp/rondapp-qa-mobile-onboarding.png`

Resultados:

- Desktop onboarding renderiza contenido real, sin overlay de framework.
- Desktop onboarding -> login navega a `/login`.
- Mobile onboarding no tenia overflow horizontal ni tap targets pequenos detectados.
- Se detecto y corrigio que los CTAs de onboarding quedaban demasiado bajos en mobile.
- Consola web tuvo warnings no bloqueantes: `expo-notifications` no soporta push-token listener en web y `props.pointerEvents` deprecated en React Native Web.
- El Browser path fallo al recapturar la pantalla actualizada: `domSnapshot` interno no disponible y posteriormente timeout de click/captura. No se instalaron dependencias Playwright nuevas porque el proyecto no las incluye.

## Pendientes

- QA visual con capturas en iPhone pequeno, Android pequeno y pantalla alta.
- Prueba runtime en dispositivo con permisos de camara/galeria.
- Prueba multiusuario de reacciones, Estrella de la ronda, reportes y bloqueos.
- Seguir revisando home/grupos si el volumen real crece; ranking y ronda detalle ya usan `FlatList`.
- Completar metadata/screenshot pack de tiendas.
