# Brand Deck - Rondapp

## 1. Esencia de marca

**Nombre:** Rondapp.

**Categoria:** red social privada de rondas y momentos.

**Idea central:** un gesto social que enciende al grupo: alguien lanza una ronda, el grupo responde con fotos, reacciones y una Estrella de la ronda.

**Promesa:** convertir momentos espontaneos de grupos privados en un ritual visual, divertido y semanal, sin premiar consumo.

**Frase conceptual:** Lanza la ronda. Enciende el grupo.

**Posicionamiento:** No gana quien mas bebe. Gana quien mas momentos crea.

**Personalidad:**

- Nocturna, calida y social.
- Premium sin ser distante.
- Rapida, picara y clara.
- Adulta, no solemne.
- Competitiva de forma sana.

**Tono:**

- Corto.
- Cercano.
- Seguro.
- Con energia de grupo.
- Nunca moralista.

**Somos:**

- Grupos privados.
- Fotos espontaneas.
- Ritual social.
- Pique sano.
- Estrella de la ronda como voto especial.
- Ranking por actividad y calidad social.

**No somos:**

- Clasificaciones basadas en consumo.
- Feed publico.
- Casino social.
- Discoteca cutre.
- App infantil.
- Dashboard SaaS.
- Copia de BeReal, Instagram o Apple.

**Principios de diseno:**

1. La accion principal siempre se reconoce.
2. La foto manda; la bebida es contexto.
3. Glass solo si mejora profundidad y foco.
4. Contraste antes que efecto.
5. Motion rapido, elastico y sobrio.
6. Interfaces de pulgar: botones grandes y zonas inferiores utiles.
7. Ranking visual, nunca tabla.
8. Privado por defecto, social por sensacion.

## 2. Territorio visual

**Nombre:** Afterglow Glass.

**Idea:** una interfaz oscura, liquida y brillante, con vidrio calido, reflejos de bar, luces ambar, neones suaves y capas flotantes sobre una noche viva.

**Mood visual:**

- Noche calida despues del primer brindis.
- Barra moderna con luz baja.
- Cristal con reflejos.
- Flash de camara y destello ganador.
- Grupo alrededor de una mesa, no escenario publico.

**Palabras clave:**

Afterglow, glass, amber, vermouth, flash, orbit, night, warm neon, private ritual, spontaneous photo.

**Referencias abstractas:**

- Reflejo de copa sobre mesa oscura.
- Halo de farola calida en terraza.
- Flash suave de camara movil.
- Tres personas orbitando una chispa social.
- Papel fotografico oscuro con overlay de cristal.

**Formas:**

- Pildoras grandes.
- Circulos orbitales.
- Tarjetas glass con radio amplio.
- Chips compactos.
- Bursts radiales pequeños para Estrella de la ronda.

**Texturas:**

- Superficies translúcidas.
- Ruido sutil opcional, nunca protagonista.
- Bordes con highlight superior.
- Sombras profundas y blandas.

**Fondos:**

- Base Ink Black.
- Gradientes radiales Deep Vermouth / Amber Glow.
- Luces ambientales fuera del centro.
- Variantes por pantalla, no fondos planos.

**Uso de blur:**

- En tab bar, cards destacadas, modales y paneles.
- No en todo el contenido.
- Siempre con fondo semitransparente y borde.
- Android debe tener fallback con opacidad y borde.

**Uso de luz:**

- Ambar para accion principal.
- Coral para energia y Estrella de la ronda.
- Lima para exito/actividad.
- Ice Blue solo para estados frios/secundarios.

**Profundidad:**

- Fondo vivo.
- Capa glass.
- Contenido legible.
- Accion principal con glow.

## 3. Paleta de color

```ts
colors.background.base = "#07080D"        // Ink Black
colors.background.raised = "#11101A"      // Night Plum
colors.background.deep = "#1A0F17"        // Deep Vermouth
colors.glass.surface = "rgba(255,244,215,0.08)"
colors.glass.surfaceStrong = "rgba(255,244,215,0.14)"
colors.glass.stroke = "rgba(255,244,215,0.18)"
colors.glass.strokeWarm = "rgba(255,177,59,0.34)"
colors.text.primary = "#F8F5EF"           // Soft White
colors.text.secondary = "#D8D0C4"
colors.text.muted = "#A9A093"             // Muted Sand
colors.text.inverse = "#07080D"
colors.accent.primary = "#FFB13B"         // Amber Glow
colors.accent.secondary = "#FF5A3D"       // Aperol Flame
colors.accent.spark = "#B8FF5C"           // Lime Spark
colors.accent.ice = "#BFEAFF"             // Ice Blue Glass
colors.state.success = "#B8FF5C"
colors.state.error = "#FF4D5E"            // Danger Coral
colors.state.warning = "#FFD166"
colors.shadow.deep = "rgba(0,0,0,0.45)"
colors.overlay.photo = "rgba(7,8,13,0.52)"
```

**Gradientes:**

- App base: `#07080D -> #11101A -> #1A0F17`.
- Auth glow: ambar radial arriba, coral radial abajo.
- Home glow: ambar + lima muy sutil.
- Ranking glow: ambar central + ice blue lateral.
- Danger overlay: coral con opacidad baja.

## 4. Tipografia

Decision MVP: usar system font bien configurada para no bloquear Expo ni builds. Preparar tokens para futura Space Grotesk/Inter con `expo-font`.

Escala:

- Display: 40/44, weight 900, para marca y hero.
- H1: 34/39, weight 850.
- H2: 26/32, weight 800.
- H3: 20/26, weight 750.
- Body: 16/23, weight 400.
- Body small: 14/20, weight 400.
- Caption: 12/16, weight 600, uppercase opcional.
- Button: 15/18, weight 800.
- Stat number: 36/40, weight 900, tabular nums.
- Badge: 12/16, weight 800.

Reglas:

- No escalar texto con viewport.
- No usar letter spacing negativo.
- Numeros con `fontVariant: ["tabular-nums"]`.
- Titulares cortos y con accion.

## 5. Iconografia

Familia elegida: SF Symbols via `expo-image` (`source="sf:name"`) porque ya esta disponible y encaja con Expo.

Estilo:

- Lineal o filled segun estado.
- Redondeado.
- Un solo color base por estado.
- Activo con glow o fondo pill.

Iconos clave:

- Ronda: `camera.aperture`, `sparkles`.
- Grupo: `person.3.fill`.
- Camara: `camera.fill`.
- Ranking: `chart.bar.fill`, `trophy.fill`.
- Estrella de la ronda: `bolt.fill`, `sparkles`.
- Perfil: `person.crop.circle.fill`.
- Notificacion: `bell.fill`.
- Invitar: `square.and.arrow.up`.

## 6. Logo provisional

Concepto: una `R` dentro de un cristal circular con tres puntos orbitando una chispa central. Representa grupo, ronda y Estrella de la ronda sin usar copas ni emojis.

Entregables:

- `assets/brand/rondapp-mark.svg`
- `assets/brand/rondapp-wordmark.svg`
- `src/components/ui/BrandMark.tsx`

Reglas:

- Usar como marca provisional.
- No convertirlo en emoji.
- Mantener contraste sobre fondo oscuro.
- Usar version compacta en auth/onboarding y loading.

## 7. Sistema glass

Variantes:

- `GlassCard`: contenido principal, blur medio, borde suave, sombra.
- `GlassPanel`: grupos de controles, blur bajo, borde frio.
- `GlassTabBar`: blur alto, flotante, pill activa.
- `GlassModal`: fondo fuerte + blur + slide.
- `GlassActionButton`: ambar/coral, glow, haptic.
- `GlassInput`: superficie oscura translucida, foco ambar.

Reglas:

- Texto pequeño nunca va directo sobre foto sin overlay.
- No poner glass encima de glass sin separacion o borde.
- CTA primario siempre conserva contraste aunque falle blur.
- Blur es profundidad, no decoracion.
- Android fallback: fondo opaco translúcido + borde + sombra.

## 8. Motion brand

Personalidad:

- Rapida.
- Elastico corto.
- Suave.
- No tragaperras.

Animaciones:

- Cards: fade + translateY 10-16px.
- Botones: press scale 0.97 y spring.
- Estrella de la ronda: burst radial sobrio, 400-600ms.
- Reacciones: pop 0.9 -> 1.08 -> 1.
- Tabs: icon glow y pill activa.
- Modales: fade + slide desde abajo.
- Ranking: podio aparece de centro a laterales.
- Loading: skeleton shimmer calido.

Reduced motion:

- Reemplazar springs por fade.
- Quitar burst/particles.
- Mantener cambios de color/estado.

## 9. Voz y microcopy

Usar:

- Lanza la ronda.
- Enciende el grupo.
- Estrella de la ronda.
- Rondas activas.
- Tu grupo todavia esta tranquilo.
- Crea la primera ronda.
- Invita a tu gente.
- La foto de la noche se decide aqui.
- 1.º esta semana.
- Aun no hay movimiento.
- Haz que empiece la ronda.

No usar:

- Títulos personales basados en consumo.
- Retos, comparaciones o clasificaciones de bebidas.
- Cualquier copy que premie consumo.
