# Visual QA Report - Rondapp

> **HISTÓRICO — corte previo al beta 2026-07-13.** Sus capturas y PASS no validan el estado
> actual. Hace falta una nueva ejecución visual; ver `BETA_READINESS.md`.

Fecha: 2026-07-06

## Estado

QA visual y tecnico completado para el rediseño Afterglow Glass en el alcance disponible desde codigo/export web. La app compila, lint pasa, Expo Doctor pasa y la exportacion web/iOS/Android se genera correctamente.

## Checks hechos

1. Auditoria visual previa documentada en `docs/VISUAL_AUDIT.md`.
2. Brand deck creado en `docs/BRAND_DECK.md`.
3. Sistema visual creado en `src/design/`.
4. Componentes UI/brand/rondas/ranking/navegacion creados o integrados.
5. Pantallas principales actualizadas para usar `Screen` variants, glass, marca, CTA y componentes nuevos.
6. TypeScript sin errores.
7. ESLint sin errores.
8. Expo Doctor sin issues.
9. Exportacion Metro para web/iOS/Android correcta.
10. Render web local de exportacion correcta con fallback SPA.
11. Capturas Playwright en 390x844 y 320x568.
12. Verificacion de que el servidor temporal se cerro despues de las capturas.

## Comandos ejecutados

```bash
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform all --output-dir /tmp/rondapp-export
npx serve -s /tmp/rondapp-export -l 8099
npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 http://127.0.0.1:8099/onboarding /tmp/rondapp-onboarding-mobile-wait.png
npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 http://127.0.0.1:8099/home /tmp/rondapp-home-route-mobile-wait.png
npx playwright screenshot --viewport-size=320,568 --wait-for-timeout=3000 http://127.0.0.1:8099/onboarding /tmp/rondapp-onboarding-small-fixed.png
```

## Resultados

- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `npx expo-doctor`: 20/20 checks pasan.
- `npx expo export --platform all --output-dir /tmp/rondapp-export`: pasa para web, iOS y Android.
- `curl -I http://127.0.0.1:8099/onboarding`: 200 OK con fallback SPA.
- Capturas con espera: onboarding y login auth-gated renderizan con fondo Afterglow, glass, marca y contraste legible.
- Viewport 320x568: el claim de `RondaLogo` ya no se corta tras el fix.

## Errores encontrados

### Captura prematura de animaciones

La primera captura Playwright se hizo justo al inicio de las animaciones de entrada y las cards parecian demasiado oscuras. Al repetir con `--wait-for-timeout=3000`, el contraste era correcto.

Arreglo: no hizo falta cambiar las cards; el informe de prueba debe esperar a que termine el stagger de entrada antes de evaluar contraste.

### Claim cortado en 320px

En viewport 320x568, el claim `Lanza la ronda. Enciende el grupo.` se salia horizontalmente en `RondaLogo`.

Arreglo: `src/components/brand/ronda-logo.tsx` ahora usa un bloque de texto flexible (`flex: 1`, `minWidth: 0`) y el claim usa `bodySmall`.

## Verificaciones especificas del prompt

- La app arranca: verificado con exportacion y servidor local de `/tmp/rondapp-export`.
- No hay errores TypeScript: verificado.
- No hay imports rotos: verificado por TypeScript y Metro export.
- No hay errores de dependencias de animacion: export iOS/Android/web pasa.
- Blur/gradients no rompen Android: export Android pasa; `GlassCard` y fondos tienen fallback de color/borde.
- Safe area: `AppScreen` y `GlassTabBar` usan safe-area/padding inferior.
- Tab bar no tapa contenido: `AppScreen` reserva `spacing.xxxl + 74`.
- Textos legibles: validado en onboarding/login con captura tras animacion.
- Botones accesibles: CTAs principales tienen 52px+ de alto y zonas tactiles grandes.
- Empty/loading/error diseñados: componentes nuevos creados e integrados.
- No parece plantilla: marca, fondos, glass, CTA y ranking tienen identidad propia.
- Coherencia: wrappers heredados (`Card`, `Button`, `Text`, `Screen`, `TextField`) ya apuntan al sistema nuevo.
- Pantallas pequenas: 320x568 validado en onboarding.
- Modo oscuro principal: toda la paleta y fondos son dark-first.
- Colores hardcodeados: el sistema centraliza tokens; quedan algunos estados puntuales heredados a revisar en futuras pasadas.
- Estilos duplicados: se redujo duplicacion con componentes base; algunas pantallas aun tienen layout styles locales, esperado en RN.
- Animaciones no excesivas: press, entrance, reaction, Estrella de la ronda y tab glow son sutiles.
- Reduced motion: contemplado mediante `useReducedMotion`.
- Glass mantiene contraste: verificado en auth/onboarding; pendiente repetir sobre fotos reales.
- Se siente como Rondapp: Afterglow Glass, marca y copy evitan alcoholismo competitivo.

## Pendientes

- Probar en iOS Simulator y Android Emulator con datos reales y sesion Supabase.
- Revisar contraste sobre fotos reales de momentos.
- Validar haptics en dispositivo fisico.
- Recorrer flujos privados completos: crear grupo, lanzar ronda, subir foto, asignar la Estrella de la ronda, ranking semanal.
- Repetir QA con reduce motion activado en sistema operativo real.
- Medir rendimiento en listas largas con muchas cards y blur.

## Recomendaciones siguientes

1. Hacer una pasada de QA en dispositivo fisico antes de enseñar la app.
2. Crear datos seed visuales para grupos/rondas/momentos y probar todos los estados.
3. Ajustar microcopy con acentos y tono final antes de beta.
4. Si el rendimiento Android baja, reducir blur en listas y mantener glass fuerte solo en headers, tab bar y CTAs.
5. Considerar `expo-font` con Space Grotesk/Inter en una iteracion separada.
