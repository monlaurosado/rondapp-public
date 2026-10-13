# 09 — Notificaciones push y deep links

## Objetivo

Las notificaciones son parte central del producto. Una ronda tiene que sentirse como un toque al grupo.

Pero no deben ser spam ni mensajes que empujen a beber.

## Tecnología

Usar:

- `expo-notifications`
- `expo-device`
- Expo Push Service
- Supabase `device_tokens`
- Push API + Service Worker para la PWA
- Supabase `web_push_subscriptions`
- Supabase Edge Function `send-round-notification`

## Evento push implementado en el beta

### Nueva ronda

Trigger:

- Usuario crea ronda.

Destinatarios:

- Miembros del grupo.
- Excluir creador.
- Excluir usuarios con grupo silenciado.
- Excluir bloqueos si aplica.

Título:

```txt
Rosado ha lanzado una ronda
```

Body:

```txt
Entra en “Los de siempre” y sube tu momento.
```

Data:

```json
{
  "type": "round_created",
  "groupId": "uuid",
  "roundId": "uuid"
}
```

## Eventos aún no implementados

El cierre de ronda, una Estrella recibida y el recap no generan push en este corte. Antes de
activarlos hay que definir su evento, preferencias e idempotencia y añadir QA específica. No
documentarlos ni mostrarlos como notificaciones activas.

## No enviar

No enviar presión por consumir, comparaciones de consumo, retos ni mensajes que asocien beber
con ganar o evitar perder.

## Registro de token

En la app nativa autenticada:

1. Pedir permisos push.
2. Obtener Expo Push Token.
3. Registrar mediante `register_device_token(...)`; no hacer `upsert` directo.
4. Actualizar `last_seen_at`.

Campos:

```txt
user_id
expo_push_token
platform
app_version
build_number
last_seen_at
```

Si el usuario no concede permiso:

- La app debe funcionar.
- Mostrar opción de activarlo en ajustes.

Al cerrar sesión, llamar `unregister_device_token(token)` antes de `signOut` para que el
dispositivo no quede vinculado a la cuenta anterior.

### Registro Web Push de la PWA

En iPhone, la PWA debe estar instalada desde Safari y abierta desde su icono.
Desde **Ajustes > Activar notificaciones**:

1. Pedir permiso desde el toque del usuario.
2. Crear la suscripción con la clave pública VAPID devuelta por
   `web-push-config`.
3. Registrar endpoint y claves mediante `register_web_push_subscription(...)`.
4. Invocar `send-test-notification` para comprobar todo el recorrido.

El cierre de sesión llama `unregister_web_push_subscription(...)` y anula la
suscripción del navegador. Endpoints caducados (`404`/`410`) se eliminan cuando
el backend intenta usarlos.

## Deep links

Configurar scheme:

```txt
rondapp://
```

Rutas objetivo:

```txt
rondapp://round/{roundId}
rondapp://group/{groupId}
rondapp://join/{inviteCode}
```

Con Expo Router:

- Deep link `round/{roundId}` debe abrir pantalla `app/round/[roundId].tsx` o equivalente.
- Si usuario no está autenticado, guardar intent y redirigir después de login.
- Si usuario no pertenece al grupo, mostrar error o invitación si hay código válido.

## Edge Function `send-round-notification`

### Input

```json
{
  "roundId": "uuid"
}
```

### Proceso

1. Leer JWT del usuario.
2. Validar usuario y exigir que sea quien creó la ronda.
3. Reclamar `roundId` en `round_notification_dispatches`; si ya existe, devolver resultado
   duplicado sin reenviar.
4. Obtener ronda y grupo.
5. Obtener miembros del grupo excepto creador.
6. Excluir miembros con `muted = true` y relaciones bloqueadas.
7. Obtener `device_tokens` y `web_push_subscriptions` de esos usuarios.
8. Construir mensajes Expo y Web Push.
9. Enviar mediante Expo Push Service y VAPID, eliminando suscripciones caducadas.
10. Devolver tickets/resultado.

### Payload Expo orientativo

```json
{
  "to": "ExpoPushToken[...]",
  "sound": "default",
  "title": "Rosado ha lanzado una ronda",
  "body": "Entra en Los de siempre y sube tu momento.",
  "data": {
    "type": "round_created",
    "roundId": "...",
    "groupId": "..."
  }
}
```

## Manejo en la app

La app debe:

- Registrar listener de notificaciones recibidas.
- Registrar listener de response/tap.
- Navegar según `data.type`.
- Refrescar queries al entrar por push.

## Silenciar grupo

En `group_members.muted`.

UI:

- Ajustes del grupo.
- Toggle “Silenciar notificaciones”.

Edge Function debe respetarlo.

## Rate limiting básico

Beta:

- Enviar como máximo una notificación por ronda creada, respaldado por
  `round_notification_dispatches`.
- No enviar notificación por cada reacción.
- Enviar al servicio Expo en lotes de hasta 100 mensajes.

## Push en builds internas

Notas importantes:

- Push reales requieren build nativa/dev build; no depender de Expo Go como única vía.
- iOS requiere configuración correcta de credenciales/APNs mediante Expo/EAS.
- Android requiere configuración de Firebase/FCM gestionada por Expo/EAS según flujo elegido.

La PWA usa Web Push de forma independiente. En iPhone requiere iOS 16.4+, HTTPS,
instalación en pantalla de inicio y el permiso explícito del usuario.

## Fallback si push falla

La app no debe bloquear creación de ronda si falla push.

Flujo:

1. Crear ronda.
2. Crear momento.
3. Intentar enviar push.
4. Si push falla, registrar error y seguir.
5. Mostrar toast no crítico si procede.

## Debug

En ajustes/dev info mostrar:

- Push permission status.
- Expo push token copiable.
- Último error push.

Esto ayuda durante pruebas con amigos.
