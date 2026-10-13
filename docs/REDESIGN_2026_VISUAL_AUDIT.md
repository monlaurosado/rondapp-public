# Rondapp 2026 - Auditoria visual

> **HISTÓRICO — corte previo al beta 2026-07-13.** Diagnóstico conservado para trazabilidad;
> no es auditoría de la UI actual. Ver `BETA_READINESS.md`.

Fecha: 9 de julio de 2026  
Direccion evaluada: interfaz actual previa a Ronda Nova  
Viewport principal: 390 x 844 px, Expo Web en `http://localhost:8081`

## Evidencia revisada

La auditoria combina capturas reales de la aplicacion en ejecucion con revision de rutas,
componentes y tokens. Las capturas de referencia se guardaron fuera del repositorio:

- `/tmp/rondapp-redesign-audit/01-onboarding-current.png`
- `/tmp/rondapp-redesign-audit/02-login-current.png`
- `/tmp/rondapp-redesign-audit/03-register-current.png`
- `/tmp/rondapp-redesign-audit/04-check-email-current.png`

## Inventario actual

### Primer uso y autenticacion

- Onboarding.
- Login.
- Registro.
- Confirmacion de email.
- Confirmacion 18+.
- Completar perfil.
- Callback OAuth.

### Experiencia social

- Home.
- Grupos.
- Crear grupo.
- Unirse con codigo.
- Detalle de grupo.
- Lanzar ronda: selector, camara y composer.
- Detalle de ronda.
- Detalle de momento.
- Ranking.
- Perfil.

### Cuenta, seguridad y soporte

- Ajustes.
- Reportar contenido.
- Borrar cuenta.
- Privacidad, terminos, soporte y normas de comunidad.

## Diagnostico visual

La interfaz tiene una base cromatica coherente y una implementacion funcional, pero todavia
parece una demostracion de componentes. Casi cualquier bloque recibe el mismo tratamiento:
rectangulo glass grande, titulo, texto y botones en vertical. La repeticion diluye la jerarquia,
hace que las fotos compitan con el contenedor y no permite reconocer cada pantalla por su
composicion.

### Lo que falla visualmente

- Onboarding repite tres veces el mismo BrandMark dentro de una tarjeta. Parece un catalogo de
  funciones y no una entrada a una red social.
- Login, registro y check email usan la misma formula de tarjeta hero mas tarjeta formulario. La
  marca ocupa demasiado espacio y el trabajo principal empieza demasiado abajo.
- Los fondos usan circulos ambientales grandes y estaticos. Aportan color, pero se leen como
  decoracion superpuesta y no como profundidad integrada.
- La mayoria de botones son capsulas de ancho completo. Al compartir forma, tamano y peso, las
  acciones primarias, secundarias y de mantenimiento parecen igual de importantes.
- `RoundCard` muestra un icono de camara como placeholder aunque el producto ya dispone de
  fotos. La entidad mas importante se representa como estado vacio.
- `MomentCard` mete foto, autor, Estrellas, reacciones, moderacion y borrado en una sola tarjeta.
  La foto no domina y las acciones de seguridad tienen demasiado peso visual.
- Grupos duplica las acciones de crear/unirse en hero, formularios embebidos y modales. Hay mas
  interfaz que tarea.
- Perfil y ajustes parecen una lista de tarjetas residuales. No construyen identidad ni resumen
  de actividad.
- Ranking tiene datos correctos, pero el podio sigue siendo una tarjeta con tres columnas. No
  transmite celebracion social.
- Los empty/loading/error states reutilizan la marca de forma generica; no explican el contexto
  concreto de la pantalla.

### Lo que falla en UX movil

- El primer uso necesita scroll para completar una decision simple en pantallas pequenas.
- Los heroes de auth consumen altura que deberia reservarse al teclado y a la CTA.
- Grupos presenta dos formularios completos antes de la lista de grupos; el contenido principal
  se desplaza varias pantallas hacia abajo.
- Las acciones secundarias de cada momento estan siempre visibles y ensucian el flujo de scroll.
- El selector de grupo de Launch usa una tarjeta completa por opcion. Escala mal a cinco o mas
  grupos y obliga a recorrer mucho espacio antes de abrir la camara.
- El detalle de grupo muestra todos los miembros en un unico contenedor sin resumen ni limite.
- Varias listas usan ScrollView y cards con blur por item, con riesgo de jank y consumo de memoria.
- Faltan refresh controls visibles en las pantallas de contenido cambiante.
- El teclado no forma parte de una composicion compacta especifica en auth y modales.

### Lo que parece plantilla

- Card glass + titulo + texto muted + dos botones, repetido casi sin variacion.
- Badges como sustituto de jerarquia y de contenido real.
- Marca repetida en heroes, estados vacios y filas sin una funcion concreta.
- Gradiente ambiental con dos circulos grandes en todas las rutas.
- Copy tecnico como `Configura Apple en Supabase`, impropio de una experiencia de usuario.
- Nombres internos como `AfterglowRoundCard` y chips `Afterglow` visibles o presentes en la capa
  visual, que impiden una identidad terminada.

### Lo que parece web

- Formularios apilados dentro de paneles, como bloques de una pagina responsive.
- Botones de texto para abrir, reportar, bloquear, ajustes y otras acciones que en una app deben
  apoyarse en iconos, menus o filas tactiles.
- Secciones enteras flotando como cards en lugar de composiciones de pantalla.
- Headers descriptivos altos y repetitivos en vez de una barra compacta y contenido inmediato.

## Componentes que necesitan sustitucion o refactor profundo

- `RondaGradientBackground`: sustituir por un fondo por capas con variantes y movimiento reducido.
- `AmbientGlow`: conservar la idea, eliminar los circulos obvios y limitar luces simultaneas.
- `Screen` / `AppScreen`: convertir en infraestructura de safe area, teclado, refresh y parallax.
- `Card` / `GlassCard`: reducir uso, separar panel, tarjeta de contenido y superficie de lista.
- `Button`: jerarquia real y variantes compactas con iconos.
- `RoundCard`: usar imagen social real cuando exista y una composicion editorial cuando no.
- `MomentCard`: foto primero; reacciones y Estrella de la ronda inmediatos; moderacion en accion secundaria.
- `StarButton`: mantener estados y mejorar feedback, shine y haptic.
- `ReactionChip`: animacion pop y densidad estable.
- `GlassTabBar`: indicador animado, mejor separacion del boton central y labels mas discretos.
- `LoadingState`: skeletons que reproduzcan la pantalla, no logo con barras genericas.
- `RankingPodium`: orden visual 2-1-3, niveles y puntuacion protagonista.

## Pantallas que necesitan rediseño completo

- Onboarding, login, registro y check email.
- Home, grupos, detalle de grupo y Launch.
- Detalle de ronda y tarjetas de momento.
- Ranking, perfil y ajustes.

Age gate, completar perfil, modales de grupo, reportar y borrar cuenta necesitan una nueva
composicion coherente, pero deben conservar su tono directo y su logica actual.

## Base que se puede salvar

- Paleta nocturna calida: base casi negra, amber, coral, lime e ice.
- `expo-linear-gradient`, `expo-blur`, `expo-image` y Reanimated ya instalados.
- Safe area, Expo Router y la navegacion existente.
- BrandMark sin emoji y assets de marca existentes.
- Estados y contratos funcionales de Estrella de la ronda y reacciones.
- Modelos, hooks, RLS y consultas Supabase.
- Tipografia de sistema para evitar peso de fuentes y riesgos de arranque.
- Haptics ya disponibles en la capa de interaccion.

## Motion que falta

- Entrada coordinada de hero y CTA, no una animacion igual por tarjeta.
- Spring real en press y feedback visual localizado.
- Indicador activo que viaje en la tab bar.
- Pop en reacciones y shine breve en Estrella de la ronda.
- Transicion compacta de selector a camara/composer.
- Pulse o shimmer barato en skeletons.
- Aparicion escalonada solo en listas pequenas.
- Respeto centralizado de `reduce motion`.

## Parallax que aporta

- Onboarding: desplazamiento lento de marca y capas del fondo.
- Home: hero activo a menor velocidad que el contenido.
- Detalle de grupo: identidad del grupo y avatares con desplazamiento limitado.
- Detalle de ronda: foto hero y estado/cuenta atras.
- Ranking: podio con recorrido muy corto.
- Perfil: cabecera y stats.

No aporta en formularios, reportar, borrar cuenta, errores, listas largas ni controles de camara.

## Efectos que sobran

- Un BlurView independiente por cada elemento de listas potencialmente largas.
- Glows permanentes en varios controles simultaneos.
- Circulos ambientales con bordes visualmente reconocibles.
- Marca repetida donde bastaria icono contextual o fotografia.
- Entrada animada en cualquier tarjeta, incluso cuando el scroll ya esta en movimiento.
- Pills decorativas que no son filtros, estados ni acciones.

## Riesgos

### Legibilidad

- Texto secundario sobre glass claro puede quedar por debajo de contraste util.
- Bordes finos desaparecen en Android sin blur.
- Texto sobre foto necesita overlay estable y nunca debe depender de la imagen.
- Lime y ice deben usarse como estado o acento, no como texto largo.

### Rendimiento

- Blur por item, sombras grandes y varios glows pueden provocar jank en Android medio.
- Parallax por cada card multiplicaria worklets y renders sin valor real.
- Imagenes 4:5 sin estrategia de cache y dimensiones estables pueden desplazar layout.
- Animaciones de entrada en FlatList pueden reiniciarse al reciclar filas.

### Producto

- Un rediseño visual no debe modificar puntuacion, permisos, RLS, rutas ni semantica de bebida.
- Apple debe ocultarse si no esta configurado; nunca se mostrara una instruccion tecnica al usuario.
- Reportar, bloquear y borrar seguiran disponibles aunque pasen a menus o superficies secundarias.

## Criterio de correccion

Ronda Nova debe reducir contenedores, hacer de la foto el contenido dominante y ofrecer una sola
accion primaria inequívoca por estado. El glass se usara como capa de control, no como envoltorio
universal. El movimiento explicara profundidad o confirmara una accion; si no cumple una de esas
funciones, se elimina.
