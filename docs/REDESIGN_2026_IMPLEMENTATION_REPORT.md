# Rondapp 2026 - Informe de implementacion

> **HISTÓRICO — corte previo al beta 2026-07-13.** Conservado como registro de trabajo; sus
> conclusiones no validan el contrato beta actual.

Fecha: 9 de julio de 2026  
Direccion visual: Ronda Nova

## Resumen

Rondapp deja de usar una composicion repetida de cards glass y pasa a una experiencia social
mobile-first. La fotografia lidera Home, ronda y momentos; el vidrio queda reservado a controles,
heroes y paneles cortos. Se conservaron rutas, hooks, contratos de Supabase, RLS y reglas de
puntuacion.

## Sistema visual

- Tokens por roles para background, surface, accent, text, border, status, overlay, glow y tint.
- Jerarquia tipografica completa: display, h1, h2, h3, body, bodyStrong, bodySmall, caption,
  button, stat y overline.
- Duraciones de 120, 220, 360 y 560 ms, con springs press, soft y celebrate.
- Radios, espaciado, sombras y glass revisados.
- `RondaNovaBackground` con variantes auth, home, group, launch, round, ranking, profile y modal.
- Contenido de app limitado a 760 px en web; movil conserva ancho completo.

## Componentes nuevos

- `AuthScaffold`.
- `RondaNovaBackground` y `AnimatedBrandMark`.
- `ActiveRoundHero`.
- `Icon` y `SettingsRow`.
- `Skeleton` con pulse y fallback de movimiento reducido.
- `ParallaxScrollScreen`, `ParallaxHeader`, `ParallaxHeroImage`, `ParallaxCard` y `FloatingLayer`.
- Tokens `parallax`.
- Script efimero `qa:visual:seed` para validar estados autenticados sin guardar credenciales.

## Componentes refactorizados

- `AppScreen` ahora gestiona teclado, refresh, ancho web y variantes Ronda Nova.
- `AnimatedPressable` usa Reanimated spring y haptic multiplataforma con guarda web.
- `GlassCard` usa `dimezisBlurViewSdk31Plus` y fallback de surface en Android antiguo.
- `GlassButton`, `GlassInput`, `IconButton` y `GlassTabBar` tienen jerarquia y foco consistentes.
- `GlassTabBar` incorpora indicador animado y accion Launch reconocible.
- `RoundCard` usa preview real del primer momento.
- `MomentCard` elimina blur por item, pone foto primero y relega moderacion.
- `ReactionChip` usa iconos reales y pop corto.
- `StarButton` incorpora estados, haptic y shine breve.
- `RankingPodium` adopta orden visual 2-1-3.
- Loading, empty y error states se adaptaron al nuevo sistema.

El antiguo `RondaGradientBackground` se conserva solo como alias compatible hacia
`RondaNovaBackground`; no mantiene implementacion duplicada.

## Pantallas redisenadas

- Onboarding.
- Login, registro, check email, age gate, complete profile y callback.
- Home.
- Grupos, crear grupo, unirse con codigo, invitacion profunda y detalle de grupo.
- Launch, permiso de camara, camara y composer.
- Detalle de ronda, MomentCard y detalle de momento.
- Ranking.
- Perfil y ajustes.
- Reportar y borrar cuenta.
- Soporte, normas, privacidad y terminos.

## Datos y backend

- No se modificaron migraciones, RLS, Edge Functions ni reglas de puntuacion.
- `listActiveRounds` y `listRecentRounds` incluyen el primer `image_path` de la relacion
  `moments!moments_round_id_fkey` y generan una signed URL para el preview visual.
- `RoundWithRelations` incorpora `preview_url` y `moment_count` opcionales.
- Se corrigio el formateo local de `toISODate`; evitaba que una zona horaria positiva mostrara y
  consultara el domingo cuando el inicio semanal era lunes.
- La metadata de bebida se sigue tratando como opcional y nunca puntua.

## Assets

- BrandMark rasterizado desde el SVG existente para que renderice igual en iOS, Android y web.
- Foto social Ronda Nova generada para onboarding y fallback de hero.
- La foto se guarda como JPEG de 141 KB; la primera version PNG de 1.9 MB se elimino del bundle.

## Librerias

- `lucide-react-native`: iconos consistentes en iOS, Android y Expo Web.
- `react-native-svg`: runtime compatible requerido por Lucide, instalado mediante Expo.

Se sustituyeron los SF Symbols usados como unica fuente de iconos porque quedaban vacios en web.
No se anadieron fuentes, Lottie, Skia ni dependencias de animacion adicionales.

## Decisiones visuales

- Una accion primaria por estado.
- Foto antes que metadata en Home, ronda y momento.
- Glass fuerte solo en heroes, controles y paneles pequenos.
- Surface solida en listas largas para evitar blur por item.
- Tab bar flotante estable con cinco destinos; Launch usa coral y apertura de camara.
- Podio social con numeros grandes y lista compacta, no tabla.
- Auth oculta proveedores desactivados y no expone instrucciones tecnicas de Supabase.
- Reportar y borrar no usan celebracion ni parallax.

## Riesgos y pendientes

- Blur, haptics, camara y safe areas se validaron por codigo/export, pero requieren una ultima
  pasada en iPhone y Android fisicos antes de tienda.
- Apple continua oculto mientras el proveedor remoto no este activo.
- La signed URL del preview dura una hora; React Query conserva y refresca la consulta segun el
  flujo actual.
- La foto social incluida es un fallback de producto; los momentos reales siempre vienen de
  Supabase Storage.
- No se anadio un bottom sheet pesado. Crear/unirse/reportar siguen siendo modales nativos de
  Expo Router con superficies compactas.

## Resultado tecnico

- TypeScript: PASS.
- ESLint: PASS.
- Release static QA: PASS.
- Expo Doctor: 20/20 PASS.
- Deno check Edge Functions: PASS.
- Export web/iOS/Android: PASS.
- `git diff --check`: PASS.
- `qa:release:local`: PASS.
