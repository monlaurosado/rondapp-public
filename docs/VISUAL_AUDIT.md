# Visual Audit - Rondapp

> **HISTÓRICO — corte previo al beta 2026-07-13.** Se conserva como contexto de diseño; no
> describe la UI actual ni cuenta como evidencia visual vigente. Ver `BETA_READINESS.md`.

Fecha: 2026-07-06

## Evidencia revisada

- Rutas en `app/`.
- Componentes UI en `src/components/ui/`.
- Componentes de rondas en `src/features/rounds/components/`.
- Estado accesible sin sesion en web: onboarding/login.
- Pantallas privadas auditadas por codigo porque requieren sesion y datos reales.

## Diagnostico general

La app ya tiene una base oscura y funcional, pero visualmente sigue pareciendo una app React Native generica con tema oscuro: cards planas, botones estandar, iconografia minima, poca profundidad, formularios tristes y casi ninguna personalidad propia. Hay intentos de acento ambar y copy correcto, pero todavia no existe una identidad visual completa ni un sistema glass real.

Lo que se debe conservar:

- Flujos funcionales.
- Jerarquia basica por tabs.
- Copy que evita incentivar consumo.
- Tokens centralizados actuales como punto de partida.

Lo que se debe reemplazar:

- `Card`, `Button`, `Screen`, `TextField` como piezas visuales principales.
- Estados loading basados en spinner.
- Ronda/Momento/Ranking con layout de lista.
- Tab bar pegada y plana.
- Onboarding tipo lista de cards.

## Pantallas actuales

| Pantalla | Problemas visuales | Problemas UX | Generico / web | Redisenar |
| --- | --- | --- | --- | --- |
| Onboarding | Hero pobre, cards apiladas, sin marca ni motion | Mucha lectura y poco impacto emocional | Parece landing web movil | Completo |
| Login | Formulario basico, sin BrandMark, inputs sin glass | No comunica calidad ni seguridad | Form card generica | Completo |
| Registro | Igual que login, sin promesa visual | Error inline correcto pero seco | Formulario web | Completo |
| Check email | Funcional, pero sin estado visual memorable | Reenvio claro; falta confirmacion grafica | Card informativa comun | Completo |
| Age gate | Necesita sentirse serio/adulto sin moralina | CTA debe ser bottom-friendly | Probable card informativa | Completo |
| Complete profile | Inputs secos, sin preview de avatar/perfil | Falta preview del resultado | Formulario web | Completo |
| Home | Mejorada, pero hero sigue siendo card; no hay fondo vivo | Muestra datos, pero no vende la accion central | Dashboard simple | Completo |
| Grupos | Mezcla acciones duplicadas y formularios inline | Crear/unirse compiten con lista | Admin panel movil | Completo |
| Crear grupo modal | Correcto pero austero | Falta preview de grupo y color/avatar | Modal formulario | Completo |
| Join group modal | Correcto pero sin identidad | Puede ser una bottom sheet mas directa | Modal formulario | Parcial |
| Grupo detalle | Header plano, miembros como lista simple | Invitar/lanzar no tienen jerarquia premium | Pantalla de ajustes | Completo |
| Lanzar ronda | Selector de grupo es lista de cards | Accion central no se siente especial | Wizard basico | Completo |
| Camara | Funcionalidad manda; UI debe integrarse con marca | Necesita controles thumb-friendly | Nativo simple | Parcial |
| Preview/Moment composer | Foto protagonista, pero controles/form sin glass | CTA debe ser sticky y potente | Form bajo imagen | Completo |
| Ronda detalle | Experiencia social central no se siente central | Reacciones y Estrella de la ronda compiten como botones planos | Feed lineal simple | Completo |
| MomentCard | Imagen grande correcta; acciones demasiado basicas | Bloquear/reportar muy visibles frente a reaccionar | Card social generica | Completo |
| Moment detail | Debe ser inmersivo; auditar implementacion al aplicar | Falta foco en foto y acciones clave | Puede parecer detalle web | Completo |
| Ranking | Mejorado con badges, pero no hay podio real | No separa 1.º esta semana de lista | Lista de leaderboard | Completo |
| Perfil | Correcto; debug visible en dev; poco aspiracional | Logout no debe dominar | Settings/profile generico | Completo |
| Ajustes/Legal/Normas | Texto simple; aceptable para MVP | Legibilidad y safe area importan | Documento web | Parcial |
| Report modal | Funcional, pero debe sentirse seguro y claro | Motivos deben ser faciles de tocar | Formulario modal | Parcial |
| Missing env/Error boundary/Toast | Existen, pero visualmente no pertenecen aun a marca | Necesitan glass/error states propios | Dev utility | Parcial |

## Componentes que sobran o deben bajar de nivel

- `Card`: debe dejar de ser la unidad visual dominante y convertirse en `GlassCard`.
- `Button`: debe dividirse en `PrimaryButton`, `GlassButton`, `IconButton` y `FloatingRondaButton`.
- `TextField`: debe convertirse en `GlassInput`.
- `LoadingState`: debe dejar de depender de spinner y sumar skeleton/shimmer.
- `RoundCard`: necesita imagen/placeholder atmosferico, overlay, stats y press feedback.
- `MomentCard`: necesita `ReactionDock` y `StarButton`.

## Jerarquia confusa

- Home: "Lanzar ronda" no es suficientemente memorable.
- Grupos: crear/unirse aparece dos veces, como CTA y como formulario inline.
- Ronda detalle: reportar/bloquear/borrar compiten visualmente con reaccionar y asignar la Estrella.
- Ranking: puntuacion y breakdown tienen el mismo peso visual; falta podio.
- Perfil: debug/build compite en dev con contenido de usuario.

## Patrones que parecen web

- Formularios apilados dentro de cards.
- Cards con borde plano y mismo radio.
- Listas verticales sin composicion visual.
- Texto explicativo largo en onboarding.
- Tab bar pegada al borde inferior.
- Estados vacios centrados sin ilustracion/mark propio.

## Oportunidades de animacion

- Entrada escalonada de cards en Home, Ranking y Grupos.
- Press scale con haptics en acciones principales.
- Glow sutil permanente en `FloatingRondaButton`.
- Pop de reaction chips.
- Burst sobrio al dar su Estrella de la ronda.
- Podio de ranking con entrada vertical.
- Shimmer en loading states.
- Modal slide + blur.
- Tab active glow.

## Pantallas que requieren rediseño completo

Onboarding, Login, Registro, Check email, Age gate, Complete profile, Home, Grupos, Crear grupo, Grupo detalle, Lanzar ronda, Preview/Moment composer, Ronda detalle, MomentCard, Ranking y Perfil.

## Decision de direccion

La solucion no es "mas cards oscuras". Rondapp necesita un territorio visual propio: fondo nocturno con luz ambiental, glass legible, fotografia protagonista, acentos ambar/coral/lima, microinteracciones y un boton de ronda reconocible.
