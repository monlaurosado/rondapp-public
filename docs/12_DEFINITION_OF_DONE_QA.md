# 12 — Definition of Done y QA

## Definición de MVP funcional

La primera versión funcional de Rondapp está lista cuando una persona puede instalar la app en un móvil real, crear un grupo con amigos y completar el loop principal sin intervención técnica.

Loop principal:

```txt
Crear cuenta → crear grupo → invitar amigo → lanzar ronda con foto → amigo ve/recibe ronda → reacciona → asigna/mueve/retira la Estrella de la ronda → ranking se actualiza
```

## Criterios obligatorios

### Auth/onboarding

- [ ] App abre sin crash.
- [ ] Usuario puede registrarse con email/password.
- [ ] Usuario puede iniciar sesión.
- [ ] Usuario puede cerrar sesión.
- [ ] Cambiar A → logout → B no conserva queries, URLs firmadas ni token push de A.
- [ ] Age gate 18+ aparece antes de usar core.
- [ ] No se puede continuar sin confirmar 18+.
- [ ] Perfil se crea/edita.

### Grupos

- [ ] Usuario puede crear grupo.
- [ ] Creador se añade como owner.
- [ ] Se genera invite code único.
- [ ] Otro usuario puede unirse con invite code.
- [ ] Usuario solo ve grupos donde es miembro.
- [ ] Se puede silenciar grupo.

### Rondas

- [ ] Las cinco tabs Inicio, Grupos, Cámara/Lanzar, Ranking y Perfil son visibles.
- [ ] Usuario puede lanzar ronda desde la tab de cámara.
- [ ] Selector muestra el grupo explícitamente y recuerda solo una selección válida.
- [ ] Cámara funciona en móvil real.
- [ ] Fallback galería/dev funciona si procede.
- [ ] Foto se comprime.
- [ ] Foto se sube a Supabase Storage.
- [ ] Ronda se crea con status active.
- [ ] Primer momento se crea asociado a ronda.
- [ ] Ronda aparece en Home y Grupo.
- [ ] Ronda tiene `closes_at`.
- [ ] Retry tras timeout reutiliza IDs y no duplica ronda, momento, objeto ni push.

### Momentos

- [ ] Usuario puede subir momento a ronda existente.
- [ ] No se puede subir a ronda cerrada.
- [ ] No se puede subir si no es miembro.
- [ ] Caption opcional funciona.
- [ ] Tipo bebida opcional funciona.
- [ ] Tipo bebida no afecta puntos.

### Reacciones

- [ ] Usuario puede reaccionar a foto ajena.
- [ ] Solo existe una reacción activa por usuario/foto.
- [ ] Otro emoji cambia la reacción y repetir el seleccionado la retira.
- [ ] Error de RPC revierte la UI optimista.
- [ ] Contadores se actualizan.
- [ ] UI maneja loading/error.

### Estrella de la ronda

- [ ] Usuario puede asignar la Estrella de la ronda a foto ajena.
- [ ] Usuario no puede darla a su propia foto.
- [ ] Usuario solo tiene una Estrella de la ronda por ronda.
- [ ] Usuario puede moverla y retirarla antes del cierre.
- [ ] Error de RPC revierte la UI optimista.
- [ ] Usuario no puede votar tras cierre.
- [ ] Contadores se actualizan.

### Cierre de ronda

- [ ] Ronda expirada se puede cerrar.
- [ ] Backend calcula ganador.
- [ ] Desempate funciona.
- [ ] Ronda cerrada muestra resultado.
- [ ] Ronda cerrada no acepta nuevos momentos/votos.

### Ranking

- [ ] Ranking semanal carga por grupo.
- [ ] Ranking es una tab visible y su selector identifica el grupo activo.
- [ ] Ranking usa semana que empieza lunes.
- [ ] Ranking suma rondas, momentos, reacciones, Estrellas y ganadoras.
- [ ] Ranking no suma por bebida.
- [ ] Ranking muestra el breakdown completo de siete métricas con etiquetas descriptivas.
- [ ] Empty state si no hay actividad.

### Perfil

- [ ] `Tus momentos por bebida` muestra total, total con metadata y conteos normalizados.
- [ ] `get_my_profile_stats()` usa `auth.uid()` y no permite consultar otra persona.
- [ ] Bebida no aporta puntos ni crea comparaciones.

### Notificaciones

- [ ] App pide permisos push.
- [ ] Token se registra/desregistra por RPC, incluido logout.
- [ ] Al lanzar ronda se intenta enviar push al grupo.
- [ ] No se envía push al creador.
- [ ] Silenciar grupo excluye notificaciones.
- [ ] Repetir el envío de una ronda no duplica el push.
- [ ] Tap en push abre ronda si el sistema está configurado.
- [ ] Si push falla, ronda se crea igualmente.

### Moderación

- [ ] Usuario puede reportar momento.
- [ ] Usuario puede bloquear a otro.
- [ ] Usuario puede borrar su propio momento.
- [ ] Contenido oculto no aparece.
- [ ] Contenido oculto/reportado/bloqueado tampoco obtiene URL firmada de Storage.
- [ ] Un reporte no puede mentir sobre grupo, momento o usuario reportado.
- [ ] No hay interacciones con bloqueados.

### Builds

- [ ] `npx supabase db reset --local` aplica toda la cadena desde cero.
- [ ] `npm run qa:supabase:local` pasa con tres usuarios y dos grupos.
- [ ] `npx supabase db lint --local` y advisors revisados sin findings críticos sin resolver.
- [ ] `npm run qa:release:local` pasa.
- [ ] `npx tsc --noEmit` pasa.
- [ ] `npm run lint` pasa.
- [ ] `npx expo-doctor` pasa.
- [ ] Export web/iOS/Android pasa.
- [ ] `git diff --check` pasa.
- [ ] Android preview APK compila con EAS.
- [ ] APK instala en Android físico.
- [ ] iOS preview/TestFlight queda configurado y compila si hay credenciales.
- [ ] Docs de build están actualizadas.
- [ ] QA visual actual y pruebas físicas están ejecutadas o explícitamente marcadas como
  pendientes; un informe histórico no cuenta como evidencia nueva.

## Tests manuales recomendados

### Test A: Dos usuarios, un grupo

1. Usuario A crea cuenta.
2. A confirma 18+.
3. A crea grupo.
4. A comparte código.
5. Usuario B crea cuenta.
6. B se une al grupo.
7. A lanza ronda.
8. B ve ronda.
9. B sube momento.
10. A reacciona.
11. A da Estrella de la ronda a B.
12. Cerrar ronda.
13. B gana.
14. Ranking muestra puntos.

### Test B: No voto propio

1. A sube foto.
2. A intenta dar la Estrella a su propia foto.
3. App lo impide.

### Test C: Cambiar Estrella de la ronda

1. A vota foto de B.
2. A cambia voto a foto de C.
3. Solo existe un voto de A en ronda.
4. A pulsa de nuevo su foto elegida y retira el voto.
5. La UI vuelve a mostrar `1 estrella disponible`.

### Test D: Cambiar y retirar reacción

1. A reacciona a la foto de B.
2. A elige otro emoji y sigue habiendo una sola fila.
3. A repite el emoji seleccionado y se elimina la reacción.

### Test E: Ronda cerrada

1. Crear ronda con `closes_at` corto en dev.
2. Esperar cierre.
3. Intentar subir foto.
4. Debe fallar con mensaje claro.
5. Intentar votar.
6. Debe fallar.

### Test F: Privacidad

1. Crear Grupo 1 con A/B.
2. Crear Grupo 2 con C.
3. C no debe ver rondas/momentos de Grupo 1.

### Test G: Bloqueo

1. A bloquea a B.
2. A no ve contenido de B.
3. B no puede interactuar con A.

### Test H: Reporte

1. B reporta foto de A.
2. Report aparece en DB.
3. Foto se oculta para B.

### Test I: Dos grupos y selector persistente

1. A pertenece a Grupo 1 y Grupo 2.
2. Selecciona Grupo 2 en Ranking y Perfil/Home si la vista es por grupo.
3. Navega entre las cinco tabs y vuelve: Grupo 2 sigue visible.
4. Sale de Grupo 2 o deja de ser miembro: el selector exige otra elección válida.

### Test J: Estadísticas privadas

1. A y B suben momentos con bebidas distintas.
2. A solo ve sus conteos en `Tus momentos por bebida`.
3. B no puede pasar el ID de A a la RPC.
4. El ranking no cambia al modificar únicamente `drink_type`.

## Datos de prueba

Crear usuarios reales durante QA:

- rosado@test.local
- amigo1@test.local
- amigo2@test.local

No usar passwords reales.

## Debug screen recomendado

Pantalla oculta o sección en ajustes:

- User ID.
- Supabase URL.
- App env.
- App version/build.
- Push permission.
- Expo push token.
- Nº grupos.
- Último error.

## Criterios de calidad

- No crashes en acciones principales.
- No pantallas blancas.
- No spinners infinitos.
- Errores entendibles.
- Layout usable en iPhone y Android comunes.
- RLS no bloquea flujos legítimos.
- RLS bloquea accesos ilegítimos.

## Prioridad de bugs

### P0 — Bloqueante

- App no arranca.
- Auth no funciona.
- No se puede crear grupo.
- No se puede lanzar ronda.
- Fuga de privacidad entre grupos.
- Crash al abrir ronda.
- Build Android/iOS no compila por errores de código.

### P1 — Alto

- Push no funciona pero app sí.
- Ranking calcula mal.
- Voto duplicado.
- Report/block falla.
- Imagen no carga en algunos dispositivos.

### P2 — Medio

- UI fea pero usable.
- Animación rota.
- Copy mejorable.
- Loading states pobres.

## Qué NO cuenta como terminado

No vale considerar terminado si:

- Hay mocks en lugar de Supabase para core.
- Se puede ver contenido de grupos ajenos.
- El ranking depende de bebida.
- No hay age gate.
- No hay report/block.
- Solo funciona en simulador.
- No hay instrucciones de build.

## Entregable final esperado de Codex

Codex debe dejar:

- Código fuente funcional.
- Migraciones Supabase.
- Migración beta `20260713092422_beta_integrity_star_reactions_stats.sql` aplicada desde cero.
- Edge Functions.
- Config Expo/EAS.
- `.env.example`.
- `docs/SETUP.md`.
- `docs/BUILD_TESTING.md`.
- Checklist final en README.

## Mensaje final esperado de Codex

Cuando termine, debe resumir:

- Qué ha implementado.
- Qué comandos ejecutar.
- Qué variables faltan.
- Cómo crear Supabase.
- Cómo generar APK.
- Cómo generar build iOS.
- Qué limitaciones quedan.
