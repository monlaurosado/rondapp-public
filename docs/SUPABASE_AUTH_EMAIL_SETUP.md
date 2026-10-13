# Supabase Auth Email Setup

Proyecto: `bckrwqvvmjjorunbzxbo`

## Estado implementado en la app

- Scheme nativo configurado: `rondapp`.
- Ruta callback implementada: `/auth/callback`.
- Registro usa `emailRedirectTo` via `Linking.createURL("auth/callback")`.
- Reenvio de confirmacion usa `supabase.auth.resend({ type: "signup", ... })`.
- El callback acepta:
  - `code` para `exchangeCodeForSession`.
  - `token_hash` + `type` para `verifyOtp`.
  - `access_token` + `refresh_token` para flujos implicitos.

## Configuracion manual en Supabase Dashboard

### Estado remoto comprobado el 13 de julio de 2026

- Proyecto en plan Free y sin SMTP personalizado.
- El SMTP compartido está limitado a 2 emails por hora y no es apto para producción.
- Sin SMTP propio, Supabase solo entrega a direcciones autorizadas del equipo del proyecto.
- El panel aplica la política de Free anunciada el 3 de junio de 2026 y bloquea la edición de
  asunto y cuerpo de las plantillas mientras use el proveedor compartido.
- El intento observado en logs fue `user_repeated_signup`: la cuenta ya estaba confirmada.
  Supabase devuelve una respuesta opaca con estado 200 por seguridad, pero no genera una
  nueva confirmación para una cuenta que ya está confirmada.

Ir a `Authentication > URL Configuration`:

- Site URL recomendado para beta web/local: `rondapp://auth/callback`.
- Redirect URLs permitidas:
  - `rondapp://auth/callback`
  - `rondapp://**`
  - URLs Expo Go/dev que uses durante pruebas, por ejemplo `exp://**`.
  - Si pruebas web: `http://localhost:8081/**`.

Ir a `Authentication > Providers > Email`:

- Mantener confirmacion de email activada para produccion.
- Para beta rapida se puede desactivar temporalmente "Confirm email", pero solo para pruebas controladas.
- Activar leaked password protection antes de beta publica.

Ir a `Authentication > Email Templates`:

- Requiere haber activado primero SMTP personalizado en este proyecto Free.
- Project display name / app name: `Rondapp`.
- Plantilla `Confirm signup`: usar copy de Rondapp y el enlace `{{ .ConfirmationURL }}`.
- Plantilla `Reset password`: usar copy de Rondapp y `{{ .ConfirmationURL }}`.
- Plantilla `Magic link`: usar copy de Rondapp si se activa en el futuro.

Copy base sugerido para confirmacion:

```html
<h2>Confirma tu cuenta de Rondapp</h2>
<p>Ya casi estas dentro. Confirma tu email para crear grupos privados y lanzar rondas con tus amigos.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar email</a></p>
<p>Si no has creado esta cuenta, puedes ignorar este correo.</p>
```

## SMTP

El SMTP por defecto de Supabase sirve solo para desarrollo: muestra su propia infraestructura,
solo entrega a miembros autorizados del proyecto y está limitado a 2 mensajes por hora.

Para beta seria o produccion:

- Configurar SMTP propio en `Authentication > SMTP Settings`.
- Usar dominio propio verificado.
- Configurar el remitente como `Rondapp` y una dirección del estilo
  `no-reply@auth.<dominio-propio>`.
- Verificar SPF, DKIM y DMARC en el proveedor del dominio.
- Desactivar tracking de enlaces en el proveedor de email para no romper links de confirmacion.
- No guardar credenciales SMTP en la app movil.

## Marca de Google

- Google Auth Platform ya tiene `Rondapp` como nombre de la aplicación.
- Google seguirá mostrando `bckrwqvvmjjorunbzxbo.supabase.co` como dominio técnico mientras
  Supabase Auth use su URL de proyecto.
- Para sustituirlo hay que activar un dominio personalizado de Supabase Auth, por ejemplo
  `auth.<dominio-propio>`, y añadir su callback
  `https://auth.<dominio-propio>/auth/v1/callback` al cliente OAuth de Google antes de activarlo.
- Los dominios personalizados de Supabase requieren un proyecto de pago y el add-on
  correspondiente; no se deben activar sin aprobar antes el coste y disponer del DNS.

## Prueba manual

1. Ejecutar app con `.env.local` configurado.
2. Crear cuenta con email real.
3. Abrir el email desde el movil.
4. Tocar "Confirmar email".
5. Verificar que abre Rondapp y redirige a age gate / completar perfil.
6. Probar "Reenviar confirmacion" desde `/check-email`.
7. Abrir un enlace con destino interno `next` y comprobar que se recupera tras login; rechazar
   destinos externos.
8. Cerrar sesión, entrar con otra cuenta y confirmar que no quedan cache privada, URLs
   firmadas ni token push de la primera.
