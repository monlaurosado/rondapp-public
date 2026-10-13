# MASTER GOAL PROMPT PARA CODEX

Copia y pega este prompt a Codex desde la raíz del proyecto. Antes de ejecutarlo, mete todos los `.md` de este pack en la raíz del repo o en `/docs/context/` y dile a Codex que los lea.

---

## GOAL

Construye una primera versión funcional y testeable de **Rondapp**, una app móvil social privada para iOS y Android hecha con **Expo + React Native + TypeScript + Supabase**, siguiendo todos los documentos de contexto incluidos en este proyecto.

Rondapp permite a usuarios mayores de 18 años crear grupos privados, lanzar una ronda, subir una foto espontánea de su momento con cualquier bebida, avisar al grupo con push notification, permitir que otros suban momentos, reaccionen, den un voto fuerte llamado **Estrella de la ronda**, cerrar la ronda, elegir foto ganadora y mostrar un ranking semanal por grupo basado en actividad social, fotos, reacciones y votos.

La bebida puede ser alcohólica o no alcohólica, pero **el tipo de bebida no debe sumar puntos ni incentivar consumo**. No construyas rankings de consumo. El producto premia momentos sociales, participación y fotos valoradas por el grupo.

## CONTEXT FILES TO READ FIRST

Lee y sigue estos documentos antes de escribir código. Empieza por `BETA_READINESS.md`, que
prevalece sobre informes históricos:

- `README.md`
- `BETA_READINESS.md`
- `00_PRODUCT_CONTEXT.md`
- `01_BRAND_NAMING_COPY.md`
- `02_PRODUCT_SPEC_MVP.md`
- `03_USER_FLOWS.md`
- `04_UX_UI_SPEC.md`
- `05_TECH_STACK_ARCHITECTURE.md`
- `06_DATA_MODEL_SUPABASE.md`
- `07_SECURITY_PRIVACY_MODERATION.md`
- `08_GAMIFICATION_RANKING.md`
- `09_NOTIFICATIONS_DEEP_LINKS.md`
- `10_TESTING_DISTRIBUTION_BUILDS.md`
- `11_ENV_CONFIG_PROJECT_STRUCTURE.md`
- `12_DEFINITION_OF_DONE_QA.md`

Si algún documento contradice otro, prioriza en este orden:

1. Seguridad, privacidad, edad y no incentivar consumo.
2. MVP funcional.
3. Arquitectura técnica.
4. UX/copy.
5. Mejoras opcionales.

## EXECUTION MODE

Actúa como senior full-stack mobile engineer.

No me pidas confirmación para decisiones menores. Toma decisiones razonables y documenta lo que hagas.

No pares tras crear una pantalla bonita. Continúa implementando, probando y corrigiendo hasta que exista una primera versión funcional del MVP.

Trabaja en ciclos:

```txt
1. Inspecciona repo actual.
2. Planifica cambios.
3. Implementa.
4. Ejecuta typecheck/lint cuando sea posible.
5. Corrige errores.
6. Repite hasta cumplir Definition of Done razonable.
7. Documenta setup/build.
```

Si faltan credenciales externas como Supabase, Expo o Apple Developer:

- No bloquees la implementación.
- Crea `.env.example`.
- Usa placeholders claros.
- Deja docs exactas de configuración.
- Haz que la app falle con mensajes dev-friendly si faltan variables, no con crashes raros.

## REQUIRED STACK

Usa:

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Edge Functions
- expo-notifications
- expo-camera
- expo-image-picker como fallback
- expo-image-manipulator para comprimir fotos
- TanStack Query
- Zustand si hace falta estado local

NativeWind es deseable, pero si complica el build, usa StyleSheet y theme tokens propios. Prioriza funcionalidad.

## CORE PRODUCT RULES

Implementa estas reglas sí o sí:

- App para mayores de 18 años.
- Grupos privados por defecto.
- No hay feed público.
- No hay ranking por cantidad de alcohol.
- Tipo de bebida es opcional y no puntúa.
- La bebida puede ser alcohólica o no alcohólica.
- No incentivar beber.
- Reacciones rápidas.
- Una reacción activa por usuario/foto; se puede cambiar o retirar.
- Un voto fuerte “Estrella de la ronda” por usuario/ronda.
- No se puede votar la propia foto.
- La Estrella de la ronda se puede mover o retirar mientras la ronda esté activa.
- Rondas tienen duración limitada, por defecto 4 horas.
- Rondas cerradas no aceptan momentos ni votos.
- Ranking semanal por grupo basado en actividad social.
- Reportar contenido.
- Bloquear usuarios.
- Borrar mi propio momento.
- Silenciar notificaciones de grupo.
- Cinco tabs visibles: Inicio, Grupos, Cámara/Lanzar, Ranking y Perfil.
- Selector explícito en toda vista por grupo, con última selección válida y sin `groups[0]`
  silencioso.
- `Tus momentos por bebida` privado para `auth.uid()`, descriptivo y sin puntos.

## MVP FEATURES TO BUILD

### 1. Project foundation

Crea o ajusta el proyecto con:

- `app.config.ts`
- `eas.json`
- Expo Router
- TypeScript
- estructura `src/features`
- `src/lib/supabase.ts`
- `src/lib/env.ts`
- `src/lib/queryClient.ts`
- `.env.example`
- README actualizado
- docs de setup/build

### 2. Auth + age gate

Implementa:

- Registro email/password.
- Login email/password.
- Logout.
- Sesión persistente.
- Age gate 18+.
- Perfil con username, display name y avatar opcional.
- Redirección según sesión/perfil/edad.

### 3. Groups

Implementa:

- Crear grupo.
- Owner entra automáticamente.
- Invite code único.
- Unirse por código.
- Listar mis grupos.
- Detalle grupo.
- Silenciar grupo.

### 4. Rounds + moments

Implementa:

- Lanzar ronda.
- Elegir grupo.
- Cámara.
- Preview.
- Caption opcional.
- Tipo bebida opcional.
- Subida a Supabase Storage.
- Crear round + primer moment.
- Listar rondas activas.
- Detalle de ronda.
- Subir momento a ronda existente.
- Cerrar ronda cuando expire.
- Mostrar resultado de ronda cerrada.

### 5. Reactions + Estrella de la ronda

Implementa:

- Reacciones: cheers, laugh, fire, wow.
- Una sola reacción activa por persona/foto, con cambio y retirada atómicos.
- Contadores por momento.
- Estrella de la ronda asignable, movible y retirable.
- RPCs `toggle_reaction` y `toggle_round_star`; no DML directo.
- Prohibir voto propio.
- Prohibir votos tras cierre.
- UI con feedback.

### 6. Ranking

Implementa ranking semanal por grupo:

- Semana empieza lunes.
- Puntuación según docs.
- Mostrar Top 3 y lista.
- Mostrar breakdown.
- No contar tipo de bebida.
- Hacer Ranking visible como una de las cinco tabs y mostrar siempre el grupo activo.

### 6.1 Perfil privado

- Mostrar `Tus momentos por bebida` con total, total con metadata y conteos por tipo.
- Usar `get_my_profile_stats()` sin parámetro de usuario; la identidad sale de `auth.uid()`.
- No comparar personas ni sumar puntos por bebida.

### 7. Notifications

Implementa:

- Pedir permisos push.
- Obtener Expo Push Token.
- Registrar y desregistrar token mediante RPC, incluido logout.
- Edge Function `send-round-notification`.
- Enviar push al crear ronda.
- No enviar al creador.
- Respetar `group_members.muted`.
- Exigir que envíe quien creó la ronda, excluir bloqueos y hacer el despacho idempotente.
- Deep link a ronda.
- Si push falla, no romper creación de ronda.

### 8. Moderation/security

Implementa:

- Reportar momento.
- Bloquear usuario.
- Ocultar contenido reportado para el usuario.
- Borrar momento propio.
- RLS en Supabase.
- Políticas para grupos privados.

### 9. Builds/testing

Configura:

- EAS Build.
- Android preview APK.
- iOS preview/ad hoc preparado.
- Scripts en package.json.
- Docs para probar con amigos.

## DATABASE REQUIREMENTS

La cadena actual culmina en
`supabase/migrations/20260713092422_beta_integrity_star_reactions_stats.sql`. No reescribas
migraciones aplicadas; cualquier ajuste adicional va en una migración nueva y se valida con
reset desde cero.

Mantén RLS, grants y contratos para:

- `profiles`
- `social_groups`
- `group_members`
- `rounds`
- `moments`
- `reactions`
- `photo_votes`
- `device_tokens`
- `reports`
- `blocks`
- storage bucket `moments`
- RLS policies
- RPC `join_group_by_invite`
- RPC `close_round`
- RPC `get_weekly_leaderboard`

Sigue `06_DATA_MODEL_SUPABASE.md` y adapta si encuentras problemas reales.

## UI REQUIREMENTS

Crea pantallas:

- Onboarding
- Age gate
- Login
- Register
- Complete profile
- Home
- Groups
- Create group
- Join group
- Group detail
- Launch round
- Camera/preview
- Round detail
- Moment detail opcional
- Ranking (tab visible)
- Profile (con estadísticas privadas)
- Settings
- Report modal

Cada pantalla con:

- Loading state.
- Empty state.
- Error state.

La UI debe ser usable en móvil real y no depender de datos mock para el core.

## COPY RULES

Usa términos:

- Lanzar ronda
- Ronda
- Momento
- Estrella de la ronda
- Ranking semanal
- Recap
- 1.º esta semana

Evita:

- Títulos de personaje o juicios de valor sobre personas.
- Etiquetas, comparaciones o retos basados en consumo.

## ACCEPTANCE CRITERIA

El MVP se considera funcional si:

1. Puedo crear cuenta.
2. Confirmo 18+.
3. Creo perfil.
4. Creo grupo.
5. Otro usuario puede unirse por código.
6. Lanzo ronda con foto.
7. La foto se sube a Supabase Storage.
8. El grupo ve la ronda.
9. Otro usuario sube momento.
10. Se puede añadir, cambiar y retirar una única reacción por foto.
11. Se puede asignar, mover y retirar la Estrella de la ronda.
12. No puedo dar la Estrella a mi propia foto ni tras el cierre.
13. La ronda se cierra y elige ganadora.
14. Ranking semanal muestra datos.
15. Report/block existen.
16. Android preview APK queda generable.
17. iOS preview/TestFlight queda documentado y preparado.
18. TypeScript no tiene errores críticos.
19. Las cinco tabs son visibles y el selector identifica el grupo activo.
20. Perfil solo muestra mis estadísticas de bebida y estas no cambian el score.
21. Logout entre dos cuentas no filtra cache, imágenes firmadas ni tokens.

## COMMANDS TO RUN

Al terminar implementación o por fases, ejecuta cuando sea posible:

```bash
npm install
npx supabase db reset --local
npm run qa:supabase:local
npm run qa:release:local
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
git diff --check
```

Si el entorno permite builds:

```bash
eas build -p android --profile preview
eas build -p ios --profile preview
```

No pasa nada si las builds requieren login/credenciales; deja comandos y docs.

## DOCUMENTATION TO GENERATE

Crea o actualiza:

- `README.md`
- `docs/SETUP.md`
- `docs/BUILD_TESTING.md`
- `.env.example`

Incluye:

- Cómo crear Supabase.
- Cómo aplicar migraciones.
- Cómo configurar env vars.
- Cómo ejecutar app.
- Cómo generar APK.
- Cómo generar iOS preview/Ad Hoc.
- Qué falta para TestFlight.

## IMPORTANT IMPLEMENTATION NOTES

- No pongas service role key en la app.
- No dejes tablas sin RLS.
- No dejes ranking basado en bebida.
- No bloquees el MVP por notificaciones: si push falla, la ronda debe crearse.
- No bloquees el MVP por diseño visual perfecto.
- No uses mocks permanentes donde ya exista Supabase.
- No crees features fuera de scope como chat completo o feed público.
- No añadas pagos.
- No añadas mapas.
- No añadas vídeo.

## FINAL RESPONSE REQUIRED

Cuando termines, dame un resumen con:

- Qué se ha creado.
- Estructura principal.
- Comandos para instalar/ejecutar.
- Pasos de Supabase.
- Pasos para Android APK.
- Pasos para iPhone con Ad Hoc/TestFlight.
- Limitaciones conocidas.
- Próximos pasos recomendados.

No termines hasta haber intentado cumplir todos los criterios del MVP o hasta estar bloqueado por credenciales externas no disponibles. Si estás bloqueado, deja el código y documentación preparados para continuar en cuanto existan esas credenciales.
