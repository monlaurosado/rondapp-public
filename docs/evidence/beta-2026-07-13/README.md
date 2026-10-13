# Evidencia visual beta — 2026-07-13

Esta carpeta contiene QA nuevo de Expo web contra Supabase local con datos reales de prueba.
Se usaron viewports de 320×568, 360×800, 390×844 y 430×932. El seed local incluye cinco
perfiles 18+, dos grupos, una ronda activa, una cerrada, ocho momentos, reacciones, Estrellas
y estadísticas privadas por bebida.

## Alcance

- Verifica composición responsive web, estados de producto y varios flujos funcionales con
  sesión real local.
- No equivale a QA física iOS/Android ni valida notch/safe areas nativas, teclado del sistema,
  Dynamic Type, cámara/galería nativas, push, haptics o rendimiento en dispositivo.
- `20-login-focused-reduced-height-390x500.png` usa un viewport reducido con el campo
  enfocado; no simula ni demuestra un teclado nativo abierto.
- La captura 05 fue eliminada: el modo full-page del navegador de QA alteró su escala y no era
  evidencia fiable. La numeración se conserva para mantener trazabilidad.

## Capturas válidas

| Archivo | Tamaño | Estado verificado |
| --- | --- | --- |
| `01-onboarding-320x568.png` | 320×568 | Onboarding y CTAs en ancho/alto mínimos. |
| `02-login-error-320x568.png` | 320×568 | Validación de login con error humano. |
| `03-home-active-320x568.png` | 320×568 | Inicio con ronda activa, resumen semanal y cinco tabs. |
| `04-ranking-breakdown-390x844.png` | 390×844 | Ranking con grupo activo, posiciones y desglose. |
| `06-ranking-empty-390x844.png` | 390×844 | Ranking sin actividad y valores cero. |
| `07-profile-stats-430x932.png` | 430×932 | Perfil, puntos y desglose por grupo/periodo. |
| `08-profile-drink-stats-430x932.png` | 430×932 | `Tus momentos por bebida`, totales y conteos privados. |
| `09-groups-360x800.png` | 360×800 | Dos grupos y nombres largos. |
| `10-group-detail-360x800.png` | 360×800 | Detalle de grupo, miembros, invitación y rondas. |
| `11-round-active-star-360x800.png` | 360×800 | Ronda activa y saldo de Estrella visible. |
| `12-round-reaction-star-controls-360x800.png` | 360×800 | Separación entre reacciones y voto; controles propios bloqueados. |
| `13-star-selected-reaction-360x800.png` | 360×800 | Reacción seleccionada y `Tu estrella` en otra foto. |
| `14-round-closed-winner-390x844.png` | 390×844 | Ganador determinista y acciones cerradas. |
| `15-camera-group-choice-390x844.png` | 390×844 | Cámara con varios grupos y preselección editable. |
| `16-camera-permission-recovery-390x844.png` | 390×844 | Acceso a cámara, galería y volver disponibles. |
| `17-camera-permission-timeout-390x844.png` | 390×844 | Timeout recuperable sin spinner infinito. |
| `18-outsider-access-denied-390x844.png` | 390×844 | Acceso ajeno rechazado con mensaje humano. |
| `19-age-gate-390x844.png` | 390×844 | Age gate dentro de un deep link protegido. |
| `20-login-focused-reduced-height-390x500.png` | 390×500 | Login enfocado en altura reducida sin CTA cortada. |

## Comprobaciones funcionales asociadas

- Estrella: retirar, volver a asignar, mover a otra foto y restaurar la selección inicial.
- Reacción: retirar el emoji seleccionado y volver a añadirlo sin crear duplicados.
- Ronda cerrada: reacción/Estrella deshabilitadas y ganador estable.
- Permiso de cámara web: timeout a los 12 segundos con retry, galería y volver todavía
  disponibles.
- Privacidad: outsider recibe copy humano, no un error `PGRST116`, y la consola queda limpia.
- Logout web: revoca la sesión local, vuelve a onboarding y no emite warnings de la app.
- Deep link: login → age gate → grupo exacto solicitado conserva `next` de extremo a extremo.

Los datos se preparan de forma local e idempotente con `npm run qa:visual:seed`. No se usó ni
modificó el proyecto Supabase remoto para producir esta evidencia.
