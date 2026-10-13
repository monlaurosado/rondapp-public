# Build Release Guide

Fecha: 2026-07-09  
Proyecto: Rondapp  
Supabase project ref: `bckrwqvvmjjorunbzxbo`

> Los estados PASS de este documento corresponden al corte indicado y son históricos. Tras
> la migración beta de 2026-07-13 deben reejecutarse; ver `BETA_READINESS.md`.

## Requisitos locales

- Node compatible con Expo SDK 57.
- npm.
- Expo/EAS via `npx`.
- Supabase CLI via `npx supabase`.
- Para builds iOS: Apple Developer Program y acceso a App Store Connect.
- Para Android production: Google Play Console y signing/config de Play.

## Instalar dependencias

```bash
npm install
```

## Variables de entorno app

Crear `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://bckrwqvvmjjorunbzxbo.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_yuzj7V75aZmVQ0Ff0nOIHQ_QP5Zo-lP
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_EAS_PROJECT_ID=79524085-51db-409a-b252-a1962a5b1049
```

El Project ID tambien tiene fallback publico en `app.config.ts`.

No poner `service_role`, OAuth secrets ni access tokens en variables `EXPO_PUBLIC_`.

## Variables secretas Supabase

Crear `supabase/.env` localmente o exportarlas en shell:

```env
SUPABASE_ACCESS_TOKEN=
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=
SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID=com.rosado.rondapp
SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=
```

Secrets para Edge Functions:

```env
SUPABASE_URL=https://bckrwqvvmjjorunbzxbo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
```

Hosted Edge Functions modernas tambien exponen `SUPABASE_SECRET_KEYS` y `SUPABASE_PUBLISHABLE_KEYS`; el codigo usa esas variables y mantiene fallback legacy.

## Arrancar local

```bash
npx expo start
```

Para probar en iPhone durante desarrollo:

1. Conectar iPhone y ordenador a la misma red.
2. Abrir Expo Go o development build.
3. Escanear QR de `npx expo start`.

Si se usan capabilities que requieren build nativa, usar development build:

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android
```

## Gates locales

Ejecutar antes de cada release:

```bash
npm run qa:release:local
```

Ese comando no arranca ni resetea Supabase local. Para QA de RLS/RPC/Storage multiusuario, ejecuta tambien `npm run qa:supabase:local` con Supabase local arrancado.

Estado histórico documentado (no PASS del beta actual):

- QA release local agregado: PASS con `npm run qa:release:local`.
- TypeScript: PASS.
- ESLint: PASS.
- QA estatico release: PASS con `npm run qa:release:static`; valida docs obligatorios, checklist sin `TODO`/`IN_PROGRESS`, secretos de cliente, copy anti-gamificacion y config nativa.
- Expo Doctor: PASS tras `expo ~57.0.4`.
- Export all: PASS despues de soporte/borrado/momento; `/tmp/rondapp-export` generado.
- Supabase local: PASS en `db reset --local`, `migration list --local`, `db lint --local --fail-on error` y `db advisors --local --type all --level warn --fail-on error`.
- Supabase remoto: PASS en `link`, `db push --linked`, `migration list --linked`, verificacion de RLS/storage/RPC y advisors remotos sin errores.
- Supabase QA multiusuario: PASS con `npm run qa:supabase:local`.
- Edge Functions: PASS con `npx --yes deno check` y deploy remoto ACTIVE para `send-round-notification`, `close-round` y `delete-account`.
- Google OAuth: PASS, `external.google=true`; Apple sigue pendiente.
- Deep link invite/auth continuity: PASS estatico con `npm run typecheck`, `npm run lint` y export; prueba real requiere build/dispositivo.

## Verificar o reaplicar migraciones Supabase

Ya aplicadas en remoto el 2026-07-09. Para verificar o reaplicar en otro entorno, requiere `SUPABASE_ACCESS_TOKEN` o MCP Supabase autenticado.

```bash
export SUPABASE_ACCESS_TOKEN=...
npx supabase link --project-ref bckrwqvvmjjorunbzxbo
npx supabase migration list --linked
npx supabase db push --linked
```

Migraciones relevantes recientes:

- `supabase/migrations/20260709133155_create_round_with_moment_rpc.sql`
- `supabase/migrations/20260709133913_restrict_closed_round_interactions.sql`
- `supabase/migrations/20260709144527_fix_group_members_update_policy.sql`
- `supabase/migrations/20260713092422_beta_integrity_star_reactions_stats.sql`

## QA Supabase local

Requiere Supabase local arrancado:

```bash
npx supabase start
npm run qa:supabase:local
npx supabase stop
```

El script crea usuarios locales temporales y valida RLS/RPC/Storage multiusuario sin mocks. Si falla, no se debe publicar ni aplicar migraciones remotas hasta corregir la causa.

## Aplicar o verificar Auth config

Google ya esta aplicado en remoto (`external.google=true`). Para reaplicar o verificarlo, requiere `SUPABASE_ACCESS_TOKEN`; Google OAuth puede cargarse desde el JSON local sin guardar el secreto en el repo:

```bash
export SUPABASE_ACCESS_TOKEN="PEGA_AQUI_TOKEN_SBP"
export GOOGLE_OAUTH_JSON="/ruta/local/client_secret_google.json"
npm run supabase:auth:google
npm run supabase:auth:configure
```

No imprimas estas variables ni las pongas en `.env.example`.

Redirect URLs esperadas:

```txt
rondapp://auth/callback
rondapp://**
exp://**
http://localhost:8081/auth/callback
http://127.0.0.1:8081/auth/callback
```

## Desplegar Edge Functions

Ya desplegadas en remoto el 2026-07-09. Para redeploy:

```bash
npx supabase functions deploy send-round-notification --project-ref bckrwqvvmjjorunbzxbo
npx supabase functions deploy close-round --project-ref bckrwqvvmjjorunbzxbo
npx supabase functions deploy delete-account --project-ref bckrwqvvmjjorunbzxbo
npx supabase secrets list --project-ref bckrwqvvmjjorunbzxbo
```

`send-round-notification` no debe bloquear creacion de ronda si falla; el cliente captura el error y sigue.
`delete-account` requiere clave admin server-side y nunca debe ejecutarse desde el cliente con service role/secret key.

## QA smoke remoto

Las migraciones, Google Auth, callbacks y Edge Functions ya estan aplicadas. El runner gestionado obtiene una secret API key solo en memoria para crear y limpiar usuarios confirmados; todas las operaciones de producto usan publishable key y sesiones reales:

```bash
export SUPABASE_ACCESS_TOKEN=...
npm run qa:supabase:remote:managed
```

El script crea owner/member/outsider, usa el prefijo `QA_RONDAPP_REMOTE`, valida los flujos principales y elimina cuentas, datos y objetos de Storage al terminar. No escribe ni imprime el access token o la secret API key.

## EAS login y proyecto

Estado aplicado: cuenta `rdrosado`, proyecto `@rdrosado/rondapp`, variables configuradas en los entornos EAS `development`, `preview` y `production`.

```bash
npx eas-cli whoami
npx eas-cli project:info
```

## EAS Update

Las builds usan `runtimeVersion.policy = appVersion` y canales separados. Para publicar cambios sin modificacion nativa:

```bash
npm run update:preview -- --message "Describe el cambio"
npm run update:production -- --message "Describe el cambio"
```

Si cambia una dependencia nativa, plugin, permiso o configuracion nativa, hay que incrementar version cuando corresponda y generar otra build.

## Versionado de builds

`app.config.ts` declara:

- `version = "1.0.0"`
- `ios.buildNumber = "1"`
- `android.versionCode = 1`

`eas.json` mantiene `cli.appVersionSource = "remote"` y `build.production.autoIncrement = true`. Segun la documentacion oficial de Expo, EAS puede gestionar remotamente `android.versionCode` e `ios.buildNumber`, y la version remota se inicializa desde el proyecto local si existe. Referencia: https://docs.expo.dev/build-reference/app-versions/

## Permisos nativos

La app solo necesita foto/camara y notificaciones. `app.config.ts` configura `expo-camera` y `expo-image-picker` con `microphonePermission: false` y `recordAudioAndroid: false` para no declarar `RECORD_AUDIO`, ya que Rondapp no graba audio ni video.

## Android preview APK

`eas.json` ya define preview como APK:

```bash
npx eas-cli build -p android --profile preview
```

Salida esperada: enlace EAS a un `.apk` instalable para testers internos.

## Android production AAB

```bash
npx eas-cli build -p android --profile production
```

Salida esperada: `.aab` listo para Play Console. Para submit:

```bash
npx eas-cli submit -p android --latest
```

Requiere service account de Google Play.

## iOS preview

Para distribuir a amigos fuera de App Store, iOS requiere Apple Developer y dispositivos registrados si se usa internal/ad hoc.

```bash
npx eas-cli device:create
npx eas-cli build -p ios --profile preview
```

## iOS TestFlight/App Store

```bash
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest
```

Requiere:

- Apple Developer Program.
- App Store Connect app creada.
- Bundle ID `com.rosado.rondapp`.
- Apple Sign In configurado.
- Privacy questionnaire y screenshots.

## Cosas que el codigo no puede resolver automaticamente

- Login EAS.
- Cuenta Apple Developer.
- Cuenta Google Play Console.
- Service account de Google Play.
- Credenciales Google OAuth.
- Credenciales Apple Sign In.
- `SUPABASE_ACCESS_TOKEN`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- SMTP/branding de email en Supabase.
- Formularios de privacidad de tiendas.
- Revision legal final de terminos/privacidad.

## QA recomendado antes de enviar a tiendas

1. Crear usuario A y B.
2. Confirmar edad en ambos.
3. Crear grupo con A.
4. Invitar/unirse con B.
5. Lanzar ronda con foto desde A.
6. B recibe aviso o abre ronda.
7. B sube momento, cambia/retira una reacción y asigna/mueve/retira su Estrella.
8. A no puede dar la Estrella a su propia foto ni interactuar tras el cierre.
9. Cerrar ronda expirada y validar ganador.
10. Ver las cinco tabs, Ranking, selector de grupo y desglose completo.
11. Reportar y bloquear usuario.
12. Probar logout A/login B sin cache, URL firmada ni token push cruzado.
13. Probar deep links auth, invite y ronda.
14. Verificar `Tus momentos por bebida` privado y sin impacto en puntos.
15. Reintentar una publicación tras timeout y confirmar que no duplica datos ni push.
