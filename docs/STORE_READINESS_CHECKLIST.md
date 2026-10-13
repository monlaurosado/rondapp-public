# Store Readiness Checklist

Fecha: 2026-07-09  
Estado general: HISTÓRICO; BETA_2026_07_13_PENDING_REVALIDATION.

> Los DONE inferiores describen el corte de 2026-07-09. No enviar a stores hasta reejecutar
> `BETA_READINESS.md`, generar evidencia visual actual y completar pruebas físicas.

## Delta de producto para stores

- [ ] Las screenshots muestran las cinco tabs, incluida Ranking visible.
- [ ] Ranking identifica el grupo activo y usa etiquetas descriptivas, sin títulos de
  personaje ni métricas de consumo.
- [ ] La ficha explica Estrella de la ronda; una persona puede asignarla, moverla y retirarla.
- [ ] Reacciones permiten una selección por foto, con cambio y retirada.
- [ ] `Tus momentos por bebida` se describe como metadata privada sin puntuación ni
  comparación.
- [ ] Privacy questionnaire incluye fotos, push token, reportes/bloqueos y estadísticas
  privadas derivadas de momentos.
- [ ] El borrado de cuenta conserva correctamente contenido compartido de otras personas y el
  logout desvincula token/cache del dispositivo.

## App metadata

- [x] Nombre app
  - Valor: `Rondapp`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Slug Expo
  - Valor: `rondapp`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Scheme deep link
  - Valor: `rondapp`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Version app
  - Valor: `1.0.0`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Build number iOS
  - Valor inicial local: `ios.buildNumber = "1"`
  - Archivo: `app.config.ts`
  - Estado: DONE config; `eas.json` usa `cli.appVersionSource = "remote"` y `production.autoIncrement = true`.

- [x] iOS bundle identifier
  - Valor: `com.rosado.rondapp`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Version code Android
  - Valor inicial local: `android.versionCode = 1`
  - Archivo: `app.config.ts`
  - Estado: DONE config; EAS remote version source autoincrementa production.

- [x] Android package
  - Valor: `com.rosado.rondapp`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Icono y splash
  - Archivos: `assets/icon.png`, `assets/splash-icon.png`, `assets/favicon.png`
  - Estado: DONE local

- [x] Adaptive icon Android
  - Archivos: `assets/android-icon-foreground.png`, `assets/android-icon-background.png`, `assets/android-icon-monochrome.png`
  - Estado: DONE local

- [x] Permisos iOS
  - Valores:
    - `NSCameraUsageDescription`
    - `NSPhotoLibraryUsageDescription`
  - Archivo: `app.config.ts`
  - Estado: DONE

- [x] Permisos Android
  - Valores:
    - `CAMERA` via plugin `expo-camera`
    - `POST_NOTIFICATIONS`
  - Archivo: `app.config.ts`
  - Prueba: `npx expo config --type public`.
  - Estado: DONE; el config renderizado ya no incluye `RECORD_AUDIO`, porque la app no graba audio/video.

- [x] EAS project id
  - Variable: `EXPO_PUBLIC_EAS_PROJECT_ID`
  - Estado: DONE; `@rdrosado/rondapp` enlazado y Project ID configurado en `app.config.ts` y EAS environments.

## Legal y producto

- [x] Age gate 18+
  - Archivos: `app/(auth)/age-gate.tsx`, `src/features/auth/api.ts`
  - Estado: DONE local, QA Supabase pendiente.

- [x] No incentivar consumo de alcohol
  - Evidencia: copy de onboarding/ranking indica que bebida no puntua.
  - Estado: DONE local.

- [x] Grupos privados en MVP
  - Evidencia: no hay feed publico; RLS por membership.
  - Estado: DONE local, QA remoto pendiente.

- [x] Politica de privacidad base
  - Archivo: `app/privacy.tsx`
  - Estado: DONE base, pendiente revision legal antes de publicar.

- [x] Terminos de uso base
  - Archivo: `app/terms.tsx`
  - Estado: DONE base, pendiente revision legal antes de publicar.

- [x] Normas de comunidad
  - Archivo: `app/community-guidelines.tsx`
  - Estado: DONE base.

- [x] Reportar contenido
  - Archivo: `app/modals/report.tsx`
  - Estado: DONE local, QA Supabase pendiente.

- [x] Bloquear usuarios
  - Archivos: `src/features/moderation/api.ts`, `src/features/rounds/components/moment-card.tsx`
  - Estado: DONE local, QA multiusuario pendiente.

- [x] Borrar contenido propio
  - Archivos: `src/features/rounds/api.ts`, `src/features/rounds/components/moment-card.tsx`
  - Estado: DONE local, QA Storage pendiente.

- [x] Borrar cuenta
  - Archivos: `app/delete-account.tsx`, `app/settings.tsx`, `src/features/auth/api.ts`, `supabase/functions/delete-account/index.ts`
  - Estado: DONE local; deploy y prueba real BLOCKED_EXTERNAL por `SUPABASE_SERVICE_ROLE_KEY` y funciones Supabase.
  - Accion antes de submission: desplegar `delete-account`, probar con cuenta de prueba y confirmar que el usuario queda sin acceso.

- [x] Contacto soporte visible
  - Archivos: `app/support.tsx`, `app/settings.tsx`, `app/(tabs)/profile.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `app/community-guidelines.tsx`, `src/constants/support.ts`
  - Valor: `soporte@rondapp.app`
  - Estado: DONE local; verificacion de buzon real BLOCKED_EXTERNAL.
  - Accion antes de submission: confirmar que el dominio/buzon recibe correo y usar el mismo contacto en App Store/Play Store.

## App Store readiness

- [x] No depende de Expo Go para release
  - Evidencia: `eas.json` tiene profiles `development`, `preview`, `production`.
  - Estado: DONE config.

- [x] iOS Apple Sign In declarado
  - Archivo: `app.config.ts`
  - Valor: `ios.usesAppleSignIn = true`
  - Estado: DONE config.

- [ ] Apple Developer account
  - Estado: BLOCKED_EXTERNAL.
  - Accion: entrar en EAS con cuenta Apple, configurar signing y App Store Connect.

- [ ] TestFlight build
  - Estado: BLOCKED_EXTERNAL.
  - Comando:
    ```bash
    npx eas-cli build -p ios --profile production
    npx eas-cli submit -p ios --latest
    ```

- [ ] App privacy questionnaire
  - Estado: BLOCKED_EXTERNAL.
  - Datos esperados: cuenta, email, fotos subidas, identificador de usuario, push token, reportes/bloqueos.

- [ ] Screenshots iOS
  - Estado: BLOCKED_EXTERNAL.
  - Recomendado: onboarding, home con grupo, lanzar ronda, detalle de ronda, ranking, perfil.

## Play Store readiness

- [x] Android preview APK configurado
  - Archivo: `eas.json`
  - Valor: `build.preview.android.buildType = "apk"`
  - Estado: DONE config.

- [x] Android production AAB preparado
  - Archivo: `eas.json`
  - EAS production genera AAB por defecto.
  - Estado: DONE config.

- [ ] Google Play Console
  - Estado: BLOCKED_EXTERNAL.
  - Accion: crear app, configurar signing, service account y track internal/closed.

- [ ] Internal testing APK/AAB
  - Estado: BLOCKED_EXTERNAL.
  - Comando:
    ```bash
    npx eas-cli build -p android --profile preview
    ```

- [ ] Data safety form
  - Estado: BLOCKED_EXTERNAL.
  - Datos esperados: cuenta, contenido generado por usuario, fotos, identificadores, notificaciones, reportes.

- [ ] Screenshots Android
  - Estado: BLOCKED_EXTERNAL.

## Supabase production readiness

- [x] Migraciones aplicadas
  - Estado: DONE.
  - Evidencia: `db push --linked`, `migration list --linked`, consultas remotas RLS/storage/RPC y `db advisors --linked --type all --level warn --fail-on error` pasan sin errores.
  - Comando:
    ```bash
    npx supabase link --project-ref bckrwqvvmjjorunbzxbo
    npx supabase db push --linked
    ```

- [ ] Auth providers Google/Apple activos
  - Estado: Google DONE; Apple BLOCKED_EXTERNAL.
  - Comando:
    ```bash
    set -a
    source supabase/.env
    set +a
    npx supabase config push --project-ref bckrwqvvmjjorunbzxbo
    ```

- [x] Edge Functions desplegadas
  - Estado: DONE; `send-round-notification`, `close-round` y `delete-account` estan ACTIVE en remoto.
  - Comando:
    ```bash
    npx supabase functions deploy send-round-notification --project-ref bckrwqvvmjjorunbzxbo
    npx supabase functions deploy close-round --project-ref bckrwqvvmjjorunbzxbo
    npx supabase functions deploy delete-account --project-ref bckrwqvvmjjorunbzxbo
    npx supabase secrets list --project-ref bckrwqvvmjjorunbzxbo
    ```

## Evidencia tecnica

Ultimos gates locales:

- `npm run qa:release:local`: PASS; gate agregado local no externo.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run qa:release:static`: PASS; docs obligatorios, secretos de cliente, copy prohibido y config nativa.
- `npx expo-doctor`: PASS tras actualizar Expo a `~57.0.4`.
- `npx expo export --platform all --output-dir /tmp/rondapp-export`: PASS despues de esta tanda; export final de 14M.
- `npx --yes deno check supabase/functions/*/index.ts`: PASS en las tres funciones.
- `npx expo config --type public`: PASS; confirma `ios.buildNumber`, `android.versionCode` y permisos Android sin `RECORD_AUDIO`.
- `npx --yes supabase migration list --local`: PASS; migraciones locales aplicadas.
- `npx --yes supabase db reset --local`: PASS; migraciones aplican desde cero.
- `npx --yes supabase db lint --local --fail-on error`: PASS; sin errores de esquema.
- `npx --yes supabase db advisors --local --type all --level warn --fail-on error`: PASS; sin issues.
- `npm run qa:supabase:local`: PASS; QA multiusuario local para RLS/RPC/Storage.

## Resultado

El repo tiene configuracion base de tienda, permisos, identidad, builds, legal minimo, soporte visible y borrado de cuenta implementado localmente. La publicacion real queda bloqueada por cuentas externas, OAuth, EAS, deploy de funciones y QA con build interna. Antes de subir a review faltan verificar buzon de soporte, probar `delete-account` desplegada, generar screenshots, completar formularios de privacidad y ejecutar prueba funcional con usuarios reales.
