# Rondapp — Pack de contexto para Codex

Este directorio contiene la documentación funcional, técnica y de producto del beta de
**Rondapp**, una app móvil social privada para grupos donde los usuarios lanzan una ronda,
suben momentos, reciben notificaciones, reaccionan, asignan su Estrella de la ronda y
consultan un ranking semanal por grupo.

Empieza por `BETA_READINESS.md`: fija el contrato vigente y distingue las comprobaciones
pendientes de los informes históricos. Si un informe antiguo contradice ese documento o la
migración más reciente, prevalecen el contrato beta y
`20260713092422_beta_integrity_star_reactions_stats.sql`.

## Objetivo del pack

Meter estos `.md` en la raíz del proyecto para que Codex tenga contexto persistente y no tenga que adivinar la intención del producto.

## Stack recomendado

- **App móvil:** Expo + React Native + TypeScript
- **Navegación:** Expo Router
- **Backend:** Supabase Auth + PostgreSQL + Storage + Edge Functions + Realtime
- **Estado/datos:** TanStack Query + Zustand
- **UI:** NativeWind o componentes propios con StyleSheet si NativeWind complica el build
- **Notificaciones:** expo-notifications + Expo Push Service
- **Builds internas:** EAS Build
- **Testing con amigos:** Android APK por EAS internal distribution; iPhone por TestFlight o iOS Ad Hoc con dispositivos registrados

## Archivos incluidos

1. `00_PRODUCT_CONTEXT.md` — Visión, posicionamiento, principios y límites.
2. `01_BRAND_NAMING_COPY.md` — Nombre, tono, copy y lenguaje permitido/prohibido.
3. `02_PRODUCT_SPEC_MVP.md` — Especificación completa del MVP.
4. `03_USER_FLOWS.md` — Flujos principales de usuario.
5. `04_UX_UI_SPEC.md` — Pantallas, navegación y detalles UX.
6. `05_TECH_STACK_ARCHITECTURE.md` — Arquitectura técnica y stack.
7. `06_DATA_MODEL_SUPABASE.md` — Modelo de datos, tablas, RLS, funciones y SQL de referencia.
8. `07_SECURITY_PRIVACY_MODERATION.md` — Seguridad, privacidad, edad, moderación y antiabuso.
9. `08_GAMIFICATION_RANKING.md` — Rankings, votos, reacciones, badges y recaps.
10. `09_NOTIFICATIONS_DEEP_LINKS.md` — Push notifications y deep linking.
11. `10_TESTING_DISTRIBUTION_BUILDS.md` — Cómo generar APK y build iPhone sin publicar aún.
12. `11_ENV_CONFIG_PROJECT_STRUCTURE.md` — Variables, estructura de carpetas y configuración.
13. `12_DEFINITION_OF_DONE_QA.md` — Criterios de terminado, QA y checklist.
14. `MASTER_GOAL_PROMPT.md` — Prompt maestro para darle a Codex.
15. `BETA_READINESS.md` — Contrato beta vigente, matriz de verificación y pendientes reales.

## Regla de oro del producto

**La app no premia beber más. Premia crear mejores momentos sociales dentro de un grupo privado.**

La bebida puede ser alcohólica o no alcohólica, pero no debe sumar puntos por tipo de bebida ni empujar al consumo. La puntuación se basa en rondas iniciadas, fotos subidas, participación, reacciones, votos recibidos y fotos ganadoras.

La navegación principal tiene cinco destinos visibles: Inicio, Grupos, Cámara/Lanzar,
Ranking y Perfil. Ranking y cualquier vista con datos de grupo muestran el grupo activo de
forma explícita y recuerdan la última selección válida; nunca se usa silenciosamente el
primer grupo de una lista.
