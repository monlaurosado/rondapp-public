# 04 — UX/UI Spec

## Objetivo UX

Rondapp debe poder usarse con una mano, en la calle, en un bar, con ruido y poca paciencia.

La app debe ser:

- Rápida.
- Visual.
- Con botones grandes.
- Con texto corto.
- Con navegación evidente.
- Con buen feedback táctil/visual.

Si una acción importante necesita explicación larga, está mal diseñada.

## Estilo visual inicial

Propuesta MVP:

- Dark mode por defecto.
- Fondo oscuro.
- Cards redondeadas.
- Tipografía grande y clara.
- Botón principal muy visible.
- Colores cálidos/acento, pero sin depender de colores concretos hasta diseño final.
- Fotos como protagonistas.

No convertir la UI en una app de cerveza vintage. Debe sentirse moderna/social, no cartel de pub irlandés de 2007.

## Navegación recomendada

Usar Expo Router.

Estructura principal:

```txt
(auth)
  onboarding
  login
  register
  complete-profile

(app)
  tabs
    home
    groups
    camera-launch
    ranking
    profile

modal/screens
  group/[groupId]
  round/[roundId]
  moment/[momentId]
  create-group
  join-group
  create-round
  report
  settings
```

### Tabs

1. Home
2. Grupos
3. Cámara/Lanzar
4. Ranking
5. Perfil

Los cinco destinos son visibles. Ranking no se oculta con `href: null` ni se filtra en la
barra; el destino central abre la cámara directamente.

## Pantalla: Splash

Debe cargar:

- Sesión Supabase.
- Perfil.
- Estado age confirmation.
- Grupos básicos.

Rutas:

- Sin sesión → onboarding/login.
- Sesión sin edad confirmada → onboarding/age-gate.
- Sesión sin perfil → complete-profile.
- Sesión correcta → tabs/home.

## Pantalla: Onboarding

4 pantallas máximo.

Contenido:

1. Qué es Rondapp.
2. Grupos privados.
3. Fotos/rondas temporales.
4. Votos y ranking.

Botones:

- Crear cuenta.
- Iniciar sesión.

## Pantalla: Age gate

Elementos:

- Título claro.
- Texto breve.
- Checkbox o botón de confirmación.
- Link a normas.

No dejar continuar sin confirmación.

## Pantalla: Login/Register

MVP:

- Email.
- Password.
- Botón login.
- Botón crear cuenta.
- Mensajes de error claros.

Evitar login social al principio si ralentiza.

## Pantalla: Complete profile

Campos:

- Username.
- Nombre visible.
- Avatar opcional.

Validación:

- Username 3-20 caracteres.
- Minúsculas, números, guion bajo.
- Sin espacios.
- Debe ser único.

## Pantalla: Home

Debe responder a la pregunta:

> ¿Qué está pasando ahora en mis grupos?

Secciones:

1. Rondas activas.
2. Grupos favoritos/recientes.
3. CTA Lanzar ronda.
4. Mini ranking semanal.

### Estado sin grupos

Mostrar:

- Crear grupo.
- Unirme con código.

### Estado con grupos pero sin rondas

Mostrar:

- CTA grande: Lanzar ronda.
- Texto: “No hay rondas activas. Alguien tiene que dar el primer paso.”

## Componente: Round Card

Debe mostrar:

- Nombre grupo.
- Avatar grupo.
- Usuario que inició.
- Tiempo restante.
- Miniaturas de fotos.
- Nº participantes.
- Nº Estrellas/reacciones.
- CTA “Entrar”.

Estados:

- Activa.
- Cerrada.
- Expirada pendiente de cierre.

## Pantalla: Lanzar ronda

Secuencia beta:

1. Cámara desde la tab central.
2. Preview.
3. Selector explícito de grupo, con el último grupo válido preseleccionado cuando aplique.
4. Caption + bebida opcional.
5. Publicar.

### Cámara

Controles mínimos:

- Botón disparo.
- Cambiar cámara frontal/trasera.
- Cancelar.
- Flash opcional.
- Abrir galería solo si permitido.

### Preview

Elementos:

- Imagen.
- Caption corto.
- Selector “¿Qué hay en la foto? Opcional.”
- Botón publicar.
- Botón repetir.

## Pantalla: Grupo

Debe mostrar:

- Header grupo.
- Miembros.
- Código/invitación.
- Rondas activas.
- Rondas recientes.
- Ranking mini.
- Ajustes grupo.

Acciones:

- Lanzar ronda en este grupo.
- Invitar amigos.
- Silenciar grupo.

## Pantalla: Detalle de ronda

Header:

- Grupo.
- Creador.
- Estado.
- Tiempo restante.

Contenido:

- Lista/grid de momentos.
- Botón subir momento.
- Ranking temporal opcional.
- Estado de mi Estrella de la ronda.

### Layout de momentos

MVP: lista vertical de cards grandes.

Cada card:

- Foto grande.
- Autor.
- Hora.
- Caption.
- Tipo de bebida opcional si existe.
- Reacciones.
- Botón Dar/Cambiar/Retirar mi estrella.
- Menú “...” para reportar/borrar/bloquear.

## Pantalla: Momento full screen

Opcional pero recomendable:

- Imagen a pantalla completa.
- Reacciones.
- Estrella de la ronda.
- Reportar.

## Votación UX

### Reacciones

Mostrar como botones pequeños:

```txt
🍻 Brindis
😂 Risa
🔥 Fuego
😮 Brutal
```

Si se quiere evitar depender de emojis, usar labels con iconos internos.

Solo puede quedar un emoji activo por persona y foto. Tocar otro lo sustituye; tocar de
nuevo el seleccionado lo retira. El cambio se refleja de forma optimista y revierte si falla.

### Estrella de la ronda

Botón destacado:

```txt
Dar mi estrella
```

Estados:

- No votado: `Dar mi estrella` y `1 estrella disponible`.
- Votado en esa foto: `Tu estrella`; volver a pulsar la retira.
- Votado en otra: `Cambiar mi estrella`.
- Foto propia: disabled con tooltip/mensaje.
- Ronda cerrada: disabled.

Feedback al votar:

- Haptic.
- Microanimación.
- Toast accesible para Estrella asignada, movida o retirada.

## Pantalla: Ronda cerrada

Mostrar resultado:

- Foto ganadora.
- Autor.
- Estrellas.
- Reacciones.
- Participantes.
- CTA ranking.

Copy:

```txt
Foto de la ronda
```

```txt
Foto de Marta
```

## Pantalla: Ranking

Secciones:

- Selector de grupo siempre visible; recuerda la última selección válida.
- Semana actual.
- Top 3 destacados.
- Lista completa.
- Breakdown por usuario.

Top 3:

- Tarjetas más visuales.
- Etiqueta descriptiva de posición.

Breakdown:

```txt
Rondas: 3
Momentos: 7
Participantes: 5
Reacciones recibidas: 18
Estrellas: 11
Fotos ganadas: 1
Participaciones: 4
```

## Pantalla: Perfil

Debe mostrar:

- Avatar.
- Nombre.
- Username.
- Mis grupos.
- Estadísticas de actividad social.
- Sección privada `Tus momentos por bebida`: total, total con metadata y conteos por tipo.
- Ajustes.

La sección de bebida se obtiene para `auth.uid()` y no se muestra para otros perfiles. Evitar
comparaciones o estadísticas públicas de consumo; sus conteos no puntúan.

## Pantalla: Ajustes

Opciones:

- Editar perfil.
- Notificaciones.
- Privacidad.
- Normas.
- Soporte.
- Cerrar sesión.

## Pantalla: Reportar

UI simple:

- Motivo.
- Comentario opcional.
- Confirmar.

Tras reportar:

- Ocultar ese contenido para el usuario.
- Toast: “Gracias. Revisaremos este contenido.”

## Estados técnicos obligatorios

Cada pantalla con datos debe tener:

- Loading skeleton/spinner.
- Empty state.
- Error state.
- Pull to refresh si aplica.

## Accesibilidad básica

- Botones mínimo 44x44.
- Labels accesibles.
- Contraste correcto.
- No depender solo del color.
- Textos escalables.
- Haptic no obligatorio para entender acción.

## Animaciones

MVP:

- Transiciones simples.
- Haptic en publicar, reaccionar y asignar/mover/retirar la Estrella.
- Evitar animaciones complejas hasta que el core funcione.

## Offline/latencia

MVP:

- UI optimista con rollback en reacciones y Estrella.
- Si falla backend, revertir y mostrar toast.
- Conservar la preview y el borrador ante un error recuperable.
- Reintentar la publicación con identificadores estables y progreso visible; no duplicar
  ronda, momento ni objeto de Storage.

## Diseño para pruebas con amigos

Añadir en ajustes o dev screen:

- Versión app.
- Build number.
- Entorno: dev/preview/prod.
- User id copiable.
- Botón “copiar info debug”.

Esto ayuda mucho en TestFlight/APK cuando algo falla.
