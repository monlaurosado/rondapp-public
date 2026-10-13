# Beta PWA de Rondapp

La PWA permite probar Rondapp en iPhone desde un icono propio y sin Expo Go. Esta
distribución web convive con la configuración nativa existente: no sustituye ni
elimina la futura beta de TestFlight.

## Qué incluye

- Manifest instalable con nombre, colores e iconos de Rondapp.
- Apertura `standalone`, sin la interfaz habitual de Safari.
- Instalación guiada desde onboarding y Ajustes.
- Service worker para los recursos versionados y una pantalla clara si se abre
  sin conexión.
- Web Push en la PWA instalada, con una prueba real desde Ajustes.
- Enrutado SPA de Hostinger para invitaciones, callbacks y rutas internas.

La aplicación sigue necesitando conexión para sesiones, grupos, rondas y fotos.
El modo offline solo evita una página de error genérica.

## Instalar en iPhone

1. Abrir el enlace HTTPS de Rondapp en Safari. Si el enlace llega por WhatsApp o
   Instagram, usar primero la opción **Abrir en Safari**.
2. Pulsar **Instalar Rondapp** dentro de la pantalla inicial, o abrir el menú
   **Compartir** de Safari.
3. Elegir **Añadir a pantalla de inicio** y confirmar con **Añadir**.
4. Cerrar Safari y abrir Rondapp desde el icono nuevo.

La instalación requiere HTTPS. El dominio de beta actual ya lo utiliza:

```text
https://darkgray-partridge-666122.hostingersite.com
```

## Compilar y validar

```bash
npm ci
npm run build
npm run qa:pwa
```

`npm run build` exporta la web, prepara `.htaccess` y ejecuta automáticamente la
validación PWA. El directorio `dist` debe incluir al menos:

```text
index.html
manifest.json
service-worker.js
pwa-register.js
offline.html
apple-touch-icon.png
pwa-icon-192.png
pwa-icon-512.png
pwa-icon-maskable-512.png
.htaccess
```

## Prueba recomendada

- Instalar desde Safari y confirmar que abre sin barra del navegador.
- Crear cuenta o iniciar sesión.
- Crear/unirse a un grupo y compartir una invitación.
- Crear una ronda y subir una foto con cámara y con galería.
- Reaccionar, dar una estrella y revisar ranking/perfil.
- Cerrar y volver a abrir desde el icono para comprobar que la sesión persiste.
- Abrir **Ajustes > Activar notificaciones**, aceptar el permiso y comprobar que
  llega el aviso de prueba.
- Con una segunda cuenta del mismo grupo, abrir una ronda y comprobar que el
  otro iPhone recibe el aviso y puede entrar directamente en ella.
- Activar modo avión y confirmar que aparece la pantalla sin conexión.
- Recuperar la conexión y pulsar **Volver a intentar**.

## Notificaciones en iPhone

Web Push requiere iOS/iPadOS 16.4 o posterior y que Rondapp se abra desde el
icono añadido a la pantalla de inicio. Apple exige que el primer permiso se pida
desde una acción del usuario, por eso se activa al tocar el control de Ajustes.
Ese mismo control registra el dispositivo y envía una notificación real de
prueba desde el backend.

Al crear una ronda, el aviso se envía a los demás miembros elegibles del grupo:
el creador queda excluido, al igual que las cuentas bloqueadas y quienes hayan
silenciado ese grupo. Por eso la prueba del evento de ronda necesita dos cuentas.

La ruta nativa mediante Expo Push se mantiene para una futura beta de TestFlight;
la PWA usa el estándar Web Push y no sustituye esa configuración.
