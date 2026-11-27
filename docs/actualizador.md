# Actualizador firmado

La clave pública ya está en `src-tauri/tauri.updater.conf.json`. El instalador solo se firma si GitHub tiene los dos secretos del paso 3; sin ellos, «Actualizar» abre la descarga en el navegador.

## Activarlo (una sola vez)

1. Crea el par de claves en tu equipo. Pide una contraseña; no la pierdas.

   ```powershell
   npm run tauri signer generate -- -w "$HOME\.tauri\shakes.key"
   ```

2. Copia la clave **pública** (el contenido de `shakes.key.pub`) en `pubkey`, dentro de `src-tauri/tauri.updater.conf.json`.
3. En GitHub, en el repositorio: **Settings › Secrets and variables › Actions**, crea dos secretos:
   - `TAURI_SIGNING_PRIVATE_KEY`: el contenido de `shakes.key`.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: la contraseña del paso 1.
4. Publica una versión con etiqueta `v*`. El flujo `Build` firma el instalador y adjunta `latest.json` al release.

La clave privada no va nunca al repositorio. Si la pierdes, las instalaciones existentes no podrán actualizarse solas.

Las versiones instaladas antes de activarlo siguen actualizándose a mano una última vez.
