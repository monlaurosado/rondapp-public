# Social Auth Setup - Rondapp

Fecha: 2026-07-07

> El estado remoto mencionado en este documento es histórico. Verificar providers y callbacks
> de nuevo antes del beta; no asumir PASS por la fecha indicada.

Este proyecto ya tiene implementados los botones y flujos de login rapido:

- Google: OAuth con Supabase + `expo-web-browser`.
- Apple en iOS: Sign in with Apple nativo + `signInWithIdToken`.
- Apple en web/Mac: OAuth con Supabase + `expo-web-browser`.

Para que funcionen en dispositivos reales hay que activar los proveedores en Supabase y crear las credenciales externas.

La app consulta `https://bckrwqvvmjjorunbzxbo.supabase.co/auth/v1/settings` y desactiva los botones si Supabase devuelve `external.google=false` o `external.apple=false`.

## Redirect URLs en Supabase

En Supabase Dashboard:

`Authentication > URL Configuration > Redirect URLs`

Anadir:

```text
rondapp://auth/callback
rondapp://**
exp://**
http://localhost:8081/auth/callback
http://127.0.0.1:8081/auth/callback
```

Estado remoto comprobado el 2026-07-09: `site_url=http://localhost:8081` y las cinco URLs estan aplicadas. Para reaplicar y verificar:

```bash
export SUPABASE_ACCESS_TOKEN=...
npm run supabase:auth:configure
```

El proyecto usa:

```ts
Linking.createURL("auth/callback")
```

En development build y builds internas debe resolver al scheme `rondapp://auth/callback`.

El callback conserva únicamente destinos internos seguros. Tras completar OAuth, las query
keys privadas se asocian al nuevo `userId`; logout desregistra el token push y vacía la cache
antes de aceptar otra cuenta.

Tambien queda versionado en:

```text
supabase/config.toml
```

Para aplicar esa configuracion por CLI necesitas un token de gestion de Supabase y las credenciales OAuth.

Si tienes el JSON de Google descargado, puedes cargarlo en variables de entorno sin escribir el secreto en archivos:

```bash
export SUPABASE_ACCESS_TOKEN=...
export GOOGLE_OAUTH_JSON="/ruta/local/client_secret_google.json"
npm run supabase:auth:google
```

No hagas `echo` de esas variables y no las guardes en archivos versionados.

## Google

En Google Cloud Console:

1. Crear/configurar OAuth consent screen.
2. Crear OAuth Client ID tipo `Web application`.
3. En Authorized redirect URIs anadir:

```text
https://bckrwqvvmjjorunbzxbo.supabase.co/auth/v1/callback
```

4. Copiar Client ID y Client Secret.

En Supabase Dashboard:

`Authentication > Providers > Google`

1. Activar Google.
2. Pegar Client ID y Client Secret.
3. Guardar.

Por CLI/Management API son estos campos:

```json
{
  "external_google_enabled": true,
  "external_google_client_id": "GOOGLE_CLIENT_ID",
  "external_google_secret": "GOOGLE_CLIENT_SECRET"
}
```

Si al tocar el boton ves:

```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

significa que Google sigue desactivado o sin credenciales validas en este proyecto Supabase.

Estado remoto comprobado el 2026-07-09:

- `external.email=true`
- `external.google=true`
- `external.apple=false`

Google OAuth ya fue aplicado con `npm run supabase:auth:google` usando el JSON local sin guardar ni imprimir el secret. Apple sigue pendiente de credenciales Apple Developer.

Scopes recomendados:

```text
openid
email
profile
```

## Apple

En Apple Developer:

1. Activar `Sign in with Apple` para el App ID del bundle:

```text
com.rosado.rondapp
```

2. Asegurarse de que la cuenta Apple Developer y EAS pueden firmar con esa capability.

Para Apple OAuth en web/Mac tambien hace falta:

```text
Services ID
Team ID
Key ID
AuthKey_XXXXXXXXXX.p8
Apple client secret generado desde la key .p8
```

En Supabase Dashboard:

`Authentication > Providers > Apple`

1. Activar Apple.
2. Configurar el proveedor segun el modo que uses.
3. Para el flujo nativo iOS, el token de Apple se intercambia en la app con:

```ts
supabase.auth.signInWithIdToken({ provider: "apple", token, nonce })
```

Notas:

- Apple solo devuelve nombre/email completos la primera vez que el usuario autoriza la app.
- El codigo guarda `full_name`, `given_name` y `family_name` en metadata cuando Apple los entrega.
- En iOS se usa el boton nativo de Apple.
- En web/Mac se muestra un boton propio y se usa OAuth de Supabase.
- `expo-apple-authentication` no funciona en Android ni web; por eso esos entornos usan OAuth.
- Si solo configuras Apple nativo iOS, el boton web/Mac no funcionara hasta tener Services ID y secret OAuth.

## Rehacer build

Como se han anadido modulos nativos y config:

- `expo-apple-authentication`
- `expo-web-browser`
- `expo-dev-client`
- `ios.usesAppleSignIn`
- plugins nativos en `app.config.ts`

Hay que crear una nueva development/preview build antes de probar Apple en iPhone:

```bash
eas build --profile development --platform ios
```

Para cambios futuros solo de JS/UI, despues de tener la build compatible instalada, puedes usar EAS Update.

## Verificacion local

```bash
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform all --output-dir /tmp/rondapp-social-auth-export
```
