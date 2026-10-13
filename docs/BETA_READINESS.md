# Estado del beta y contrato vigente

Fecha de corte documental: 2026-07-13.

Este documento describe el comportamiento objetivo del beta actual. No constituye por sí
solo evidencia de que una prueba haya pasado. Los informes visuales y de release anteriores
están marcados como históricos; sus resultados no validan cambios posteriores.

## Contrato funcional

- La navegación inferior expone cinco destinos: **Inicio**, **Grupos**,
  **Cámara/Lanzar**, **Ranking** y **Perfil**.
- Cada persona puede mantener como máximo una reacción activa por foto. Tocar otro emoji
  cambia la reacción; tocar de nuevo el emoji seleccionado la retira.
- Cada persona dispone de una **Estrella de la ronda** por ronda abierta. Puede asignarla a
  una foto ajena, moverla a otra foto o retirarla. No puede usarla en su propia foto ni
  modificarla después del cierre.
- Ranking es visible, se calcula por grupo y semana iniciada en lunes, y muestra posición,
  puntos y desglose. Las etiquetas son descriptivas y no atribuyen personajes a las
  personas.
- Las vistas por grupo muestran el grupo activo mediante un selector explícito. La app puede
  recordar el último grupo válido, pero nunca elige silenciosamente `groups[0]`.
- Perfil incluye la sección privada **Tus momentos por bebida**, con total de momentos,
  total con metadata de bebida y conteos por tipo. La RPC obtiene la identidad con
  `auth.uid()`; no acepta un usuario arbitrario.
- La bebida es metadata opcional y descriptiva. No aporta puntos, no genera comparaciones y
  no representa un contador de consumo.
- Reportes, bloqueos, visibilidad de Storage, tokens push, creación de rondas/momentos y
  cierre se validan en backend. Los reintentos de publicación reutilizan identificadores
  estables para evitar duplicados.

## Contrato técnico

La migración vigente es:

```txt
supabase/migrations/20260713212950_enforce_single_active_round_and_group_deletion.sql
```

Operaciones públicas relevantes:

```txt
toggle_reaction(moment_id, type)
toggle_round_star(moment_id)
get_weekly_leaderboard(group_id, week_start)
get_my_profile_stats()
register_device_token(...)
unregister_device_token(token)
```

Edge Functions del contrato beta:

```txt
send-round-notification
close-round
delete-account
delete-moment
delete-group
cleanup-storage-deletions
```

Las tablas operativas `round_notification_dispatches`, `moment_storage_deletions` y
`storage_cleanup_queue` tienen RLS habilitado, revocan acceso a `public`, `anon` y
`authenticated`, y son exclusivas de `service_role`. El worker de cleanup no es un endpoint
de usuario: se ejecuta desde una tarea server-side autorizada o manualmente. Solo ese worker
usa `verify_jwt = false` para admitir las nuevas claves opacas de Supabase; el handler valida
en tiempo constante una secret en `apikey` o, temporalmente, el Bearer exacto de
`SUPABASE_SERVICE_ROLE_KEY`. Claves públicas, JWT de usuario y credenciales mal ubicadas se
rechazan antes de leer la cola.

La aplicación usa `toggleReaction` y `toggleRoundStar` con actualización optimista y rollback.
La base garantiza una fila de reacción por `(moment_id, user_id)` y una fila de voto por
`(round_id, voter_id, vote_type)`.

Por compatibilidad del contrato SQL se mantienen `vote_type = 'foton'` y la columna de salida
`fotons_received`. Esos identificadores no son copy visible.

## Estado de verificación del corte

Los estados distinguen explícitamente backend local, navegador web, dispositivo nativo y
servicios remotos. Un PASS web no valida comportamiento nativo y un PASS de Supabase local no
implica que la migración esté desplegada en remoto.

### Backend local verificado

- `supabase db reset --local`: PASS desde una base limpia.
- `npm run qa:supabase:local`: PASS multiusuario sin mocks. Cubre identidades
  miembro/ajeno/bloqueado, dos grupos, Storage privado, máximo tres momentos concurrentes,
  una única ronda activa por grupo, reacción única, Estrella asignable/movible/retirable,
  cierre/desempate, ranking, estadísticas privadas, reportes, borrado de grupos exclusivo
  del propietario, borrado idempotente y preservación de datos ajenos al eliminar una cuenta.
- Deno check de las seis Edge Functions y Deno format de las siete fuentes, incluido el
  helper compartido: PASS.
- Lint de base con nivel warning y umbral de error: PASS sin resultados. Los helpers de rutas
  usan parsing inmutable de `pg_catalog` y ya no dependen de `storage.filename` VOLATILE.
- Advisors locales: sin WARN/ERROR bloqueantes; los INFO de índices aún sin uso y tablas
  service-only sin policies de usuario son esperados para este corte.

### Navegador web con Supabase local verificado

- QA con datos reales sembrados en 320×568, 360×800, 390×844 y 430×932: PASS para las
  pantallas y estados enumerados en `docs/evidence/beta-2026-07-13/README.md`. El seed visual
  contiene cinco perfiles 18+, dos grupos, una ronda activa y otra cerrada.
- Cinco tabs, Ranking con selector/desglose/vacío, Perfil y `Tus momentos por bebida`: PASS.
- Reacción única y Estrella: añadir, cambiar/mover, retirar y restaurar estado: PASS.
- Ronda cerrada, ganador y controles bloqueados: PASS.
- Selector de grupo en Cámara, recuperación de permiso y timeout humano sin spinner infinito:
  PASS web.
- Acceso de outsider: mensaje humano, sin error técnico crudo y consola limpia: PASS.
- Logout web: vuelve a onboarding y deja la consola limpia: PASS.
- Deep link protegido: login → age gate → grupo exacto solicitado, sin perder `next`: PASS.
- Login enfocado en viewport reducido: sin CTA cortada. Esta evidencia no equivale a un
  teclado nativo abierto.

### Gates finales del árbol actual

Repetición final ejecutada el 2026-07-13 después del último cambio:

| Gate | Estado |
| --- | --- |
| `npx supabase stop --no-backup && npx supabase start` | `PASS_LOCAL`, pila recreada y 11 migraciones aplicadas |
| `npx supabase db reset --local --no-seed` | `PASS_LOCAL` desde base limpia |
| `npm run qa:supabase:local` | `PASS_LOCAL`, incluido worker con secret actual, fallback legacy y rechazos no administrativos |
| `npx supabase db lint --local --level warning --fail-on error` | `PASS_LOCAL`; sin resultados |
| `npx supabase db advisors --local --type all --level info --fail-on warn` | `PASS_LOCAL`; 0 WARN/ERROR, solo INFO esperado |
| `npm run qa:release:local` | `PASS_LOCAL` |
| `npm run qa:navigation` | `PASS_LOCAL`; allowlist, encoding, dot segments y estado pendiente |
| Deno check de 5 funciones + `deno fmt --check` de 6 fuentes | `PASS_LOCAL` |
| `npm run typecheck` | `PASS_LOCAL` |
| `npm run lint` | `PASS_LOCAL` |
| `npx expo-doctor` | `PASS_LOCAL`, 20/20 |
| Export web, iOS y Android | `PASS_LOCAL` |
| `npm run build` | `PASS_LOCAL`, export Hostinger con `.htaccess` y `404.html` |
| `npm audit --omit=dev --audit-level=high` | `PASS_LOCAL`; 11 moderadas, 0 altas/críticas |
| `git diff --check` | `PASS_LOCAL` |

### No ejecutado o bloqueado externamente

- No hay simulador iOS ni Android/ADB disponible. No están validados físicamente cámara,
  galería, subida desde picker, teclado, safe areas/notch, texto ampliado del sistema,
  background, push, haptics, rendimiento ni deep links universales/app links.
- La migración beta no se aplicó al proyecto Supabase remoto. No se ejecutaron smoke ni
  advisors remotos de este corte y producción no se modificó.
- La ruta con nueva secret del worker pasa localmente. Debe repetirse en hosted/staging antes
  de desplegar porque el proxy de la CLI puede normalizar headers legacy; en producción se
  recomienda una secret nombrada y dedicada, con retirada posterior del fallback legacy.
- EAS está autenticado como `rdrosado` y enlazado a `@rdrosado/rondapp`, pero el último APK
  preview corresponde al corte anterior del 2026-07-09. No existe build Android ni iOS del
  árbol actual.
- TestFlight/App Store requiere Apple Developer; Android production/Google Play requiere la
  cuenta y configuración de Play.
- Apple OAuth, push nativo y los archivos de asociación HTTPS requieren credenciales externas,
  Apple Team ID, SHA-256 Android y publicación en el hosting autorizado.
- `npm audit --omit=dev` informa 11 vulnerabilidades moderadas y ninguna alta/crítica. No se
  aplicó `--force` porque propone degradar Expo a una versión incompatible.
