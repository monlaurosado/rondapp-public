# 10 — Testing y distribución interna sin publicar en tiendas

## Objetivo

Permitir que amigos prueben Rondapp en Android y iPhone antes de publicarla en App Store o Google Play.

## Resumen recomendado

### Android

Usar **EAS Build internal distribution** para generar un `.apk` instalable directamente.

Comando objetivo:

```bash
eas build -p android --profile preview
```

El resultado será un enlace de descarga/instalación. En Android se podrá instalar aceptando el aviso de “instalar apps desconocidas”.

### iPhone

Hay dos caminos:

1. **TestFlight**: mejor para más amigos y feedback algo más serio.
2. **Ad Hoc / EAS internal distribution**: mejor para pocos testers, pero hay que registrar UDIDs de cada iPhone y reconstruir la build.

Ambos requieren Apple Developer Program para distribuir en dispositivos reales fuera de Expo Go.

## Expo Go vs Development Build vs Preview Build

### Expo Go

Sirve para desarrollo rápido, pero no es ideal para este producto porque:

- Puede no soportar todo igual que una build real.
- Push notifications y configuración nativa pueden tener limitaciones.
- No representa una app instalable final.

### Development build

Build interna con herramientas dev.

Uso:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Buena para desarrollo con dev client.

### Preview build

Build interna más parecida a producción.

Uso recomendado para amigos:

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

## `eas.json` recomendado

Crear en raíz:

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

Notas:

- `distribution: internal` en Android hace que la build sea directamente instalable.
- Para Android, `buildType: apk` asegura APK.
- Para iOS preview, EAS usará ad hoc/internal distribution y necesitará dispositivos registrados.

## Comandos iniciales EAS

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Comprobar configuración:

```bash
eas whoami
eas project:info
```

## Android APK para amigos

### Generar APK

```bash
eas build -p android --profile preview
```

### Compartir

Cuando termine:

- EAS dará URL.
- Compartir URL por WhatsApp/Telegram/email.
- El usuario descarga el APK.
- Android pedirá permiso para instalar apps desconocidas.
- El usuario instala.

### Problemas típicos Android

- El móvil bloquea instalación externa: activar permiso para ese navegador/app.
- APK antigua instalada con firma distinta: desinstalar build anterior.
- Push no llegan: revisar permisos Android 13+ y token.

## iPhone con Ad Hoc / EAS internal distribution

### Cuándo usarlo

- Pocos amigos.
- No quieres pasar todavía por TestFlight.
- Puedes registrar cada iPhone.

### Flujo

1. Tener cuenta Apple Developer.
2. Registrar dispositivos iOS de testers.
3. Crear build iOS preview.
4. Compartir URL de instalación.
5. Solo instalarán los dispositivos registrados antes de la build.

Comandos orientativos:

```bash
eas device:create
eas device:list
eas build -p ios --profile preview
```

Importante:

- Si añades un nuevo iPhone después, hay que reconstruir la build para incluir su UDID.
- Esto es normal en distribución Ad Hoc.

## iPhone con TestFlight

### Cuándo usarlo

- Quieres que varios amigos prueben sin registrar UDIDs manualmente.
- Quieres feedback/crash reports más ordenados.
- No te importa crear app en App Store Connect y pasar revisión beta inicial.

### Flujo

1. Apple Developer Program.
2. Crear app en App Store Connect.
3. Build iOS production o preview compatible con TestFlight.
4. Subir build.
5. Crear grupo de testers.
6. Invitar por email o link público.
7. Apple puede revisar la build para beta externa.
8. Testers instalan TestFlight y aceptan invitación.

Comandos orientativos:

```bash
eas build -p ios --profile production
eas submit -p ios --latest
```

O subir manualmente según configuración.

## Recomendación para este proyecto

### Primera prueba técnica

```txt
Android: APK preview
iPhone propio: development/preview build por EAS
```

### Prueba con 5-10 amigos

```txt
Android: APK preview
IPhone: Ad Hoc si son pocos y puedes registrar UDIDs
```

### Prueba con más gente

```txt
Android: testing interno/cerrado de Google Play si ya toca
IPhone: TestFlight
```

## Variables y configuración antes de build

Revisar:

- `app.config.ts` con bundle/package correctos.
- `scheme: rondapp`.
- Icon y splash básicos.
- Permisos cámara/notificaciones.
- Supabase URL y publishable key.
- EAS project ID si expo-notifications lo necesita.
- Build number/version.

## Bundle identifiers

Provisional:

```txt
iOS bundleIdentifier: com.rosado.rondapp
Android package: com.rosado.rondapp
```

No cambiarlos a lo loco después si ya hay testers con builds instaladas.

## Versionado

App version inicial:

```txt
1.0.0
```

Build numbers:

- Android versionCode autoincrement.
- iOS buildNumber autoincrement.

EAS puede gestionar versionado remoto.

## Checklist build Android

- [ ] `npx tsc --noEmit` pasa.
- [ ] App arranca localmente.
- [ ] Login funciona.
- [ ] Cámara funciona.
- [ ] Subida Supabase funciona.
- [ ] `eas build -p android --profile preview` pasa.
- [ ] APK se instala en al menos 1 Android físico.
- [ ] Push permission funciona.

## Regresión funcional obligatoria del beta

Estos checks no quedan superados por generar un export o un build:

- [ ] Los cinco destinos Inicio, Grupos, Cámara/Lanzar, Ranking y Perfil son visibles.
- [ ] Cambiar de cuenta no reutiliza datos, imágenes firmadas ni token push de la anterior.
- [ ] Una persona solo mantiene una reacción por foto; puede cambiarla y retirarla con
  rollback correcto si falla la red.
- [ ] La Estrella se puede asignar, mover y retirar; se rechazan foto propia y ronda cerrada.
- [ ] Ranking exige grupo explícito, recuerda el último válido y muestra todo el desglose.
- [ ] `Tus momentos por bebida` solo muestra datos de la cuenta autenticada y no da puntos.
- [ ] Reintentar una subida no duplica ronda, momento, Storage ni push.
- [ ] Reportes, bloqueos y Storage no filtran contenido oculto o ajeno.
- [ ] QA visual nueva cubre 320×568, 360×800, 390×844 y 430×932. Los reportes visuales
  históricos no satisfacen este punto.

## Checklist build iOS

- [ ] Apple Developer activo.
- [ ] Bundle ID configurado.
- [ ] Dispositivos registrados si Ad Hoc.
- [ ] `eas build -p ios --profile preview` pasa.
- [ ] Build instala en iPhone físico registrado.
- [ ] Cámara funciona.
- [ ] Push permission funciona.
- [ ] Deep link desde notificación abre ronda.

## Qué debe hacer Codex

Codex debe dejar preparado:

- `eas.json`.
- `app.config.ts`.
- Scripts en `package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "qa:release:local": "node scripts/qa-release-local.mjs",
    "qa:supabase:local": "node scripts/qa-supabase-local.mjs",
    "build:android:preview": "node scripts/build-android-preview.mjs",
    "build:ios:preview": "npx eas-cli build -p ios --profile preview"
  }
}
```

- Documentación final en `docs/BUILD_TESTING.md` o equivalente.

## No bloquear por credenciales externas

Codex no puede inventar:

- Cuenta Apple Developer.
- Cuenta Expo.
- Cuenta Supabase.
- Credenciales APNs.
- Dispositivos UDID reales.

Si faltan, debe:

1. Dejar configuración preparada.
2. Poner placeholders claros.
3. Documentar pasos exactos.
4. No romper la app.

## Referencias oficiales útiles

- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo internal distribution: https://docs.expo.dev/build/internal-distribution/
- Expo APK builds: https://docs.expo.dev/build-reference/apk/
- Expo EAS config: https://docs.expo.dev/build/eas-json/
- Apple TestFlight: https://developer.apple.com/testflight/
- Apple Ad Hoc profiles: https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/

## Nota Android 2026: verificación de desarrollador

A fecha de julio de 2026, para una prueba con amigos en España el camino práctico sigue siendo generar un APK preview y compartirlo directamente. Aun así, Android está desplegando requisitos de verificación de desarrollador para apps instaladas en dispositivos certificados fuera de Google Play.

Según documentación oficial de Android, desde septiembre de 2026 las apps en regiones seleccionadas deben estar registradas por un desarrollador verificado para poder instalarse en dispositivos Android certificados. El despliegue empieza por Brasil, Indonesia, Singapur y Tailandia, y continuará después. Para Rondapp, esto no bloquea el MVP inmediato en España, pero conviene tenerlo presente si se distribuye APK fuera de Google Play a largo plazo.

Referencia oficial: https://developer.android.com/developer-verification
