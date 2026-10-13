# Design System - Rondapp

Fecha: 2026-07-06

## Territorio

El sistema visual implementa **Afterglow Glass**: base nocturna, luces ambar/coral/lima, capas glass con bordes calidos, profundidad suave y acciones tactiles grandes. La UI debe sentirse social, privada, premium y movil, no como dashboard web.

La fuente de verdad conceptual esta en `docs/BRAND_DECK.md`. Este documento describe como se implementa en codigo.

## Tokens

Los tokens viven en `src/design/`:

- `colors.ts`: roles semanticos para fondos, glass, texto, acentos, estados y overlays.
- `spacing.ts`: escala de espaciado basada en 4/8px.
- `radius.ts`: radios consistentes para pills, cards y panels.
- `shadows.ts`: sombras glass, glow ambar y elevacion.
- `typography.ts`: escala display, h1, h2, h3, body, caption, button y stat.
- `motion.ts`: duraciones, springs, escalas y delays.
- `glass.ts`: presets de superficies glass.
- `theme.ts` y `tokens.ts`: agregadores para imports estables.
- `use-reduced-motion.ts`: puente para respetar reduce motion.

## Paleta

Roles principales:

```ts
colors.background.base       // Ink Black
colors.background.raised     // Night Plum
colors.background.deep       // Deep Vermouth
colors.glass.surface         // cristal base
colors.glass.surfaceStrong   // cristal de mayor contraste
colors.glass.surfaceSubtle   // cristal secundario
colors.glass.stroke          // borde frio/suave
colors.glass.strokeWarm      // borde ambar
colors.glass.highlight       // brillo superior
colors.text.primary          // Soft White
colors.text.secondary        // lectura secundaria
colors.text.muted            // texto apagado, nunca para informacion critica
colors.accent.primary        // Amber Glow
colors.accent.secondary      // Aperol Flame
colors.accent.spark          // Lime Spark
colors.accent.ice            // Ice Blue Glass
colors.state.success
colors.state.error
colors.state.warning
```

Reglas:

- El fondo principal siempre parte de `colors.background.base`.
- Los CTAs principales usan `gradients.action`.
- El coral se usa para energia, errores o Estrella de la ronda; no para consumo.
- El lima se reserva para actividad, exito o acentos de ranking.
- No repartir colores hardcodeados salvo estados puntuales heredados.

## Tipografia

MVP: system font con pesos fuertes. Se evita instalar fuentes hasta que el producto necesite una capa tipografica mas marcada.

- `display`: marca o momentos hero.
- `h1`: titulos de pantalla.
- `h2`: secciones principales.
- `h3`: cards y headers compactos.
- `body`: lectura normal.
- `bodySmall`: apoyo y claims compactos.
- `caption`: labels, badges y metadata.
- `button`: CTAs.
- `stat`: numeros grandes de ranking.

Reglas:

- No usar `vw` ni escalar texto por viewport.
- `letterSpacing` debe permanecer en `0`.
- En contenedores estrechos, envolver texto antes de reducir legibilidad.
- `RondaLogo` usa bloque flexible para no cortar el claim en 320px.

## Componentes UI

Los ficheros siguen kebab-case por convencion Expo/React Native; las exports son los nombres de componente del sistema:

- `AppScreen`: wrapper con `RondaGradientBackground`, scroll, safe area y padding inferior para tab bar flotante.
- `AppText`: texto tokenizado.
- `GlassCard`: card glass con variantes `default`, `strong`, `subtle`, `danger`, `highlight`.
- `GlassPanel`: panel glass para grupos de controles.
- `GlassButton`, `PrimaryButton`, `IconButton`: acciones tactiles.
- `GlassInput`: input con superficie glass, label y error.
- `Avatar`, `Badge`, `Chip`, `ReactionChip`: elementos sociales compactos.
- `FloatingRondaButton`: CTA principal de lanzar ronda con glow y haptics.
- `EmptyState`, `LoadingState`, `ErrorState`: estados brandizados.
- `AnimatedPressable`: press scale con reduced motion.
- `BrandMark`: marca provisional en React Native.

Wrappers heredados:

- `src/components/ui/card.tsx` ahora delega en `GlassCard`.
- `button.tsx` delega en `GlassButton`.
- `text.tsx` delega en `AppText`.
- `text-field.tsx` delega en `GlassInput`.
- `screen.tsx` delega en `AppScreen`.

## Componentes Brand

- `RondaGradientBackground`: variantes `default`, `auth`, `home`, `group`, `ranking`, `profile`.
- `AmbientGlow`: halos decorativos controlados.
- `LiquidOrb`: pieza ambiental ligera.
- `RondaLogo`: mark + wordmark responsive.
- Assets: `assets/brand/rondapp-mark.svg` y `assets/brand/rondapp-wordmark.svg`.

## Navegacion

`GlassTabBar` reemplaza la tab bar plana:

- Flota sobre el contenido.
- Usa blur cuando esta disponible.
- Tiene borde y fondo fallback.
- La tab activa usa pill/glow.
- Expone cinco destinos: Inicio, Grupos, Cámara/Lanzar, Ranking y Perfil; ninguno se filtra.
- `AppScreen` reserva padding inferior para evitar que tape contenido.

## Rondas

- `RoundCard`: imagen/placeholder atmosferico, overlay, estado, metadata, stats y CTA.
- `MomentCard`: ahora usa glass, foto protagonista, `ReactionDock` y `StarButton`.
- `StarButton`: estados `give`, `selected` y `change`, más `disabled/loading`; usa los labels
  `Dar mi estrella`, `Tu estrella` y `Cambiar mi estrella` e incluye haptic y shine sobrio.
- `ReactionDock`: una selección activa por foto; otro emoji sustituye y el mismo retira.
- `ReactionDock`: chips de reaccion con pop.
- `RoundStatusPill`: estados claros sin parecer tabla.

## Ranking

- `RankingPodium`: top 3 visual.
- `RankingListItem`: lista posterior con posición, puntos y métricas descriptivas.
- `StatGlassCard`: stats compactas.

Regla: el ranking nunca debe volver a una tabla plana.

El selector de grupo es visible y puede recordar la última opción válida. Perfil añade
`Tus momentos por bebida` como bloque privado y neutro, nunca como ranking.

## Glass Rules

- Usar blur como profundidad, no como decoracion.
- Nunca poner texto pequeno sobre foto sin overlay.
- No apilar glass sobre glass sin borde, sombra o separacion clara.
- CTAs principales deben ser legibles aunque el blur falle.
- Android/web fallback: superficie semitransparente + borde + sombra.
- Evitar cards anidadas salvo items repetidos o modales.

## Motion Rules

- Press: escala 0.97 y spring.
- Cards: fade + translateY con stagger corto.
- Reacciones: pop 0.9 -> 1.08 -> 1.
- Estrella de la ronda: burst/shine sutil, sin efecto casino.
- Tab bar: active glow/pill.
- Loading: skeleton o marca animada, no spinner como unica UI.
- Reduced motion: sustituir movimientos fuertes por estados estables o fades simples.

## Ejemplos

```tsx
<Screen variant="home">
  <GlassCard variant="strong">
    <AppText variant="h1">Lanza la ronda</AppText>
    <AppText secondary>Enciende el grupo.</AppText>
  </GlassCard>
  <FloatingRondaButton label="Lanzar ronda" onPress={openLauncher} />
</Screen>
```

```tsx
<GlassInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
/>
```

## Que no hacer

- No crear pantallas blancas o cards planas nuevas.
- No usar tablas para ranking.
- No usar blur sin contraste.
- No hacer CTAs pequenos.
- No usar copy que premie beber.
- No meter imagenes remotas como base del UI.
- No duplicar estilos por pantalla si existe token o componente compartido.
- No introducir nuevas librerias visuales pesadas sin revisar Expo SDK.
