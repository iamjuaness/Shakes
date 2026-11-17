# Shakes

Herramienta de escritura de historias: manuscrito en árbol (libro → partes → capítulos → escenas), fichas del mundo, mapa de relaciones, línea de tiempo, corcho, análisis de estilo, versiones y exportación a Markdown, Word, EPUB y PDF.

Stack: Tauri 2 + React 19 + TypeScript + Vite + TipTap.

## Ejecutar

```bash
npm install
npm run dev          # solo web, http://localhost:1420
npm run tauri dev    # app de escritorio (requiere Rust y, en Windows, MSVC + Windows SDK)
```

## Pruebas

```bash
node src/tree.test.ts
node src/export.test.ts
node src/plugins.test.ts
npx tsc --noEmit
```

## Datos

El proyecto se guarda en el navegador (IndexedDB) y, si abres o creas un archivo `.shks`, también en él con autoguardado. El formato es JSON abierto.

## Plugins

Archivos JSON (`"shakes": 1`) que aportan temas, estructuras y plantillas de escena. Se instalan desde la pestaña **Plugins**; ver `ejemplos/plugin_bosque_y_terror.json`. No ejecutan código.

## Descargar e instalar (Windows)

- Release: en la pestaña **Releases** de GitHub, descarga `Shakes_<versión>_x64-setup.exe` y ejecútalo.
- Cada push a `main` también genera el instalador como artefacto del workflow **Build** (Actions → ejecución → *Artifacts*).
- Windows SmartScreen puede avisar "editor desconocido": el instalador no está firmado. *Más información → Ejecutar de todas formas*.

## Publicar una versión

1. Sube la versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json` (las tres iguales).
2. `git tag v0.1.0 && git push origin v0.1.0`. El CI compila y adjunta el instalador al release.
