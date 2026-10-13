# 02 — Especificación funcional del MVP

## Objetivo del MVP

Construir una primera versión funcional de Rondapp que permita a un grupo de amigos probar el loop principal:

```txt
Crear cuenta → crear/unirse a grupo → lanzar ronda con foto → notificar grupo → subir momentos → reaccionar → asignar/mover/retirar la Estrella de la ronda → cerrar ronda → ranking semanal
```

## Plataformas del MVP

- iOS físico mediante build interna/TestFlight/Ad Hoc.
- Android físico mediante APK instalable.
- No es obligatorio publicar en App Store/Google Play para el MVP.
- No es obligatorio web.

## Usuarios

### Usuario autenticado

Puede:

- Crear cuenta.
- Confirmar mayoría de edad.
- Crear perfil.
- Crear grupos.
- Unirse a grupos por código o enlace.
- Lanzar rondas.
- Subir momentos.
- Reaccionar.
- Asignar, mover o retirar su Estrella de la ronda.
- Ver ranking.
- Reportar contenido.
- Bloquear usuarios.
- Configurar notificaciones.

### Owner/admin de grupo

Puede:

- Cambiar nombre/avatar del grupo.
- Invitar miembros.
- Regenerar código de invitación.
- Eliminar miembros en V1.1, no obligatorio en MVP.
- Cerrar ronda en casos básicos si la inició o si es admin.

## Restricción de edad

El onboarding debe exigir confirmar 18+ antes de entrar en la app.

MVP:

- Checkbox/botón de confirmación.
- Guardar `is_age_confirmed = true` y `accepted_terms_at` en `profiles`.
- No implementar verificación documental todavía.

Si el usuario no confirma edad, no puede usar la app.

## Autenticación

MVP recomendado:

- Email + password con Supabase Auth.
- Más adelante: Sign in with Apple, Google OAuth y/o teléfono.

Por simplicidad de desarrollo y builds internas, empezar con email/password reduce bloqueos de configuración.

Requisitos:

- Registro.
- Login.
- Logout.
- Sesión persistente.
- Recuperación de contraseña opcional en MVP, recomendable.

## Perfil

Campos mínimos:

- Username único.
- Nombre visible.
- Avatar opcional.
- Fecha de nacimiento opcional si se quiere pedir, pero no imprescindible para MVP si ya hay confirmación 18+.
- Estado de edad confirmada.
- Fecha de aceptación de términos.

Reglas:

- Username único, lowercase, sin espacios.
- Nombre visible editable.
- Avatar editable opcional.

El perfil incluye **Tus momentos por bebida**. Es una estadística privada del usuario
autenticado: total de momentos, total con bebida indicada y conteos por tipo. No acepta un
`user_id` de cliente, no compara personas y no afecta al ranking.

## Grupos

### Crear grupo

Campos:

- Nombre.
- Avatar opcional.
- Código de invitación único.
- Owner.

Al crear un grupo:

1. Se crea `social_groups`.
2. El creador entra automáticamente en `group_members` con rol `owner`.
3. Se genera código de invitación.

### Unirse a grupo

Dos vías:

1. Introducir código manual.
2. Abrir deep link con código, ejemplo: `rondapp://join/ABC123`.

MVP puede implementar código manual primero y dejar deep link preparado.

### Privacidad

- Los grupos son privados.
- Solo miembros ven rondas y momentos.
- No hay búsqueda pública de grupos.

## Rondas

### Definición

Una ronda es un evento temporal dentro de un grupo.

Campos principales:

- Grupo.
- Usuario que la inició.
- Título opcional.
- Estado: `active` o `closed`.
- Fecha de creación.
- Fecha de cierre.
- Foto ganadora al cerrar.

Duración por defecto:

```txt
4 horas
```

Más adelante podrá configurarse por grupo.

### Crear ronda

Flujo:

1. Usuario pulsa **Lanzar ronda**.
2. Confirma el grupo en un selector explícito; puede aparecer el último grupo válido ya
   seleccionado, pero nunca un primer grupo silencioso.
3. Abre cámara.
4. Hace foto.
5. Añade caption corto opcional.
6. Selecciona tipo de bebida opcional.
7. Publica.
8. La app crea una ronda activa.
9. La app crea el primer momento dentro de esa ronda.
10. Se notifica al resto del grupo.

Regla importante:

- El tipo de bebida **no suma puntos**.
- El tipo de bebida es opcional.

### Estados de ronda

`active`:

- Acepta nuevos momentos.
- Acepta reacciones.
- Acepta asignar, mover y retirar la Estrella de la ronda.

`closed`:

- No acepta nuevos momentos.
- No acepta nuevos votos.
- Muestra ganador.
- Entra en ranking/recap.

### Cierre de ronda

Beta:

- Si `now() >= closes_at`, la UI trata la ronda como cerrada.
- `close_round(round_id)` bloquea la ronda, calcula un ganador determinista y marca el cierre.
- El cierre se puede solicitar al abrir la ronda y existe cierre programado en backend cuando
  `pg_cron` está disponible. No depende solo de la navegación del cliente.

## Momentos

Un momento es una foto dentro de una ronda.

Campos:

- Ronda.
- Grupo.
- Usuario.
- Imagen.
- Caption opcional.
- Tipo de bebida opcional.
- Fecha de creación.
- Estado oculto/reportado.

Reglas:

- Un usuario puede subir más de un momento a una ronda, pero el MVP debe limitar spam.
- Recomendación MVP: máximo 3 momentos por usuario por ronda.
- Si una foto es reportada y ocultada, no cuenta para ranking.

## Reacciones

Reacciones rápidas de un toque.

Tipos iniciales:

```txt
cheers → Brindis
laugh → Risa
fire → Fuego
wow → Brutal
```

Reglas:

- Un usuario puede reaccionar a fotos ajenas mientras la ronda está abierta.
- Solo existe una reacción activa por usuario y momento.
- Elegir otro emoji sustituye el anterior.
- Repetir el emoji seleccionado retira la reacción.
- El backend aplica el cambio de forma atómica con `toggle_reaction`.

## Estrella de la ronda

Voto fuerte.

Reglas:

- Cada usuario tiene 1 Estrella de la ronda por ronda.
- Solo puede asignarla a una foto de otra persona.
- Puede moverla o retirarla mientras la ronda esté activa.
- No puede votar su propio momento.
- Al cerrar ronda, se cuentan Estrellas.
- La foto con más Estrellas gana.
- Desempate: más reacciones totales.
- Segundo desempate: foto más antigua.
- Desempate final: menor ID de momento, para un resultado determinista.

UI:

- Botones claros: **Dar mi estrella**, **Tu estrella** y **Cambiar mi estrella**.
- Pulsar **Tu estrella** la retira y vuelve a dejar una disponible.
- Si intenta usarla en su foto: “No puedes dar tu Estrella a tu propia foto.”

## Ranking semanal

Cada grupo tiene ranking semanal. **Ranking** es uno de los cinco destinos visibles de la
navegación inferior y siempre muestra un selector con el grupo activo.

Semana:

- Usar semana ISO o semana que empieza lunes.
- En España, lunes como inicio natural.

Puntuación base recomendada:

```txt
+10 por iniciar una ronda
+5 por subir un momento
+3 por cada usuario distinto que sube foto en una ronda que tú iniciaste
+1 por reacción recibida, con límite razonable
+8 por Estrella recibida
+15 si tu foto gana una ronda
+5 por participar en una ronda de otra persona
```

El tipo de bebida no suma puntos.

El ranking debe mostrar:

- Usuario.
- Avatar.
- Puntos.
- Etiqueta descriptiva de posición, sin títulos de personaje.
- Breakdown: rondas iniciadas, momentos, participantes, reacciones recibidas, Estrellas
  recibidas, fotos ganadoras y participación en rondas ajenas.

## Recap

MVP puede mostrar recap simple dentro de la app.

Recap de ronda cerrada:

- Foto ganadora.
- Estrellas recibidas.
- Reacciones totales.
- Participantes.
- Momentos subidos.

Recap semanal:

- 1.º de la semana.
- Foto más votada.
- Ronda más activa.
- Número de momentos.
- Número de reacciones.

Compartir recap como imagen es V1.1, no obligatorio para MVP.

## Notificaciones

Notificación implementada en el beta:

1. Nueva ronda para los demás miembros no silenciados del grupo.

Ronda cerrada, Estrella recibida y recap siguen siendo candidatos posteriores; no se deben
presentar como activos hasta implementar su evento e idempotencia.

Control:

- Permitir silenciar notificaciones de grupo.
- No mandar notificaciones al creador de la ronda.
- Evitar spam.

## Moderación

MVP debe incluir:

- Reportar momento.
- Bloquear usuario.
- Borrar mi momento.
- Ocultar contenido reportado si supera umbral.
- Pantalla de normas.

No dejar esto para el final. La app tiene UGC.

## Ajustes

Pantalla de ajustes:

- Editar perfil.
- Notificaciones.
- Grupos silenciados.
- Normas de comunidad.
- Política de privacidad placeholder.
- Términos placeholder.
- Cerrar sesión.
- Eliminar cuenta: puede ser placeholder con aviso “contacta soporte” en MVP, pero mejor preparar estructura.

## Priorización MVP

### Must have

- Auth.
- Age gate.
- Perfil.
- Grupos.
- Invites por código.
- Lanzar ronda con foto.
- Feed de rondas.
- Detalle de ronda.
- Reacciones.
- Estrella de la ronda.
- Ranking.
- Report/block.
- Build Android APK.
- Build iOS interna.

### Should have

- Push notifications reales.
- Deep links.
- Recap ronda.
- Silenciar grupo.
- Borrar foto propia.

### Could have

- Compartir recap.
- Haptics.
- Animaciones.
- Badges visuales.
- Galería limitada.

### Won't have de momento

- Chat completo.
- Feed público.
- Pagos.
- Mapa.
- Vídeo.
- Promos de bares.
