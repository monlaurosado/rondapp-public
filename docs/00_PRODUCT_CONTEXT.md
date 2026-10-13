# 00 — Contexto de producto

## Nombre provisional

**Rondapp**

Alternativas posibles: Ronda, La Ronda, Clink, Brindis, Tardeo, CheersUp, ChinChin.

Para desarrollo se usará **Rondapp** como nombre provisional. El nombre puede cambiar en branding final, pero internamente todo el producto debe hablar de:

- Rondas
- Grupos
- Momentos
- Estrella de la ronda
- Ranking semanal
- Recap

## One-liner

**Rondapp es una red social privada para grupos donde lanzas una ronda, compartes un momento,
avisas a tus amigos y seguís juntos la foto de la ronda y la clasificación semanal.**

## Posicionamiento

No es una app para beber más.
No es una competición de consumo.
No es una copia literal de BeReal.
No es un feed público tipo Instagram.

Es una app para activar momentos con tu grupo: terraza, tardeo, afterwork, cumpleaños, vermut, copa, refresco, 0,0, festival, viaje o cualquier situación social con bebida de por medio.

La bebida es contexto visual y social. **Nunca debe ser la unidad principal de puntuación.**

## Problema que resuelve

En muchos grupos de amigos hay momentos espontáneos que se pierden en WhatsApp o Instagram:

- Alguien se toma algo y avisa al grupo.
- Otros se unen, contestan tarde o no se enteran.
- Las fotos se pierden en chats caóticos.
- No hay ritual ni ranking ni recap.
- El pique social se queda en bromas sueltas.

Rondapp convierte ese impulso en un producto:

1. Una persona lanza una ronda.
2. El grupo recibe notificación.
3. Los amigos entran, reaccionan y suben foto-respuesta.
4. Cada persona puede asignar su **Estrella de la ronda** a una foto ajena.
5. Se genera ranking semanal y recap.

## Público objetivo inicial

Primera audiencia:

- Grupos de amigos de 18+.
- Universitarios mayores de edad.
- Gente de afterwork.
- Grupos de tardeo.
- Grupos de fútbol, gimnasio, oficina o viajes.
- Amigos que ya usan WhatsApp/Instagram para avisarse de planes.

No apuntar a menores.
No usar estética infantil.
No usar mensajes que parezcan retos de consumo.

## Principios de producto

### 1. Grupos privados primero

La app debe ser privada por defecto. El contenido solo se ve dentro de grupos donde el usuario es miembro.

No hay feed público en el MVP.
No hay descubrimiento público de personas en el MVP.
No hay ranking global público en el MVP.

### 2. Acción principal ultra simple

El gesto central es:

```txt
Lanzar ronda → Hacer foto → Elegir grupo → Publicar → Notificar al grupo
```

El usuario debe poder hacerlo con pocos toques.

### 3. Fotos espontáneas

La app va de momentos reales, no de postureo hipereditado.

Priorizar cámara directa.
Permitir galería solo como fallback o decisión consciente.
No añadir editor complejo en MVP.

### 4. Pique sano

Debe haber ranking, votos y recompensas, pero no por cantidad de alcohol.

Se premia:

- Activar rondas.
- Subir momentos.
- Conseguir interacción.
- Recibir Estrellas de la ronda.
- Ganar foto de la ronda.
- Participar en rondas de otros.

No se premia:

- Beber más.
- Beber más rápido.
- Beber alcohol frente a no alcohol.
- Mostrar embriaguez.
- Retos peligrosos.

### 5. Fricción mínima

Todo debe ser rápido:

- Login sencillo.
- Crear grupo en segundos.
- Invitar por enlace/código.
- Foto + caption corto.
- Reacciones de un toque.
- Voto fuerte de un toque.

### 6. Seguridad y moderación desde el principio

Como hay contenido generado por usuarios, aunque sean grupos privados, debe existir:

- Reportar publicación.
- Bloquear usuario.
- Ocultar contenido reportado si supera umbral.
- Normas de comunidad.
- Edad mínima 18+.
- Borrado de contenido propio.
- Control de notificaciones.

## Términos principales del dominio

### Grupo

Espacio privado de usuarios. Ejemplos:

- Los de siempre
- Afterwork oficina
- Uni
- Fútbol 7
- Feria 2026

### Ronda

Evento social temporal dentro de un grupo.

Una ronda se abre cuando alguien pulsa **Lanzar ronda**. Dura un tiempo limitado, por defecto 4 horas. Durante ese tiempo otros miembros pueden reaccionar, votar y subir foto-respuesta.

### Momento

Foto publicada dentro de una ronda.

Cada momento pertenece a:

- Un grupo
- Una ronda
- Un usuario

### Reacción

Interacción ligera de un toque. Ejemplo:

- Brindis
- Risa
- Fuego
- Voy
- Brutal

Cada persona mantiene una sola reacción activa por foto ajena. Elegir otro emoji sustituye
el anterior; repetir el seleccionado lo retira. La ronda debe seguir abierta.

### Estrella de la ronda

Voto fuerte y limitado. Cada persona dispone de una Estrella por ronda y puede asignarla a
la foto de otra persona, moverla o retirarla mientras la ronda esté activa. No puede usarla
en su propia foto.

### Ranking semanal

Clasificación del grupo por actividad social, votos y participación. Es una de las cinco
secciones visibles de la navegación y siempre identifica el grupo seleccionado.

### Recap

Resumen visual de la semana o de una ronda cerrada.

## No objetivos del MVP

No construir todavía:

- Feed público.
- Chat completo tipo WhatsApp.
- Stories globales.
- Pagos.
- Promos de bares.
- Marketplace de alcohol.
- Mapas públicos.
- Ranking global por ciudades.
- Moderación avanzada con IA.
- Verificación documental de edad.
- Subida de vídeos.
- Edición avanzada de fotos.
- Matching/social discovery.

## Riesgos principales

### Riesgo 1: parecer que fomenta alcohol

Mitigación:

- No usar etiquetas personales basadas en consumo en el copy de producto.
- No sumar puntos por bebida.
- No contar bebidas como ranking público principal.
- Incluir bebidas no alcohólicas como opción natural, sin premio especial ni penalización.
- Tono social, no competitivo de consumo.

### Riesgo 2: menores

Mitigación:

- Edad mínima 18+.
- Confirmación explícita en onboarding.
- Normas claras.
- Estética adulta.

### Riesgo 3: contenido generado por usuarios

Mitigación:

- Reporte.
- Bloqueo.
- Ocultar contenido.
- Borrado.
- Moderación básica.

### Riesgo 4: spam de notificaciones

Mitigación:

- Silenciar grupos.
- Máximo de notificaciones por ronda/grupo.
- No notificar todas las reacciones por defecto.

## Métrica de éxito del MVP

El MVP funciona si:

- Un usuario puede crear cuenta.
- Crear grupo privado.
- Invitar amigos.
- Lanzar ronda con foto.
- El grupo recibe notificación.
- Otros pueden entrar y subir foto-respuesta.
- Pueden reaccionar y asignar, mover o retirar su Estrella de la ronda.
- Se cierra una ronda y hay ganadora.
- Hay ranking semanal por grupo.
- Perfil muestra en privado `Tus momentos por bebida`, sin comparaciones ni puntos y siempre
  limitado a la identidad autenticada.
- Hay build instalable en Android y en iPhone para amigos.
