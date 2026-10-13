# Redesign Report - Rondapp

> **HISTÓRICO — corte previo al beta 2026-07-13.** Describe una iteración anterior del
> rediseño; no sustituye la QA visual vigente pendiente.

Fecha: 2026-07-06

## Resumen

Se creo una identidad visual completa para Rondapp basada en **Afterglow Glass** y se aplico a la app: fondos nocturnos con luz ambiental, glass legible, marca provisional, tab bar flotante, CTA principal memorable, cards sociales, ranking con podio y estados empty/loading/error brandizados.

No se rehicieron backend, Supabase ni reglas de producto salvo lo necesario para integrar el nuevo sistema visual.

## Pantallas redisenadas

- Onboarding: marca, badges, cards glass y CTA premium.
- Login y registro: formularios glass, RondaLogo, error states y CTAs claros.
- Check email, age gate y complete profile: tono visual coherente con auth.
- Home: fondo Afterglow, rondas activas, grupos, ranking resumido y `FloatingRondaButton`.
- Grupos: layout con glass y acciones tactiles.
- Crear grupo y unirse a grupo: modales visualmente integrados.
- Grupo detalle: header visual, miembros, rondas y CTAs.
- Lanzar ronda: accion principal con boton flotante y selector integrado.
- Ronda detalle: header social, momentos, reacciones, Estrella de la ronda y CTA de foto-respuesta.
- Ranking: podio top 3, stats y lista visual.
- Perfil/settings: avatar, stats, grupos y acciones secundarias.
- Estados de sistema: missing env, loading, empty y error usan el sistema nuevo.

## Componentes creados

Design:

- `src/design/colors.ts`
- `src/design/spacing.ts`
- `src/design/radius.ts`
- `src/design/shadows.ts`
- `src/design/typography.ts`
- `src/design/motion.ts`
- `src/design/glass.ts`
- `src/design/tokens.ts`
- `src/design/theme.ts`
- `src/design/use-reduced-motion.ts`

UI:

- `AppScreen`, `AppText`, `GlassCard`, `GlassPanel`, `GlassButton`, `PrimaryButton`, `IconButton`, `GlassInput`
- `Avatar`, `Badge`, `Chip`, `ReactionChip`, `FloatingRondaButton`
- `EmptyState`, `LoadingState`, `ErrorState`, `AnimatedPressable`, `BrandMark`

Brand:

- `RondaGradientBackground`
- `AmbientGlow`
- `LiquidOrb`
- `RondaLogo`
- `assets/brand/rondapp-mark.svg`
- `assets/brand/rondapp-wordmark.svg`

Navigation:

- `GlassTabBar`

Rondas:

- `RoundCard`
- `StarButton`
- `ReactionDock`
- `RoundStatusPill`

Ranking:

- `RankingPodium`
- `RankingListItem`
- `StatGlassCard`

## Librerias instaladas

Se instalaron con Expo:

```bash
npx expo install expo-blur expo-linear-gradient
```

Librerias ya presentes y utilizadas por el rediseño:

- `react-native-reanimated`
- `expo-haptics`
- `expo-image`
- `react-native-safe-area-context`

No se introdujeron assets pesados ni imagenes remotas como base de UI.

## Decisiones visuales

- Tema principal oscuro. No se implementa modo claro porque Rondapp esta posicionada como experiencia nocturna.
- System font por ahora para mantener compatibilidad Expo y evitar bloqueo de carga de fuentes.
- Marca provisional basada en `R` glass + puntos orbitales, no emojis ni copas.
- Paleta ambar/coral/lima/ice con roles semanticos.
- Glass aplicado a contenedores relevantes, no a toda la pantalla.
- La bebida se mantiene como contexto opcional, nunca como unidad competitiva.
- El ranking pasa de lista plana a podio + lista.
- `FloatingRondaButton` se convierte en el gesto reconocible de la app.
- `RondaLogo` se hizo responsive para no cortar el claim en 320px.

## Riesgos de rendimiento

- `BlurView` puede ser mas costoso en Android y web; por eso cada superficie tiene background/border fallback.
- Muchos glows simultaneos pueden penalizar dispositivos antiguos; mantenerlos en fondos y CTAs principales.
- Reanimated en web puede capturarse durante animaciones iniciales; para QA visual hay que esperar a que terminen.
- Imagenes de momentos reales deben optimizarse con `expo-image` y dimensiones controladas.
- Evitar blur dentro de listas largas; usar `surfaceStrong` sin blur si se detecta jank.

## Pendiente recomendado

- Probar en iOS Simulator y Android Emulator reales con cuenta Supabase y datos.
- Revisar todas las pantallas privadas con datos reales de grupos, rondas y momentos.
- Conectar assets de foto reales para validar overlays y contraste sobre imagen.
- Evaluar Space Grotesk + Inter con `expo-font` si se quiere una identidad tipografica mas fuerte.
- Hacer una segunda pasada de motion en dispositivos fisicos.
- Revisar accesibilidad de contraste con capturas reales y escalado de texto del sistema.

## Como probar visualmente

Checks estaticos:

```bash
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform all --output-dir /tmp/rondapp-export
```

Render web local:

```bash
npx serve -s /tmp/rondapp-export -l 8099
npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 http://127.0.0.1:8099/onboarding /tmp/rondapp-onboarding-mobile.png
npx playwright screenshot --viewport-size=320,568 --wait-for-timeout=3000 http://127.0.0.1:8099/onboarding /tmp/rondapp-onboarding-small.png
```

QA manual recomendado:

- Abrir onboarding, login, register, home, groups, group detail, launch, round detail, ranking y profile.
- Revisar 320px, 390px y pantallas altas.
- Confirmar que el tab bar no tapa CTAs.
- Confirmar que textos en cards glass siguen legibles.
- Verificar haptics en dispositivo fisico.
- Probar reduced motion en ajustes del sistema.
