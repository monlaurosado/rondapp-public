# Product UX Audit

> **HISTÓRICO — corte previo al beta 2026-07-13.** No usar sus capturas ni estados como
> evidencia de la navegación, reacciones, Estrella, Ranking o Perfil actuales.

Fecha: 2026-07-09  
Estado: DONE_LOCAL_WITH_EXTERNAL_BLOCKERS; mejoras aplicadas y QA runtime bloqueado externamente por Supabase/EAS.

## Resumen ejecutivo

Rondapp ya se entiende como una app social privada, no como una demo tecnica. Las pantallas principales comunican grupos privados, rondas, momentos, Estrellas y ranking semanal sin premiar el consumo. El mayor riesgo de UX antes de publicar no es visual, sino de validacion real: hace falta probar onboarding, auth, grupos, ronda, foto, reacciones, Estrellas, ranking y moderacion con Supabase remoto, dos usuarios reales y builds internas.

Durante esta auditoria se corrigieron problemas concretos de flujo: preseleccion visible del
unico grupo al lanzar ronda, error visible en el composer, empty state en grupos/detalle de
grupo, bloqueo visual de Estrella de la ronda en ronda cerrada y uso consistente de
`colors.danger` en errores de auth.

## Pantallas auditadas

## Onboarding

Archivos:

- `app/(auth)/onboarding.tsx`
- `src/constants/copy.ts`

Estado: mejorado localmente, QA dispositivo pendiente.

Observaciones:

- Explica en pocas frases "lanzar ronda", "subir momento" y "Estrella de la ronda".
- Incluye privacidad, 18+ y copy explicito de que la bebida es contexto opcional.
- No usa copy que premie consumo.

Acciones:

- Se mantiene el copy actual porque satisface la regla de no gamificar alcohol.
- Se compacto la estructura visual para que los CTAs principales queden mas cerca en `390x844`.

Pendiente:

- Capturas en iPhone pequeno, Android pequeno y dispositivo real despues de resolver la inestabilidad del Browser path o usar build fisica.

## Age Gate

Archivos:

- `app/(auth)/age-gate.tsx`
- `src/features/auth/api.ts`

Estado: OK local, QA Supabase pendiente.

Observaciones:

- Bloquea usuarios no autenticados.
- Confirma `is_age_confirmed` antes de continuar.
- El copy es claro y no moralizante.

Acciones:

- Error visual actualizado para usar `colors.danger`.

Pendiente:

- Probar persistencia de perfil real despues de registro/login.

## Auth Email y Social

Archivos:

- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/check-email.tsx`
- `app/auth/callback.tsx`
- `src/components/auth/social-auth-buttons.tsx`
- `src/features/auth/social-auth.ts`

Estado: codigo listo; Google/Apple BLOCKED_EXTERNAL.

Observaciones:

- Email/password valida formato y password corta.
- Check email evita que el usuario quede sin explicacion si requiere confirmacion.
- Social buttons dependen de providers activos en Supabase.
- El error original de provider no habilitado es consistente con Supabase settings no aplicados.

Acciones:

- Errores de login/register usan token `colors.danger`.

Pendiente:

- Activar Google y Apple en Supabase.
- Probar callback OAuth en `rondapp://auth/callback` y `exp://**`.

## Home

Archivo:

- `app/(tabs)/home.tsx`

Estado: OK local, QA runtime pendiente.

Observaciones:

- La CTA principal "Lanza la ronda" esta arriba y se repite como boton memorable.
- Empty state sin grupos envia a `groups`.
- Empty state sin rondas activas envia a `launch`.
- Mini ranking da contexto social sin parecer dashboard complejo.

Riesgos:

- Home mantiene `map` para bloques acotados de rondas activas y los 3 primeros grupos. Las listas mas largas de ranking y momentos ya usan `FlatList`.

## Grupos

Archivos:

- `app/(tabs)/groups.tsx`
- `app/modals/create-group.tsx`
- `app/modals/join-group.tsx`
- `app/group/[groupId].tsx`

Estado: mejorado localmente, QA Supabase pendiente.

Observaciones:

- Crear y unirse estan disponibles como modal y como formularios inline.
- Validacion UI: nombre 2-40 caracteres; codigo minimo 4.
- El detalle permite copiar enlace, lanzar ronda y silenciar grupo.

Acciones:

- Anadido empty state explicito en "Mis grupos".
- Anadido loading/error/empty state para rondas recientes del detalle de grupo.

Pendiente:

- Probar que `create_group` y `join_group_by_invite` invalidan cache y navegan correctamente con datos reales.

## Lanzar Ronda

Archivos:

- `app/(tabs)/launch.tsx`
- `src/features/rounds/components/moment-camera.tsx`
- `src/features/rounds/components/moment-composer.tsx`
- `src/features/rounds/api.ts`
- `src/lib/images.ts`

Estado: mejorado localmente; QA dispositivo pendiente.

Observaciones:

- Si no hay grupos, muestra CTA para ir a grupos.
- Si hay un unico grupo, quedaba preseleccionado con el contexto visible.
- Si hay varios, la seleccion es clara por cards.
- Camera/preview/composer existen.
- Bebida es opcional y no puntua.

Acciones:

- Preseleccion visible de unico grupo sin `setState` en effect.
- `MomentComposer` muestra error persistente de upload/RPC, no solo toast.
- Creacion de ronda + primer momento pasa por RPC transaccional `create_round_with_moment`.

Pendiente:

- Probar permisos de camara/galeria, compresion, upload a Storage y navegacion al detalle con dispositivo real.

## Ronda Detalle

Archivos:

- `app/round/[roundId].tsx`
- `src/features/rounds/components/moment-card.tsx`
- `src/components/rondas/star-button.tsx`
- `src/components/rondas/reaction-dock.tsx`
- `src/features/rounds/api.ts`

Estado: mejorado localmente; QA multiusuario pendiente.

Observaciones:

- Header muestra estado, cuenta atras y creador.
- Permite subir foto-respuesta si la ronda esta abierta.
- Momentos muestran imagen, autor, caption, bebida opcional, reacciones, Estrella de la ronda, report/block/delete.
- Empty state cuando no hay momentos.

Acciones:

- `StarButton` tiene estado "Ronda cerrada" deshabilitado.
- `MomentCard` deshabilita Estrella de la ronda si la ronda expiro.
- API rechaza reaccionar/votar si la ronda ya expiro.
- Migracion RLS restringe delete de reacciones/Estrellas a rondas activas.

Pendiente:

- Verificar contadores y winner con dos usuarios reales.

## Ranking

Archivos:

- `app/(tabs)/ranking.tsx`
- `src/features/ranking/api.ts`
- `src/components/ranking/ranking-podium.tsx`
- `src/components/ranking/ranking-list-item.tsx`
- `supabase/migrations/20260706174227_rondapp_mvp_init.sql`

Estado: OK local, QA con datos reales pendiente.

Observaciones:

- Copy indica que la bebida no puntua.
- Tiene selector de grupo, podio y lista.
- Tiene empty state si no hay actividad.
- Formula vive en RPC `get_weekly_leaderboard`; no usa `drink_type`.

Pendiente:

- Probar la formula con datos reales y cerrar rondas.

## Perfil y Settings

Archivos:

- `app/(tabs)/profile.tsx`
- `app/settings.tsx`
- `app/privacy.tsx`
- `app/terms.tsx`
- `app/community-guidelines.tsx`
- `app/support.tsx`
- `app/delete-account.tsx`

Estado: OK minimo para tienda, texto legal base pendiente de revision legal.

Observaciones:

- Perfil evita quedar completamente vacio con avatar por inicial y fallback.
- Muestra reglas, ajustes, privacidad, terminos y logout.
- Muestra soporte desde perfil/ajustes.
- Incluye flujo visible de borrado de cuenta con doble confirmacion.
- En desarrollo muestra debug env; queda oculto en production.

Pendiente:

- Verificar el buzon `soporte@rondapp.app`.
- Desplegar y probar la Edge Function `delete-account` con cuenta de prueba.

## Moderacion

Archivos:

- `app/modals/report.tsx`
- `src/features/moderation/api.ts`
- `src/features/moderation/hooks.ts`
- `supabase/migrations/20260706174227_rondapp_mvp_init.sql`

Estado: MVP presente, QA multiusuario pendiente.

Observaciones:

- Reportar momento existe.
- Bloquear usuario esta expuesto desde cada `MomentCard`.
- RLS oculta momentos de usuarios bloqueados.
- Reports se seleccionan para ocultar momentos reportados por el viewer.

Pendiente:

- Probar reporte duplicado, threshold de 3 reports y bloqueo mutuo.

## Mobile UX y accesibilidad

Estado: DONE_LOCAL_WITH_EXTERNAL_BLOCKERS.

Cumple:

- Root screens usan `Screen`, que centraliza fondo/safe areas.
- Tap targets principales usan `Button`, `FloatingRondaButton` o chips con altura minima.
- Loading/error/empty states existen en flujos principales.
- Errores principales usan mensajes humanos.

Mejorado:

- `StarButton` incluye `accessibilityRole`, `accessibilityLabel` y `accessibilityState`.
- `ReactionChip` anuncia label, contador y estado seleccionado/deshabilitado.
- `GlassButton` expone estado disabled/busy.
- Los motivos del modal de reporte exponen role, label y selected.
- Estados vacios de grupos y detalle de grupo anadidos.
- Onboarding compactado tras QA visual movil para acercar CTAs en el primer viewport.
- Ranking y ronda detalle pasaron a `FlatList` para evitar renderizar listas largas completas dentro de `ScrollView`.

Pendiente:

- Capturas en iPhone SE/Android pequeno.
- Auditoria de lector de pantalla en dispositivo fisico.
- Revisar que todos los icon-only buttons tengan labels si se anaden mas adelante.

## Conclusiones

La app ya tiene forma de producto social mobile-first, con lenguaje y arquitectura coherentes. No se puede afirmar "release candidate final" hasta cerrar QA real con Supabase remoto, credenciales OAuth, build interna y dos usuarios. El codigo queda mas cerca de tienda porque los flujos criticos tienen estados visibles, bloqueos de ronda cerrada y documentacion de pasos externos.
