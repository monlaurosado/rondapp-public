# Build and Testing

> **CORTE 2026-07-13:** resultados repetidos después del último cambio. Son locales y no
> sustituyen smoke remoto ni QA física iOS/Android.

## Checks locales

```bash
npm install
npx supabase db reset --local
npm run qa:supabase:local
npm run qa:release:local
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform all --output-dir /tmp/rondapp-export
```

Estado del corte 2026-07-13:

- `npx supabase db reset --local --no-seed`: OK; 11 migraciones desde cero.
- `npm run qa:supabase:local`: OK; smoke multiusuario completo.
- `npm run qa:release:local`: OK.
- `npm run qa:navigation`: OK; continuidad `next` y rechazo de rutas no permitidas.
- `npm run typecheck`: OK.
- `npm run lint`: OK.
- `npx expo-doctor`: OK, 20/20 checks.
- `npx expo export --platform all --output-dir /tmp/rondapp-export`: OK.
- Deno fmt (6 fuentes) y check (5 Edge Functions): OK.
- DB lint/advisors en umbrales de release: OK; lint sin resultados y Advisors solo INFO.
- `npm audit --omit=dev --audit-level=high`: OK. Quedan 11 moderadas transitivas de Expo/xcode/uuid; `npm audit fix --force` propone cambio incompatible, no aplicado.

## Desarrollo

```bash
npm run start
```

Probar primero en Expo Go. Crear development/preview build solo si hace falta validar comportamiento nativo real de push/deep links.

## Android APK preview

Requisitos:

- `eas login`
- Proyecto EAS configurado.
- Variables de entorno en EAS.

Comando:

```bash
npm run build:android:preview
```

`eas.json` genera APK por `preview.android.buildType = "apk"`.

## iOS interno

Opciones:

- Ad Hoc / Internal distribution para pocos dispositivos con UDID registrado.
- TestFlight para beta con mas testers.

Comando:

```bash
npm run build:ios:preview
```

Requiere Apple Developer Program y `eas login`.

EAS está autenticado como `rdrosado` y el proyecto `@rdrosado/rondapp` está enlazado. El APK
preview disponible corresponde al 2026-07-09; falta generar Android/iOS desde el árbol actual.

## QA manual minimo

1. Registro con email real.
2. Confirmar email desde el movil y volver por deep link.
3. Confirmar 18+.
4. Completar perfil.
5. Crear grupo.
6. Copiar enlace/codigo e invitar otro usuario.
7. Unirse al grupo.
8. Lanzar ronda con camara.
9. Subir momento desde otro usuario.
10. Añadir/cambiar/retirar una única reacción por foto.
11. Asignar/mover/retirar la Estrella en foto ajena e intentar usarla en foto propia.
12. Reportar momento.
13. Bloquear usuario.
14. Silenciar grupo.
15. Ver las cinco tabs; comprobar Ranking, selector de grupo y desglose.
16. Cerrar ronda expirada / validar resultado.
17. Verificar `Tus momentos por bebida` solo para la cuenta autenticada y sin cambios de score.
18. Probar logout/login con otra cuenta y retry de publicación sin duplicados.

## Limitaciones externas

- Push real requiere permisos de dispositivo y EAS project ID.
- iOS Ad Hoc/TestFlight requiere cuenta Apple Developer.
- Email branding/SMTP requiere configuracion Dashboard Supabase.
