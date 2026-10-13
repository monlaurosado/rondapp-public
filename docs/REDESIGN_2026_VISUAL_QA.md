# Rondapp 2026 - QA visual y regresion

> **HISTÓRICO — corte previo al beta 2026-07-13.** Las capturas, nombres de archivo y checks
> siguientes no cuentan como evidencia actual. Ver `BETA_READINESS.md`.

Fecha: 9 de julio de 2026  
Build revisada: Expo local en `http://localhost:8081`

## Evidencia

Capturas finales guardadas fuera del repositorio:

- `/tmp/rondapp-redesign-qa/01-onboarding-360x740.png`
- `/tmp/rondapp-redesign-qa/01b-onboarding-390x844.png`
- `/tmp/rondapp-redesign-qa/02-login-390x844.png`
- `/tmp/rondapp-redesign-qa/03-home-390x844.png`
- `/tmp/rondapp-redesign-qa/04-groups-390x844.png`
- `/tmp/rondapp-redesign-qa/05-group-detail-390x844.png`
- `/tmp/rondapp-redesign-qa/06-launch-390x844.png`
- `/tmp/rondapp-redesign-qa/07-round-detail-390x844.png`
- Captura histórica 08: estado del voto a 390x844; el archivo temporal ya no se considera
  evidencia actual.
- `/tmp/rondapp-redesign-qa/09-ranking-390x844.png`
- `/tmp/rondapp-redesign-qa/10-profile-390x844.png`
- `/tmp/rondapp-redesign-qa/11-home-web-1280x900.png`
- `/tmp/rondapp-redesign-qa/compare-onboarding.png`
- `/tmp/rondapp-redesign-qa/compare-login.png`

## Viewports

- 360 x 740: Android pequeno aproximado, onboarding completo con las dos CTAs visibles.
- 390 x 844: viewport movil principal para auth y flujo autenticado.
- 1280 x 900: Expo Web; contenido centrado a 760 px y hero con caras visibles.

## Rutas y estados revisados

- `/onboarding`: hero fotografico, parallax, mensajes y CTAs.
- `/login`, `/register`, `/check-email`: formularios, proveedor Google y ausencia limpia de Apple
  desactivado.
- `/home`: ronda activa, preview signed, grupos, mini ranking, pull-to-refresh y tab bar.
- `/groups`: lista, crear/unirse y empty state por revision de codigo.
- `/group/[groupId]`: header, miembros, invitacion, mute y rondas.
- `/launch`: selector con preseleccion visible cuando solo existe un grupo.
- Camara/composer: permisos, galeria, giro, preview, chips y error persistente por revision de
  codigo y export. No se acepto permiso de camara durante QA web.
- `/round/[roundId]`: hero, cuenta atras, lista de momentos y estados abiertos.
- Estrella de la ronda: default, own-photo disabled y voted. Se ejecuto un voto QA y el estado cambio a
  `Tu Estrella de la ronda` con el contador actualizado.
- Reacciones: selected, disabled own-photo y contadores.
- `/ranking`: selector, podio 2-1-3, lista y puntuacion semanal.
- `/profile`: identidad, stats, grupos, settings y tab bar.
- Ajustes, reportar, detalle de momento, borrar cuenta, soporte y legales: revision visual de
  componentes y navegacion; acciones destructivas no se confirmaron.

## Comparacion antes/despues

- Onboarding: se elimina la repeticion de cuatro marcas/cards y se introduce una foto social
  protagonista. La accion primaria sigue visible y la informacion se escanea sin bloques anidados.
- Login: desaparece el hero duplicado y la instruccion tecnica de Apple. El formulario empieza
  antes, mantiene contexto de marca y cabe completo en 390 x 844.
- Home: la ronda activa ocupa el primer gesto, con foto, grupo, tiempo y respuesta en un solo hero.
- Ranking: pasa de tarjeta/tablas a podio 2-1-3 y filas compactas.

## Contraste y glass

- Texto sobre foto siempre lleva overlay entre photoLight y photoStrong.
- Texto muted no se coloca directamente sobre imagen.
- CTA amber/lime usa `text.inverse`; acciones secundarias usan `text.primary`.
- Glass en listas largas fue sustituido por `surface.card` con borde glass.
- `GlassCard` mantiene overflow hidden y BlurView solo para superficies donde aporta jerarquia.

## Safe areas y thumb zone

- Tab bar usa `useSafeAreaInsets` y separacion inferior minima.
- Camara posiciona top bar y controles con insets nativos.
- CTAs de onboarding, Home, Launch, Estrella de la ronda y composer tienen al menos 52 px.
- IconButton y filas tactiles mantienen minimo 44 x 44 px.
- Scrolls reservan 118 px inferiores para que la tab bar no impida alcanzar contenido.

## Motion y parallax

- Parallax por scroll: onboarding, Home, detalle de grupo, detalle de ronda y perfil.
- Fondo ambiental usa drift lento y capas completas, no giroscopio.
- Press spring, stagger corto, reaction pop, Estrella de la ronda shine e indicador de tab bar.
- `useReducedMotion` elimina parallax/scale no esenciales y fija skeleton/fondo.
- Reportar y borrar cuenta no usan motion celebratorio.

## Android y web

- Blur usa `dimezisBlurViewSdk31Plus`; Android anterior cae a la surface opaca legible.
- No hay blur por item en MomentCard, ranking o grupos.
- Lucide sustituye SF Symbols para evitar iconos vacios en web/Android.
- Expo export genero web, Android e iOS sin error.
- La verificacion fisica de blur y camara Android queda fuera de esta sesion.

## Estados de sistema

- Loading: skeleton hero + avatar + copy, pulse barato.
- Empty: copy contextual y CTA cuando existe una salida.
- Error: mensaje persistente y retry.
- Upload: conserva preview y error; permite reintento sin perder la foto.
- Proveedor OAuth desactivado: no se renderiza ni expone configuracion interna.

## Regresion ejecutada

```text
npm run typecheck                 PASS
npm run lint                      PASS
npm run qa:release:static         PASS
npm run qa:release:local          PASS
npx expo-doctor                   20/20 PASS
deno check Edge Functions         PASS
expo export --platform all        PASS
git diff --check                  PASS
```

## No probado fisicamente

- Camara real, selector de galeria y teclado nativo.
- Haptics en iPhone/Android.
- Blur en Android SDK 30, 31+ y fabricantes concretos.
- Dynamic Type extremo y VoiceOver/TalkBack completos.
- Apple Sign In, porque el proveedor remoto sigue desactivado.

## Checklist final obligatoria

- [x] Onboarding rediseñado.
- [x] Login rediseñado.
- [x] Registro rediseñado.
- [x] Check email rediseñado.
- [x] Age gate rediseñado.
- [x] Complete profile rediseñado.
- [x] Home rediseñada.
- [x] Grupos rediseñados.
- [x] Crear grupo rediseñado.
- [x] Unirse a grupo rediseñado.
- [x] Grupo detalle rediseñado.
- [x] Launch/camara/composer rediseñado.
- [x] Ronda detalle rediseñada.
- [x] MomentCard rediseñada.
- [x] StarButton rediseñado.
- [x] ReactionDock rediseñado.
- [x] Ranking rediseñado.
- [x] Perfil rediseñado.
- [x] Ajustes rediseñados.
- [x] Reportar/bloquear/borrar cuenta revisados.
- [x] Tab bar revisada.
- [x] Glass system revisado.
- [x] Parallax implementado donde aporta.
- [x] Reduced motion aplicado.
- [x] Android blur fallback revisado.
- [x] Web export revisado.
- [x] iPhone/Android pequeno contemplados.
- [x] TypeScript PASS.
- [x] ESLint PASS.
- [x] QA release local PASS.
- [x] Export all PASS.
