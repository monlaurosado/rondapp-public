# 05 — Tech stack y arquitectura

## Decisión principal

Usar:

```txt
Expo + React Native + TypeScript + Supabase
```

Razones:

- Una sola base de código para iOS y Android.
- Encaja con experiencia web/React.
- Codex trabaja bien con TypeScript/React.
- Expo facilita cámara, notificaciones, permisos y builds internas.
- Supabase acelera backend: Auth, Postgres, Storage, Edge Functions y Realtime.

## Stack detallado

### App móvil

- Expo
- React Native
- TypeScript
- Expo Router
- React Native Safe Area Context
- React Native Gesture Handler
- React Native Reanimated si hace falta

### UI

Opción A recomendada:

- NativeWind
- Componentes propios

Opción B si NativeWind complica el setup:

- StyleSheet + theme tokens propios

Prioridad: app funcional > framework de estilos perfecto.

### Estado y datos

- TanStack Query para datos server/cache.
- Zustand para estado local ligero.
- React Context solo para Auth/session si es simple.

### Backend

- Supabase Auth.
- Supabase PostgreSQL.
- Supabase Storage.
- Supabase Edge Functions.
- Supabase Realtime opcional.

### Notificaciones

- expo-notifications.
- Expo Push Service.
- Supabase Edge Function `send-round-notification`.

### Cámara e imágenes

- expo-camera.
- expo-image-picker como fallback.
- expo-image-manipulator para comprimir/redimensionar antes de subir.

### Observabilidad

MVP:

- Console logging estructurado solo en dev.
- Error boundaries.

V1.1:

- Sentry.
- PostHog.

## Arquitectura de alto nivel

```txt
Expo App
  ├─ Auth / Session
  ├─ Expo Router Screens
  ├─ Feature modules
  ├─ Supabase client
  ├─ Query hooks
  ├─ UI components
  ├─ Push token registration
  └─ Deep linking

Supabase
  ├─ Auth
  ├─ Postgres tables
  ├─ RLS policies
  ├─ Storage bucket moments
  ├─ Edge Functions
  │   ├─ send-round-notification
  │   └─ close-round
  └─ RPC functions
      ├─ join_group_by_invite
      ├─ create_round_with_moment / create_moment
      ├─ toggle_reaction / toggle_round_star
      ├─ close_round
      ├─ get_weekly_leaderboard / get_my_profile_stats
      └─ register_device_token / unregister_device_token
```

## Principios de arquitectura

### 1. Separar features

No meter toda la lógica en screens.

Cada feature debe tener:

```txt
features/<feature>/
  api.ts
  hooks.ts
  types.ts
  components/
```

Ejemplos:

```txt
features/auth
features/groups
features/rounds
features/moments
features/reactions
features/ranking
features/moderation
features/notifications
```

### 2. Tipos compartidos

Crear tipos TypeScript para entidades:

- Profile
- SocialGroup
- GroupMember
- Round
- Moment
- Reaction
- PhotoVote
- LeaderboardRow
- DeviceToken
- Report
- Block

Ideal: generar tipos desde Supabase más adelante.
MVP: definir manualmente en `src/types/database.ts` o similar.

### 3. Backend manda en permisos

La UI puede ocultar botones, pero la seguridad real debe estar en Supabase RLS y funciones RPC.

Nunca confiar solo en frontend para:

- Ver grupos.
- Subir momentos.
- Votar.
- Evitar voto propio.
- Reportar.
- Leer fotos privadas.
- Limitar una reacción por foto o una Estrella por ronda.
- Derivar la identidad de estadísticas privadas.

### 4. No usar service role key en app

La app móvil solo puede tener:

- Supabase URL.
- Supabase publishable/anon key.

Nunca meter:

- Service role key.
- Secrets de Expo Push si los hubiera.
- Credenciales Apple/Google.

### 5. Edge Functions para acciones sensibles

Usar Edge Functions/RPC para:

- Enviar push notifications.
- Cerrar ronda.
- Calcular ganador.
- Unirse por invite code si se necesita seguridad.
- Moderación automática básica.

## Dependencias recomendadas

Instalación base orientativa:

```bash
npx create-expo-app@latest rondapp --template blank-typescript
cd rondapp

npx expo install expo-router react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated
npx expo install expo-camera expo-image-picker expo-image-manipulator
npx expo install expo-notifications expo-device expo-constants expo-linking expo-secure-store expo-haptics
npx expo install react-native-url-polyfill
npm install @supabase/supabase-js @tanstack/react-query zustand
npm install nativewind tailwindcss
npm install zod date-fns
npm install -D eslint prettier
```

Si NativeWind da guerra, Codex puede dejarlo preparado pero usar StyleSheet temporalmente.

## Configuración Expo

Usar `app.config.ts` o `app.json`.

Campos clave:

```ts
export default {
  expo: {
    name: 'Rondapp',
    slug: 'rondapp',
    scheme: 'rondapp',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: 'com.rosado.rondapp',
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription: 'Rondapp necesita la cámara para que puedas subir momentos a tus rondas.',
        NSPhotoLibraryUsageDescription: 'Rondapp puede usar tu galería si decides subir una foto existente.'
      }
    },
    android: {
      package: 'com.rosado.rondapp',
      permissions: ['CAMERA', 'POST_NOTIFICATIONS']
    },
    plugins: [
      'expo-router',
      'expo-camera',
      'expo-image-picker',
      'expo-notifications'
    ]
  }
}
```

Ajustar según versión Expo real.

## Supabase client

Archivo sugerido:

```txt
src/lib/supabase.ts
```

Debe:

- Importar `react-native-url-polyfill/auto`.
- Usar `createClient`.
- Leer variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Usar SecureStore/AsyncStorage según recomendación actual de Supabase para React Native.
- Serializar cambios de sesión con `processLock` y pausar/reanudar el refresco automático al
  cambiar el estado de la app.
- Manejar error si faltan variables.

## Data fetching

Usar hooks con TanStack Query.

Ejemplos:

```txt
useMyProfile()
useMyGroups()
useActiveRounds(groupId?)
useRound(roundId)
useMoments(roundId)
useWeeklyLeaderboard(groupId)
useMyProfileStats()
```

Mutations:

```txt
useCreateGroup()
useJoinGroupByCode()
useCreateRound()
useCreateMoment()
useToggleReaction()
useToggleRoundStar()
useCloseRound()
useReportMoment()
useBlockUser()
```

Las query keys privadas incluyen `userId` o se vacían al cambiar/cerrar sesión. El logout
desregistra el token push y limpia la cache antes de entregar la app a otra cuenta.

`useToggleReaction` y `useToggleRoundStar` aplican optimistic update a todas las vistas
afectadas, con snapshot y rollback si la RPC falla.

## Realtime

MVP puede hacer polling/refetch.

Si se implementa Realtime:

- Subscribe a moments por round.
- Subscribe a reactions/photo_votes por round.
- Refetch ranking cuando cierre ronda.

No bloquear MVP por Realtime.

## Storage

Bucket:

```txt
moments
```

Path recomendado:

```txt
{groupId}/{roundId}/{userId}/{momentId}.jpg
```

`roundId` y `momentId` nacen en el borrador y se reutilizan en cada retry. Las RPC de creación
son idempotentes para esos IDs; un timeout después del commit no debe borrar un objeto que ya
está referenciado por la base.

Imagen:

- Comprimir a ancho máximo 1280px.
- Calidad 0.75-0.85.
- Convertir a JPEG.
- Guardar content-type.

Privacidad:

- Preferible bucket privado con políticas de lectura para miembros del grupo.
- Si el MVP se bloquea por Storage RLS, documentar y resolver antes de probar con usuarios reales.
- Evitar bucket público salvo prototipo muy temporal y sabiendo la limitación.

## Edge Functions

### send-round-notification

Input:

```json
{
  "roundId": "uuid"
}
```

Debe:

1. Validar usuario autenticado.
2. Cargar ronda y grupo.
3. Verificar que el usuario es miembro.
4. Obtener miembros del grupo excepto creador.
5. Excluir miembros con `muted = true`.
6. Obtener Expo push tokens.
7. Enviar notificaciones vía Expo Push API.
8. Registrar resultado básico.

### close-round

Input:

```json
{
  "roundId": "uuid"
}
```

Debe:

1. Validar acceso.
2. Comprobar si está activa.
3. Comprobar si `now() >= closes_at` o si usuario tiene permiso para cerrar.
4. Calcular ganador.
5. Actualizar `rounds.status = 'closed'` y `winner_moment_id`.
6. Devolver resumen.

## Manejo de errores

Todos los hooks/mutations deben devolver errores entendibles.

No hacer `console.log` infinito.
No tragar errores silenciosamente.

Errores visibles:

- Sin permisos cámara.
- Sin red.
- Ronda cerrada.
- No miembro del grupo.
- No puedes votar tu foto.
- Fallo al subir imagen.
- Fallo al crear ronda.

## Testing técnico mínimo

Antes de considerar MVP funcional:

- `npm run lint` pasa.
- `npx tsc --noEmit` pasa.
- App arranca en Expo.
- Registro/login funciona.
- Se puede crear grupo.
- Se puede lanzar ronda.
- Se puede subir imagen.
- Se puede añadir/cambiar/retirar una reacción única y asignar/mover/retirar una Estrella.
- Ranking devuelve datos.
- `get_my_profile_stats()` solo devuelve estadísticas de `auth.uid()` y la bebida no puntúa.
- Android preview APK compila.
- iOS preview build compila o queda documentado si faltan credenciales Apple.
