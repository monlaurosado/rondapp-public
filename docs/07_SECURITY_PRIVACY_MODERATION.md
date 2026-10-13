# 07 — Seguridad, privacidad y moderación

## Principio central

Rondapp tiene contenido generado por usuarios y referencias a bebidas. Aunque sea una app privada de grupos, debe construirse con seguridad y moderación desde el primer MVP.

## Edad mínima

Rondapp debe ser para usuarios de **18 años o más**.

MVP:

- Pantalla de confirmación 18+.
- Guardar `is_age_confirmed = true`.
- Guardar `accepted_terms_at`.
- Bloquear acceso al core si no confirma.

No usar diseño, lenguaje ni campañas orientadas a menores.

## No incentivar consumo

La app no debe premiar ni empujar a beber alcohol.

Reglas:

- No sumar puntos por tipo de bebida.
- No dar más puntos por alcohol que por no alcohol.
- No dar más puntos por más bebidas.
- No usar copy que asocie consumir con ganar.
- No tener retos de consumo.
- No tener rankings ni comparaciones basados en consumo.
- No vender alcohol en MVP.

La bebida puede ser metadata opcional y puede ser alcohólica o no alcohólica. Punto.

## Privacidad de grupos

- Todo contenido pertenece a un grupo.
- Solo miembros del grupo pueden ver rondas, momentos, votos y rankings; contenido oculto,
  reportado o entre usuarios bloqueados se filtra también en tablas hijas y Storage.
- No hay feed público en MVP.
- No hay búsqueda pública de perfiles en MVP.
- No hay ubicación por defecto.

## Ubicación

MVP:

- No pedir ubicación.
- No guardar ubicación.

V1.1:

- Si se añade ubicación, debe ser opcional y desactivada por defecto.
- No mostrar ubicación exacta salvo consentimiento claro.

## Fotos

Las fotos pueden contener personas, bebidas y espacios privados. Por tanto:

- Permitir borrar mi foto.
- Permitir reportar foto.
- Permitir ocultar foto reportada para mí.
- Evitar bucket público si es viable.
- Usar paths no adivinables.
- Respetar RLS.

## Bloqueo de usuarios

Debe existir desde MVP.

Si A bloquea a B:

- A no ve contenido de B.
- B no debería poder interactuar con contenido de A.
- A no recibe notificaciones derivadas de B.
- En grupos compartidos, el contenido se filtra en UI y RLS/queries cuando sea posible.

Tabla:

```txt
blocks(blocker_id, blocked_id, created_at)
```

## Reporte de contenido

Debe existir desde MVP.

Motivos:

- Contenido ofensivo.
- Acoso.
- Menor de edad.
- Contenido peligroso.
- Privacidad/imagen sin permiso.
- Otro.

Flow:

1. Usuario abre menú de momento.
2. Pulsa reportar.
3. Elige motivo.
4. Se crea report.
5. El contenido se oculta localmente para el reportador.
6. Si acumula reportes, se oculta globalmente.

MVP automático simple:

- Si un momento acumula 3 reports únicos, marcar `is_hidden = true`.
- Codex puede implementar una Edge Function/RPC o hacerlo en trigger.

## Normas de comunidad

Crear pantalla simple con reglas:

```txt
Normas de Rondapp

1. Solo mayores de 18 años.
2. Respeta a la gente de tus grupos.
3. No subas contenido ofensivo, íntimo o de terceros sin permiso.
4. No uses Rondapp para presionar a nadie a beber.
5. No publiques contenido relacionado con conducción y consumo.
6. Reporta lo que no debería estar aquí.
```

## Términos y privacidad

MVP puede incluir placeholders claros, pero deben existir rutas/pantallas:

- `/terms`
- `/privacy`
- `/community-guidelines`

Antes de publicación real, sustituir por documentos legales adecuados.

## Seguridad en Supabase

### RLS obligatoria

Todas las tablas públicas deben tener RLS.

No dejar tablas abiertas por comodidad.

### Service role key

Nunca en app móvil.

Solo en:

- Supabase Edge Functions.
- Entorno server seguro.

### Storage

Preferible bucket privado con políticas.

Si se usa signed URL:

- Expiración razonable.
- No almacenar signed URL permanente en DB.
- Guardar `image_path`.
- Autorizar el objeto con la misma función de visibilidad del momento; conocer un path no es
  suficiente para firmarlo.

## Validación de datos

Frontend:

- Zod o validaciones simples.
- Captions max 120 chars.
- Nombres de grupo 2-50 chars.
- Username 3-20 chars.
- Tipo bebida de lista conocida o string limitado.

Backend:

- Constraints SQL.
- Checks.
- RLS.
- Funciones para operaciones sensibles.

## Anti-spam MVP

Reglas recomendadas:

- Máximo 3 momentos por usuario/ronda.
- Máximo 1 Estrella de la ronda por usuario/ronda.
- Máximo 1 reacción activa por usuario/momento, aunque cambie el tipo.
- No se puede votar propio momento.
- La Estrella se puede mover o retirar y la reacción se puede cambiar o retirar solo mediante
  `toggle_round_star` y `toggle_reaction`.
- No se puede reaccionar/votar contenido oculto.
- No se puede interactuar con usuarios bloqueados.

Si Codex no implementa límites complejos de rate limit, debe al menos poner restricciones únicas y checks básicos.

## Notificaciones responsables

- No spamear cada reacción.
- No enviar mensajes que empujen a consumir.
- Respetar grupos silenciados.
- No enviar al creador su propia ronda.

## Cuenta y datos

Beta:

- Logout desregistra el token push, cierra sesión y limpia la cache privada de consultas.
- Editar perfil.
- Borrar foto propia.
- Eliminar cuenta desde app sin borrar por cascada rondas ni momentos de otras personas; las
  referencias de autor se anonimizan o se limpian mediante la operación de backend.

Pendiente posterior: exportación de datos.

`Tus momentos por bebida` es privado: `get_my_profile_stats()` usa exclusivamente `auth.uid()`
y no acepta el ID de otra persona. La metadata de bebida no puntúa.

## Administración básica

MVP puede no tener panel admin, pero sí datos para revisar:

- Reports.
- Content hidden.
- Users blocked.

Opcional para dev:

- Script SQL para ver reports pendientes.
- Pantalla admin oculta si usuario tiene rol especial, no necesario.

## Edge cases de seguridad

Codex debe contemplar:

- Usuario intenta acceder a grupo donde no es miembro.
- Usuario intenta votar su propia foto.
- Usuario intenta votar ronda cerrada.
- Usuario intenta subir momento a ronda cerrada.
- Usuario intenta cambiar una reacción o Estrella con DML directo.
- Usuario bloqueado intenta interactuar.
- Imagen subida sin registro DB.
- Registro DB creado pero subida de imagen falla.
- Retry tras timeout reutiliza los mismos IDs y no borra un objeto ya referenciado.

## Copy de seguridad

Mensaje edad:

```txt
Rondapp es para mayores de 18 años. Puede haber referencias a bebidas y planes de ocio adulto.
```

Mensaje normas:

```txt
Rondapp va de momentos con tu grupo, no de presionar a nadie ni de pasarse de listo.
```

Mensaje reporte:

```txt
Gracias. Lo revisaremos y ocultaremos este contenido para ti.
```

## Antes de pruebas con amigos

Checklist:

- Age gate activo.
- Report funciona.
- Block funciona.
- Borrar foto propia funciona.
- Grupos privados funcionan.
- No hay feed público accidental.
- Storage no expone imágenes públicamente sin control.
- No hay secrets en app.
