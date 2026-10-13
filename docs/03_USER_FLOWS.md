# 03 — User flows

## Flow 1: Primera apertura

```txt
Splash
→ Onboarding breve
→ Confirmación 18+
→ Registro/Login
→ Crear perfil
→ Crear grupo o unirse a grupo
→ Home
```

### Reglas

- Si no confirma 18+, no entra.
- Si no tiene perfil completo, dirigir a `complete-profile`.
- Si no tiene grupos, mostrar empty state con crear/unirse.
- Si ya tiene sesión y perfil, ir a Home.

## Flow 2: Registro

```txt
Pantalla login
→ “Crear cuenta”
→ Email + password
→ Confirmar 18+
→ Crear perfil
→ Home empty state
```

Campos:

- Email.
- Password.
- Username.
- Display name.
- Age confirmation.

Errores:

- Email inválido.
- Password corta.
- Username ocupado.
- No ha confirmado edad.

## Flow 3: Crear grupo

```txt
Home sin grupo o Groups tab
→ Crear grupo
→ Nombre del grupo
→ Avatar opcional
→ Crear
→ Grupo creado
→ Mostrar código/enlace de invitación
```

Resultado:

- Se crea grupo.
- El usuario es owner.
- Se genera invite_code.
- Se muestra botón “Compartir invitación”.

Copy sugerido:

```txt
Tu grupo está listo.
Comparte este código con quien quieras meter en la ronda.
```

## Flow 4: Unirse a grupo por código

```txt
Groups tab
→ Unirme con código
→ Introducir código
→ Validar
→ Confirmar grupo encontrado
→ Unirme
→ Grupo añadido
```

Errores:

- Código no existe.
- Ya eres miembro.
- Grupo bloqueado/cerrado.
- Sesión expirada.

## Flow 5: Lanzar ronda

```txt
Cualquiera de las cinco tabs
→ Tab central “Cámara/Lanzar”
→ Cámara
→ Tomar foto
→ Preview
→ Confirmar grupo en selector explícito (puede recordar el último válido)
→ Caption opcional
→ Tipo de bebida opcional
→ Publicar
→ Crear ronda + primer momento
→ Enviar notificación al grupo
→ Abrir detalle de ronda
```

### Reglas

- Debe haber al menos un grupo.
- Si cámara no tiene permiso, pedir permiso.
- Si permiso denegado, mostrar fallback y opción de abrir ajustes.
- En emulador/dev puede permitirse `ImagePicker` como fallback.
- Si falla subida de imagen, no crear ronda incompleta.
- Mantener la foto capturada ante un error recuperable y ofrecer reintento con los mismos
  identificadores de borrador para no duplicar ronda, momento u objeto.
- Si se crea ronda pero falla notificación, mostrar ronda igualmente y registrar error.

### Estados UI

- Seleccionando grupo.
- Solicitando permiso.
- Cámara lista.
- Subiendo imagen.
- Creando ronda.
- Enviando notificación.
- Éxito.
- Error.

## Flow 6: Recibir notificación de ronda

```txt
Push notification
→ Tap
→ Abrir app
→ Deep link a round/[roundId]
→ Ver ronda activa
→ Reaccionar/subir momento/asignar la Estrella
```

Datos necesarios en push:

```json
{
  "type": "round_created",
  "groupId": "...",
  "roundId": "..."
}
```

## Flow 7: Entrar a ronda activa

```txt
Home
→ Rondas activas
→ Seleccionar ronda
→ Detalle de ronda
```

Detalle debe mostrar:

- Grupo.
- Usuario que lanzó ronda.
- Tiempo restante.
- Grid/lista de momentos.
- Botón subir mi momento.
- Reacciones por foto.
- Botón Dar/Cambiar/Retirar mi estrella.
- Estado y disponibilidad de mi Estrella de la ronda.

## Flow 8: Subir momento a ronda existente

```txt
Detalle de ronda activa
→ Subir mi momento
→ Cámara
→ Preview
→ Caption opcional
→ Tipo de bebida opcional
→ Publicar
→ Volver a ronda
```

Reglas:

- Solo si ronda activa.
- Solo miembros del grupo.
- Máximo recomendado: 3 momentos por usuario/ronda.
- Si ronda expiró, impedir subida y cerrar/actualizar estado.

## Flow 9: Reaccionar a foto

```txt
Detalle de ronda
→ Ver foto
→ Tap en reacción
→ Actualizar UI optimista
→ RPC `toggle_reaction`
→ Confirmar o hacer rollback
```

Reglas:

- Reacción de un toque.
- Una sola reacción activa por persona y foto.
- Tocar otro emoji cambia la reacción; repetir el seleccionado la retira.
- No permitir reacciones si foto oculta.
- No permitir reacciones si usuario bloqueado por autor o autor bloqueado por usuario.
- En ronda cerrada son solo lectura.

## Flow 10: Asignar, mover o retirar la Estrella de la ronda

```txt
Detalle de ronda activa
→ Tap “Dar mi estrella” en foto de otra persona
→ Confirmación ligera o feedback inmediato
→ Si ya estaba en otra foto, moverla
→ Si pulsa “Tu estrella”, retirarla
→ Actualizar UI de forma optimista
→ RPC `toggle_round_star`
→ Confirmar o hacer rollback
```

Reglas:

- No votar propia foto.
- Una Estrella de la ronda por persona y ronda.
- Movible y retirable hasta cierre.
- No válido tras cierre.
- Voto fuerte cuenta para ranking.

UX:

- Animación/haptic al votar.
- Mostrar “Tu estrella” en la foto elegida y `1 estrella disponible` cuando no hay selección.
- Mostrar contador de Estrellas por foto si no se quiere ocultar.

Decisión MVP:

- Mostrar contadores mientras la ronda está activa. Más simple.
- V1.1 puede ocultarlos hasta cierre para más tensión.

## Flow 11: Cierre de ronda

```txt
Ronda activa supera closes_at
→ Usuario abre ronda o ranking
→ App llama close_round
→ Backend calcula winner_moment_id
→ Ronda pasa a closed
→ UI muestra resultado
```

Resultado:

- Foto ganadora.
- Estrellas.
- Reacciones.
- Participantes.
- Botón ver ranking.

## Flow 12: Ranking semanal

```txt
Tab Ranking
→ Confirmar grupo en el selector siempre visible
→ Ver semana actual
→ Lista de usuarios
→ Breakdown por usuario
```

Debe mostrar:

- Posición.
- Avatar.
- Nombre.
- Puntos.
- Etiqueta descriptiva de posición.
- Desglose de rondas, momentos, participantes, reacciones, Estrellas, ganadas y participación.

Estados:

- Sin datos.
- Cargando.
- Error.
- Ranking disponible.

## Flow 13: Reportar foto

```txt
Menú de momento
→ Reportar
→ Elegir motivo
→ Confirmar
→ Crear report
→ Ocultar para mí inmediatamente
```

Motivos:

- Contenido ofensivo.
- Acoso.
- Menor de edad.
- Contenido peligroso.
- Privacidad/imagen sin permiso.
- Otro.

MVP:

- Crear registro `reports`.
- Si un momento llega a 3 reports, marcar `is_hidden = true` mediante función backend o lógica admin.

## Flow 14: Bloquear usuario

```txt
Perfil/menú de usuario
→ Bloquear
→ Confirmar
→ Crear block
→ Ocultar contenido mutuo en UI
```

Reglas:

- No ver contenido del bloqueado.
- No recibir interacciones del bloqueado.
- No poder votar/reaccionar entre bloqueados.

## Flow 15: Silenciar grupo

```txt
Ajustes de grupo
→ Silenciar notificaciones
→ Elegir duración o toggle
```

MVP:

- Toggle simple `muted = true/false` en `group_members`.

## Flow 16: Logout

```txt
Perfil/Ajustes
→ Cerrar sesión
→ Confirmar
→ Desregistrar token push del usuario
→ Supabase signOut
→ Vaciar cache privada de consultas
→ Login
```

## Flow 17: Estadísticas privadas de perfil

```txt
Tab Perfil
→ Sección “Tus momentos por bebida”
→ RPC `get_my_profile_stats()`
→ Total de momentos + total con metadata + conteos por tipo
```

La RPC deriva el usuario de `auth.uid()`. No hay selector de persona, comparación, score ni
lectura de estadísticas ajenas.

## Flow 18: Errores críticos

### Sin conexión

Mostrar banner:

```txt
Sin conexión. Tu foto sigue aquí; revisa la conexión y vuelve a intentarlo.
```

No prometer una cola offline si no existe. Mantener el borrador local y reutilizar sus IDs al
reintentar; reacciones y Estrella hacen rollback si la RPC no se confirma.

### Supabase no configurado

Mostrar pantalla dev-friendly:

```txt
Faltan variables de entorno de Supabase.
Revisa EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
```

### Push no configuradas

La app debe seguir funcionando sin push reales. Registrar tokens y mostrar aviso dev, pero no bloquear el core.
