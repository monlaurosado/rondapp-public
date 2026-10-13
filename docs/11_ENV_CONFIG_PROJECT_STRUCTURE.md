# 11 — Variables, configuración y estructura de proyecto

## Estructura recomendada

```txt
rondapp/
  app/
    _layout.tsx
    index.tsx
    (auth)/
      _layout.tsx
      onboarding.tsx
      login.tsx
      register.tsx
      age-gate.tsx
      complete-profile.tsx
    (tabs)/
      _layout.tsx
      home.tsx
      groups.tsx
      launch.tsx        # tab central Cámara/Lanzar
      ranking.tsx
      profile.tsx
    capture.tsx         # captura/preview compartida por lanzar y responder
    group/
      [groupId].tsx
    round/
      [roundId].tsx
    moment/
      [momentId].tsx
    modals/
      create-group.tsx
      join-group.tsx
      report.tsx
      settings.tsx
  src/
    components/
      ui/
      layout/
      feedback/
      rondas/
        star-button.tsx
    features/
      auth/
        api.ts
        hooks.ts
        types.ts
        components/
      profile/
      groups/
        selection.ts    # último grupo válido; nunca selección silenciosa de groups[0]
      rounds/
      moments/
      reactions/
      ranking/
      notifications/
      moderation/
    lib/
      supabase.ts
      queryClient.ts
      env.ts
      dates.ts
      images.ts
      navigation.ts
    stores/
      authStore.ts
      uiStore.ts
    types/
      database.ts
      domain.ts
    constants/
      copy.ts
      theme.ts
      drinks.ts
      reactions.ts
  supabase/
    migrations/
    functions/
      send-round-notification/
        index.ts
      close-round/
        index.ts
  assets/
    icon.png
    splash.png
  docs/
    BUILD_TESTING.md
    SETUP.md
  app.config.ts
  eas.json
  package.json
  tsconfig.json
  README.md
```

Codex puede ajustar la estructura si usa Expo Router de otra forma, pero debe mantener separación por features.

## Variables de entorno app

Archivo `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

Notas:

- En Expo, las variables públicas accesibles en app deben empezar por `EXPO_PUBLIC_`.
- No meter secrets privados con ese prefijo.

## Variables Edge Functions

En Supabase secrets:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
EXPO_ACCESS_TOKEN=optional-if-needed
```

Para enviar notificaciones vía Expo Push API puede no ser obligatorio `EXPO_ACCESS_TOKEN` al principio, según configuración. Si se usa, debe ser server-only.

## `src/lib/env.ts`

Debe validar variables:

```ts
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
};

export function assertEnv() {
  const missing = Object.entries(env)
    .filter(([key, value]) => key !== 'easProjectId' && !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}
```

Codex puede mejorar con Zod.

## `src/lib/supabase.ts`

Debe:

- Importar `react-native-url-polyfill/auto`.
- Crear cliente Supabase.
- Usar storage compatible con React Native.
- Exportar `supabase`.

## `app.config.ts`

Debe incluir:

- name.
- slug.
- scheme.
- ios.bundleIdentifier.
- android.package.
- permissions.
- plugins.
- extra.eas.projectId si procede.

Ejemplo base:

```ts
import 'dotenv/config';

export default {
  expo: {
    name: 'Rondapp',
    slug: 'rondapp',
    scheme: 'rondapp',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#111111'
    },
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
    ],
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      }
    }
  }
};
```

## `package.json` scripts

```json
{
  "scripts": {
    "start": "expo start",
    "start:clear": "expo start -c",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "build:android:preview": "eas build -p android --profile preview",
    "build:ios:preview": "eas build -p ios --profile preview",
    "build:all:preview": "eas build --profile preview --platform all"
  }
}
```

## Constants

### `src/constants/drinks.ts`

```ts
export const DRINK_TYPES = [
  { id: 'beer', label: 'Cerveza' },
  { id: 'tinto', label: 'Tinto de verano' },
  { id: 'wine', label: 'Vino' },
  { id: 'spirit', label: 'Copa' },
  { id: 'cocktail', label: 'Cóctel' },
  { id: 'vermouth', label: 'Vermut' },
  { id: 'soft_drink', label: 'Refresco' },
  { id: 'zero_zero', label: '0,0 / sin alcohol' },
  { id: 'water', label: 'Agua' },
  { id: 'other', label: 'Otro' },
  { id: 'prefer_not_say', label: 'Prefiero no decirlo' }
] as const;
```

Importante: esta lista no puntúa.

### `src/constants/reactions.ts`

```ts
export const REACTIONS = [
  { id: 'cheers', label: 'Brindis', emoji: '🍻' },
  { id: 'laugh', label: 'Risa', emoji: '😂' },
  { id: 'fire', label: 'Fuego', emoji: '🔥' },
  { id: 'wow', label: 'Brutal', emoji: '😮' }
] as const;
```

## Domain types

Ejemplo:

```ts
export type RoundStatus = 'active' | 'closed';
export type GroupRole = 'owner' | 'admin' | 'member';
export type ReactionType = 'cheers' | 'laugh' | 'fire' | 'wow';
export type VoteType = 'foton';
```

`VoteType` conserva el literal interno por compatibilidad SQL. Los componentes y el copy usan
Estrella de la ronda; el cliente muta con `toggleReaction` y `toggleRoundStar`.

## Query keys

Crear centralizado:

```ts
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  profileStats: (userId: string) => ['profile-stats', userId] as const,
  groups: (userId: string) => ['groups', userId] as const,
  group: (id: string) => ['group', id] as const,
  activeRounds: (userId: string, groupId?: string) => ['rounds', userId, 'active', groupId] as const,
  round: (userId: string, id: string) => ['round', userId, id] as const,
  moments: (userId: string, roundId: string) => ['moments', userId, roundId] as const,
  leaderboard: (userId: string, groupId: string, weekStart: string) =>
    ['leaderboard', userId, groupId, weekStart] as const,
};
```

Vaciar además la cache privada al cambiar o cerrar sesión para que las URLs firmadas y datos
de una cuenta nunca aparezcan en la siguiente.

## Error handling

Crear helpers:

```txt
src/lib/errors.ts
```

Debe mapear errores Supabase a mensajes de UI.

## Imagen helpers

`src/lib/images.ts`:

Funciones:

- `compressImage(uri)`.
- `uploadMomentImage({groupId, roundId, userId, momentId, uri})`.
- `getSignedMomentUrl(imagePath)`.

## Dates helpers

`src/lib/dates.ts`:

Funciones:

- `getWeekStart(date)`.
- `formatTimeLeft(closesAt)`.
- `isRoundExpired(round)`.

Semana empieza lunes.

## Build docs generadas por Codex

Codex debe crear:

```txt
docs/SETUP.md
docs/BUILD_TESTING.md
```

Con instrucciones reales según lo que implemente.

## Archivos que no deben commitearse

`.gitignore` debe incluir:

```txt
.env
.env.local
node_modules
.expo
.dist
android/.gradle
ios/Pods
*.jks
*.p8
*.mobileprovision
```

## Assets temporales

Si no hay diseño final, crear assets placeholder simples:

- icon.png
- splash.png

No bloquear MVP por branding.

## Convenciones de código

- TypeScript estricto si es viable.
- Componentes funcionales.
- Hooks para lógica.
- Nada de archivos gigantes.
- Nombres claros.
- No hacer mock permanente si ya hay backend.
- Comentarios solo donde aporten.

## Orden de implementación recomendado

1. Crear proyecto Expo.
2. Configurar TypeScript, Router y estructura.
3. Configurar Supabase.
4. Crear migraciones.
   La capa beta vigente termina en
   `20260713092422_beta_integrity_star_reactions_stats.sql`.
5. Auth + age gate + perfil.
6. Grupos.
7. Rondas/momentos.
8. Storage/cámara.
9. Reacciones y Estrella de la ronda.
10. Ranking.
11. Push notifications.
12. Moderación.
13. Build configs.
14. QA.
