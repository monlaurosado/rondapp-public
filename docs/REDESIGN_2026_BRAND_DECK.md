# Rondapp 2026 - Mini brand deck

## Ronda Nova

Ronda Nova es la direccion visual de Rondapp: una red social privada para convertir el inicio de
un plan en un ritual facil de reconocer, fotografiar y compartir con el grupo.

## Esencia

**Nombre:** Rondapp.  
**Idea central:** alguien enciende el momento y el grupo lo completa.  
**Promesa:** abrir, lanzar y participar sin pensar en como funciona la app.  
**Personalidad:** cercana, nocturna, calida, espontanea y ligeramente elastica.  
**Tono:** frases cortas, humanas y concretas; celebracion sin exageracion.  
**Somos:** una red privada de grupos, fotos, reacciones, Estrella de la ronda y ranking social.
**No somos:** un feed publico, una app de consumo, una tabla competitiva ni una discoteca digital.

## Principios visuales

1. La foto es protagonista; el vidrio organiza controles y contexto.
2. Una accion primaria por pantalla o estado.
3. Fondo profundo, superficies legibles y acentos vivos con funcion.
4. Pocas capas grandes en vez de muchas tarjetas pequenas.
5. La identidad se reconoce por composicion, color y movimiento, no por repetir el logo.
6. El contenido comienza pronto y deja espacio a la zona del pulgar.

## Principios de motion

1. Movimiento rapido, elastico y corto.
2. Parallax solo para expresar profundidad entre hero y contenido.
3. Haptic y animacion confirman Lanzar, Estrella de la ronda, reaccionar y crear grupo.
4. Nunca bloquear una accion esperando una animacion.
5. Con movimiento reducido: parallax cero, transforms eliminados y fades breves.

## Principios de UX

1. La siguiente accion debe ser identificable en menos de dos segundos.
2. Auth y primer uso caben sin scroll innecesario en un movil pequeno.
3. El teclado nunca tapa la CTA.
4. Reportar, bloquear, silenciar y borrar existen, pero no dominan el contenido.
5. Bebida es metadata opcional y no recibe lenguaje de premio.
6. Estados vacios explican una salida concreta; errores conservan la entrada del usuario.

## Territorio visual

**Nombre:** Ronda Nova.

Palabras clave: social, nocturno, calido, vidrio, profundidad, foto, movimiento, cercania,
amistad, momento, ritual y facil.

La interfaz combina una noche casi negra con luz amber/coral, reflejos ice y un spark lime
puntual. No imita materiales de Apple, no usa neon continuo y evita el aspecto de dashboard.

## Paleta por roles

### Background

| Token | Valor | Uso |
| --- | --- | --- |
| `background.base` | `#06070B` | Base global y contraste principal |
| `background.elevated` | `#0D0D13` | Transicion bajo superficies |
| `background.deep` | `#120B18` | Profundidad plum |
| `background.warm` | `#1B1014` | Variantes sociales y de grupo |

### Surface

| Token | Valor | Uso |
| --- | --- | --- |
| `surface.glass` | `rgba(255, 241, 208, 0.075)` | Controles y paneles ligeros |
| `surface.glassStrong` | `rgba(255, 241, 208, 0.125)` | Hero controls y modal |
| `surface.card` | `#15141A` | Fallback Android/listas |
| `surface.modal` | `#1A171E` | Acciones criticas |

### Accent

| Token | Valor | Uso |
| --- | --- | --- |
| `accent.primary` | `#FFB84D` | CTA, cuenta atras y foco |
| `accent.secondary` | `#FF5E3A` | Profundidad calida y energia |
| `accent.hot` | `#FF4D72` | Momentos y estados expresivos |
| `accent.cool` | `#BCEBFF` | Reflejos y metadata |
| `accent.spark` | `#C8FF66` | Exito, Estrella de la ronda y ranking puntual |

### Text, border y status

| Token | Valor | Uso |
| --- | --- | --- |
| `text.primary` | `#FFF7E8` | Titulos y cuerpo |
| `text.secondary` | `#D8D0C5` | Cuerpo secundario |
| `text.muted` | `#AFA59A` | Metadata legible |
| `text.inverse` | `#171008` | Texto sobre amber/lime |
| `border.glass` | `rgba(255, 245, 225, 0.16)` | Separacion de vidrio |
| `border.active` | `rgba(255, 184, 77, 0.58)` | Seleccion/foco |
| `status.success` | `#72E6A8` | Confirmacion |
| `status.warning` | `#FFD166` | Aviso |
| `status.danger` | `#FF4D5E` | Error/destructivo |

### Overlay y glow

| Token | Valor | Uso |
| --- | --- | --- |
| `overlay.photo` | `rgba(6, 7, 11, 0.54)` | Texto y controles sobre foto |
| `overlay.photoStrong` | `rgba(6, 7, 11, 0.76)` | Legibilidad extrema |
| `glow.primary` | `rgba(255, 184, 77, 0.28)` | CTA o hero, uno por viewport |
| `glow.secondary` | `rgba(255, 94, 58, 0.20)` | Profundidad ambiental |

## Gradientes

- `nova`: base -> deep plum -> warm night.
- `action`: amber -> vermouth.
- `star`: lime spark -> amber, con texto inverse.
- `iceGlass`: ice muy transparente -> cream casi transparente.
- Cada variante de pantalla cambia posicion e intensidad, no la familia de color.

## Tipografia

Se mantiene la fuente de sistema. Evita descargas, reduce el tiempo de arranque y conserva una
lectura nativa en iOS, Android y web.

| Rol | Tamano / linea | Peso | Uso |
| --- | --- | --- | --- |
| `display` | 42 / 46 | 800 | Marca y hero excepcional |
| `h1` | 32 / 37 | 800 | Titulo de pantalla |
| `h2` | 24 / 29 | 800 | Seccion principal |
| `h3` | 19 / 24 | 700 | Tarjeta y fila |
| `body` | 16 / 23 | 400 | Texto principal |
| `bodyStrong` | 16 / 23 | 700 | Copy destacado |
| `caption` | 13 / 18 | 500 | Metadata |
| `button` | 16 / 20 | 800 | Comandos tactiles |
| `stat` | 36 / 39 | 800 | Ranking y contadores |
| `overline` | 11 / 15 | 800 | Estado/etiqueta breve |

No se escala la fuente con el viewport. Se permite Dynamic Type donde la plataforma lo ofrezca,
con contenedores que puedan crecer verticalmente.

## Espacio y forma

- Grid base: 4 px.
- Ritmo principal: 8, 12, 16, 20, 24, 32 y 40 px.
- Tap target minimo: 44 x 44 px.
- Radios: 10 para controles, 16 para inputs/paneles, 22 para fotografia y 28 solo para heroes.
- Pill se reserva a chips, badges, estado y CTA flotante.
- El borde continuous es un detalle; no sustituye jerarquia.

## Marca

El BrandMark se conserva como una `R` liquida dentro de un campo redondeado con una orbita de
tres puntos sociales. Debe funcionar a 24 px, en splash, como avatar neutral y en estados vacios.

Reglas:

- Sin emoji ni copa literal.
- Fondo con gradiente action o monochrome cream.
- Maximo una marca completa por viewport.
- En navegacion se usa solo el simbolo.
- En estados vacios puede animarse una vez y detenerse.

## Personalidad de motion

| Token | Duracion | Uso |
| --- | --- | --- |
| `micro` | 120 ms | Pop, opacity y feedback inmediato |
| `standard` | 220 ms | Entrada de panel y cambio de estado |
| `emphasis` | 360 ms | CTA, indicador y Estrella de la ronda |
| `hero` | 560 ms | Entrada inicial de hero |

Springs:

- `press`: damping 18, stiffness 320, mass 0.55.
- `soft`: damping 20, stiffness 180, mass 0.75.
- `celebrate`: damping 14, stiffness 240, mass 0.65.

Easing:

- `standard`: cubic bezier 0.2, 0, 0, 1.
- `exit`: cubic bezier 0.4, 0, 1, 1.

## Glass

- `glassLite`: tint dark, intensidad 18, fallback `surface.glass`.
- `glassStrong`: tint dark, intensidad 32, fallback `surface.card`.
- No BlurView por fila en listas largas; usar surface card con borde glass.
- Todo texto sobre foto usa overlay independiente.
- Android sin blur mantiene contraste, borde y profundidad mediante color solido.

## Composiciones distintivas

- **Onboarding:** marca, mensaje activo y CTA fija; tres mensajes como carrusel compacto.
- **Home:** saludo breve, ronda activa fotografica y boton Lanzar persistente.
- **Grupo:** identidad, miembros superpuestos y timeline de rondas.
- **Ronda:** cuenta atras sobre foto, acciones sociales inmediatamente debajo.
- **Ranking:** podio 2-1-3 y lista plana; numeros antes que decoracion.
- **Perfil:** avatar grande, stats en banda y ajustes como filas, no tarjetas repetidas.

## Accesibilidad y seguridad visual

- El color nunca es el unico indicador de estado.
- Texto secundario conserva contraste sobre fallback y blur.
- Controles criticos llevan texto; iconos secundarios tienen accessibility label.
- Reportar y borrar no usan animaciones celebratorias.
- Reduced motion elimina parallax, shimmer desplazado y springs de escala.
