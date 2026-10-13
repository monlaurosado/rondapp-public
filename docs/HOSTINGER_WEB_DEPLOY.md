# Hostinger web deploy

Rondapp se publica como una SPA estatica e instalable (PWA) de Expo Router. El sitio de prueba es:

```text
https://darkgray-partridge-666122.hostingersite.com
```

## Ajustes de GitHub en Hostinger

- Framework: React
- Rama de produccion: `main`
- Node.js: `22.x`
- Directorio raiz: `./`
- Script de compilacion: `build`
- Directorio de salida: `dist`
- Gestor de paquetes: npm

Hostinger ejecuta `npm run build`. Ese script exporta solo web y genera:

- `dist/index.html`
- `dist/404.html`
- `dist/.htaccess`
- `dist/manifest.json`
- `dist/service-worker.js`
- iconos PWA y pantalla offline
- bundles y assets bajo `dist/_expo`

El fallback de Apache devuelve `index.html` para rutas del cliente como `/groups`,
`/join/:inviteCode` y `/auth/callback`, sin interceptar archivos reales.

El script Android conserva un modo de compatibilidad para el primer ajuste de
Hostinger, que se guardo por error con `build:android:preview` y salida `build`.
Solo se activa dentro de rutas de compilacion de Hostinger; en local y EAS el
comando sigue creando el APK preview habitual.

## Variables de entorno

Configurar en Hostinger usando los valores publicos de `.env.local`:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_EAS_PROJECT_ID
EXPO_PUBLIC_APP_LINK_BASE_URL=https://darkgray-partridge-666122.hostingersite.com
HOSTINGER_AUTO_DEPLOY=1
```

`HOSTINGER_AUTO_DEPLOY` no es un secreto; limita el modo de compatibilidad al
builder de Hostinger. No configurar `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_SERVICE_ROLE_KEY`, claves
secretas de Supabase ni secretos OAuth en el frontend.

## Supabase Auth

La URL de produccion debe estar en la lista de redirects permitidos:

```text
https://darkgray-partridge-666122.hostingersite.com/auth/callback
```

Para aplicar y verificar la configuracion mediante Management API:

```bash
SUPABASE_AUTH_SITE_URL=https://darkgray-partridge-666122.hostingersite.com \
npm run supabase:auth:configure
```

`SUPABASE_ACCESS_TOKEN` debe existir solo en el entorno local de esa terminal.

## Verificacion

```bash
npm ci
npm run qa:release:local
npm run build
npm run qa:pwa
test -f dist/index.html
test -f dist/404.html
test -f dist/.htaccess
```

Tras cada merge o push a `main`, Hostinger debe iniciar un nuevo deploy. Revisar
que `/`, `/groups` y `/auth/callback` respondan con la aplicacion y no con 404.

La instalación en iPhone y el checklist específico están documentados en
[`PWA_BETA_GUIDE.md`](PWA_BETA_GUIDE.md). El service worker y su registro se
sirven sin caché persistente para que cada despliegue pueda actualizarse; los
bundles versionados de Expo mantienen caché larga.

Las invitaciones compartidas usan este origen HTTPS para que también abran la
SPA cuando la app no está instalada. La captura nativa directa del enlace exige
publicar además `apple-app-site-association` y `assetlinks.json` con los IDs y
huellas de las credenciales de distribución definitivas; no deben inventarse a
partir de certificados locales.

Además, comprobar que las cinco tabs se renderizan, `/ranking` muestra el selector explícito
de grupo y `/profile` no expone estadísticas de otra cuenta. En la PWA instalada se debe
activar y probar Web Push desde Ajustes; un deploy web correcto no sustituye la QA nativa de
cámara, Expo Push o permisos de una futura build de TestFlight.
