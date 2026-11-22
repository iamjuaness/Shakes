# Changelog / Novedades

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Cada release de GitHub usa la sección de su versión.

## [Sin publicar]

## [0.7.0] - 2026-11-21
### Añadido
- **Plugins con código instalables sin actualizar la app**, como las extensiones de VS Code: un `plugin.json` con `"main"` apunta a un `.js` que Shakes descarga al instalar y guarda con el plugin. Pide confirmación porque ejecuta código. Todas las herramientas pasan a este sistema (menos Ortografía, que lleva diccionarios) y las instalaciones existentes se migran solas. Nuevo plugin: **Borrador de historia** (premisa, lluvia de ideas, beats por plantilla y tablero de escenas que pasan al manuscrito).
### Cambiado
- Las herramientas (menos Ortografía) ya no van compiladas en la app: son plugins externos (`main.js`) y las instalaciones existentes se migran solas al abrir. Para publicar un plugin nuevo basta subir `plugins/` a GitHub: `npm run plugins` genera el `main.js`.

## [0.6.0] - 2026-11-17
### Añadido
- **Fichas de personaje** con estructura propia: apodos o nombres cortos, edad, ocupación, origen, virtudes, defecto central, trasfondo, mentira que se cree, arco de cambio y rasgo inspirador. Los apodos solo aparecen en personajes; las notas antiguas se conservan. Obsidian-sync vuelca estos campos.
- **Estado de escena** (borrador / revisada / final) con punto de color en el árbol y etiqueta en el corcho.
- Idiomas: interfaz en español e inglés, con selector en Ajustes (por defecto, el del sistema).
- Pestaña y pantalla de **Ajustes**: idioma, tema (sistema/claro/oscuro), carpeta predeterminada de proyectos nuevos, intervalo de copia automática y búsqueda de actualizaciones.
- **Actualizador**: al abrir, Shakes consulta la última release de GitHub; si hay una más nueva avisa arriba con el botón «Actualizar» (descarga el instalador) y muestra las novedades.
- Este changelog, visible desde Ajustes.
- Plugins `ortografia-es` y `ortografia-en` (subrayado, sugerencias y diccionario propio).
- Atajos: `Esc` sale del modo concentración, `Ctrl+,` abre Ajustes.
### Cambiado
- Barra superior: menú **Archivo** (Nuevo, Abrir, Guardar, Guardar como, Exportar, Cerrar) con atajos `Ctrl+N/O/S/Shift+S`; la cinta cabe en una fila; los plugins con panel van en «Más ▾»; «Estilo» pasa a «Estadísticas».
- Fecha, estado y meta de la escena con etiqueta visible; metas del libro y diaria con campo numérico en vez de diálogo.
- Tipos de ficha guardados como ids (`character`, `place`…); los proyectos antiguos se migran solos.
- Código: E/S de archivos en `fileio.ts`, exportación en `exporting.ts`, barra en `Ribbon.tsx`, contrato de plugins en `src/pluginApi.ts` (con `host.t` para traducir); el CI corre todos los tests.
- El tema claro/oscuro ahora se recuerda entre sesiones.
- Estructuras integradas (Tres actos, Viaje del héroe…) y títulos por defecto en el idioma elegido.
### Corregido
- Al eliminar una ficha se guarda antes una copia y se quitan las relaciones que apuntaban a ella.

## [0.5.0]
- Apodos en las fichas, «Abrir carpeta…» y exportar sin nombres de escena.

## [0.4.0]
- Plugin `notas-laterales` con markdown.

## [0.3.0]
- Sagas y universos, sustitutos en un clic en el linter, pantalla de inicio estilo Word y raíz borrable.

## [0.2.0]
- Sistema de plugins, proyecto nuevo con carpeta y catálogo en GitHub.

## [0.1.0]
- Shakes v1 y v2: editor, árbol, fichas, línea de tiempo, mapa, estilo, versiones y exportación (Word, EPUB, PDF, Markdown).
