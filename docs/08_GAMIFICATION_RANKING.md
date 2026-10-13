# 08 — Gamificación, votos, ranking y recaps

## Filosofía

Rondapp necesita pique, pero no debe convertir la bebida en una competición de consumo.

La gamificación debe premiar:

- Crear momentos.
- Activar grupos.
- Participar.
- Subir buenas fotos.
- Recibir votos.
- Hacer que otros participen.

No debe premiar:

- Más alcohol.
- Más cantidad de bebidas.
- Más velocidad de consumo.
- Conductas peligrosas.

## Unidades de gamificación

### Reacciones

Interacción ligera.

Tipos MVP:

```txt
cheers = Brindis
laugh = Risa
fire = Fuego
wow = Brutal
```

Valor:

- Sirven para feedback social.
- Suman poco al ranking.
- Pueden mostrarse en tiempo real.

Solo hay una reacción activa por persona y foto ajena. Elegir otro emoji cambia la reacción;
repetir el seleccionado la retira. `toggle_reaction` lo resuelve de forma atómica.

### Estrella de la ronda

Voto fuerte.

Reglas:

- 1 Estrella por usuario por ronda.
- Solo a foto ajena.
- Se puede mover a otra foto o retirar hasta el cierre.
- Pesa más que reacciones.
- Decide ganadora de ronda.

La cabecera muestra siempre si queda `1 estrella disponible` o si ya está usada. El botón
usa `Dar mi estrella`, `Tu estrella` o `Cambiar mi estrella`. Reacciones y Estrella son
acciones independientes.

### Ronda ganadora

Cuando una ronda cierra, se elige la foto ganadora.

Criterio:

1. Más Estrellas.
2. Si empate, más reacciones totales.
3. Si empate, momento más antiguo.
4. Si aún hay empate, menor ID de momento. Este último criterio hace el resultado determinista.

## Scoring recomendado

Puntuación semanal por grupo:

```txt
+10 puntos por iniciar una ronda
+5 puntos por subir un momento
+3 puntos por cada usuario distinto que participa en una ronda iniciada por ti
+1 punto por reacción recibida
+8 puntos por Estrella recibida
+15 puntos por foto ganadora
+5 puntos por participar en una ronda iniciada por otro
```

No sumar por tipo de bebida.
No sumar por número de bebidas.

## Límites anti-abuso

MVP:

- Máximo 3 momentos por usuario/ronda.
- Una Estrella por usuario/ronda.
- Una única reacción activa por usuario/momento; cambiar emoji sustituye la anterior y repetirlo la retira.
- No voto propio.
- No interacciones tras cierre.

V1.1:

- Límite de puntos diarios.
- Detección de spam.
- Cooldown entre rondas iniciadas por el mismo usuario.

## Etiquetas del ranking

Usar datos descriptivos: `1.º esta semana`, posición, puntos y nombres de métricas. No asignar
personajes, juicios de valor o títulos ambiguos a las personas.

## Ranking principal

Ranking es uno de los cinco destinos visibles de la navegación. La pantalla debe mostrar:

- Selector de grupo siempre visible, con la última selección válida recordada.
- Semana actual.
- Top 3.
- Lista completa.
- Breakdown.

Ejemplo:

```txt
1. Marta — 124 pts
2. Rosado — 108 pts
3. Pablo — 96 pts
```

Breakdown:

```txt
Rondas iniciadas: 3
Momentos subidos: 8
Participantes en mis rondas: 5
Estrellas recibidas: 6
Fotos ganadas: 1
Reacciones recibidas: 22
Participaciones en rondas ajenas: 4
```

## Ranking de fotos

Cada ronda cerrada debe tener:

- Foto ganadora.
- Top fotos por Estrellas.
- Reacciones totales.

V1.1:

- Ranking semanal de fotos.
- Galería histórica de fotos.

## Recap de ronda

Al cerrar una ronda, mostrar:

```txt
Foto de la ronda
Foto de Marta

7 Estrellas
18 reacciones
5 participantes
12 momentos subidos
```

## Recap semanal

Contenido recomendado:

```txt
Semana en “Los de siempre”

1.º esta semana: Rosado
Foto de la semana: Marta
Ronda más activa: Viernes 21:34
Momentos subidos: 27
Estrellas dadas: 19
Reacciones: 103
```

MVP puede mostrarlo en pantalla.
V1.1 puede generar imagen compartible.

## Recompensas visuales

- Haptic al dar, mover o retirar la Estrella.
- Animación al ganar ronda.
- Top 3 con cards destacadas.
- Indicador visual de posición junto al nombre.

No meter animaciones pesadas antes de que core funcione.

## Cómo evitar comportamiento tóxico

- Ranking por grupo, no global.
- No publicar consumo.
- No humillar a quien no participa.
- No rachas agresivas tipo “no falles o pierdes”.
- Silenciar notificaciones.
- Mantener las métricas explicables y sin comparaciones de consumo.

## Decisión sobre contador de bebidas

No hacer contador público de bebidas.

Se puede guardar `drink_type` opcional como metadata visual.

No mostrar:

```txt
Has bebido 12 esta semana
```

Sí se puede mostrar en recap agregado y neutral:

```txt
Esta semana el grupo subió 27 momentos.
```

El perfil sí muestra una sección **privada** llamada `Tus momentos por bebida`: total de
momentos subidos, total con bebida indicada y conteos descendentes por tipo. Describe
metadata de momentos, no consumo; `get_my_profile_stats()` deriva la identidad de
`auth.uid()`, no acepta consultar a otro usuario, no se compara y no aporta puntos.

## Futuro: modos de juego

V1.1 o V2:

- Modo festival.
- Modo viaje.
- Ronda relámpago de 30 minutos.
- Votación oculta hasta cierre.
- Recap compartible.
- Badges coleccionables.

## Implementación técnica de la Estrella

Tabla:

```txt
photo_votes
```

Constraint:

```txt
unique(round_id, voter_id, vote_type)
```

Compatibilidad: el identificador interno `vote_type = 'foton'` puede conservarse. No se usa
como copy visible.

RPC atómica `toggle_round_star(moment_id)`:

- Si no existe voto, lo inserta.
- Si existe en otra foto, mueve `moment_id`.
- Si se pulsa la foto ya elegida, lo retira.
- Valida membresía, autor ajeno y ronda abierta en backend.

UI:

- Query para saber mi voto en la ronda.
- Query para contadores por momento.
- Optimistic update con rollback.

Las reacciones se cambian con una RPC atómica equivalente. La base consolida datos antiguos
y garantiza `unique(moment_id, user_id)`, de modo que nunca hay varios emojis activos de una
persona en la misma foto.

## Implementación técnica del ranking

MVP recomendado:

- RPC `get_weekly_leaderboard(groupId, weekStart)`.
- Calcular en SQL desde eventos reales.
- No persistir score salvo necesidad.

Ventaja:

- Menos bugs de sincronización.
- Si cambia fórmula, se recalcula.

V1.1:

- Snapshots semanales para histórico.

## Tests manuales de gamificación

Probar:

- Usuario A inicia ronda.
- Usuario B sube foto.
- Usuario C sube foto.
- A no puede votarse a sí mismo.
- B puede dar su Estrella a C.
- B puede cambiar su Estrella a A.
- B puede retirar su Estrella y recupera una disponible.
- Al cerrar, gana quien más Estrellas tiene.
- Ranking suma sin contar tipo de bebida.
- Foto reportada no debe contar si está oculta.
