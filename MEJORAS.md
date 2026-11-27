# Shakes: análisis y plan de mejoras

Revisión del 27 de noviembre de 2026 sobre la versión 0.9.0.

## Dónde está fuerte

- Cubre planificar (fichas, conexiones, línea, tramas, arcos, mundo) y escribir (11 tipos de obra, corrector en unos 90 idiomas).
- Funciona sin conexión, con un archivo abierto (`.shks`) y plugins instalables sin actualizar la app.
- La lógica está separada en funciones puras con pruebas.

## Hecho

| Problema | Solución |
|---|---|
| El PDF salía con fecha, título y dirección del navegador | El PDF lo genera Shakes, con fuentes incrustadas y sin diálogo de impresión |
| No se podía maquetar una novela | Pestaña **Maquetar**: formato, márgenes, tipografía, capítulos, cabeceras, preliminares, índice, vista previa y revisión de imprenta |
| La edición eran subrayados sueltos | **Mesa de edición**: informe, correcciones de todo el libro y plan en seis pasadas |
| Había que buscar las funciones en menús | Paleta de acciones con **Ctrl+K** |
| EPUB sin estilos y siempre en español | Hoja de estilo, idioma de la obra y un archivo por capítulo |

Las 16 propuestas:

| # | Propuesta | Cómo quedó | Alcance y límites |
|---|---|---|---|
| 1 | Control de cambios y comentarios | Pestaña **Cambios** | Compara con una versión o con un `.shks`, `.docx` o `.md` de un lector; comentarios en el texto y los de Word. No registra cambios mientras se escribe |
| 2 | Gramática | Concordancia, tildes diacríticas, leísmo y laísmo; conexión con LanguageTool local | Las reglas propias son heurísticas; el análisis completo necesita LanguageTool instalado |
| 3 | Punto de vista y tiempo verbal | Avisos por escena | Español e inglés; usa los nombres de las fichas |
| 4 | Voz por personaje | Vista **Voces** | Atribuye por el nombre en la acotación |
| 5 | Reglas para inglés y otros idiomas | Juego propio para inglés; puntuación y repeticiones en el resto | |
| 6 | Notas al pie, imágenes y tablas | En el editor, PDF, Word y EPUB | Una nota no se reparte entre dos páginas; tablas sin celdas combinadas; solo en libros |
| 7 | Tipografía | Interletraje, ligaduras, guiones en 19 idiomas, latín extendido, griego y cirílico | Griego y cirílico solo en EB Garamond; sin CJK ni escrituras de derecha a izquierda |
| 8 | Preliminares en Word y EPUB | Los mismos del PDF | |
| 9 | Cubierta completa | Maquetar › **Cubierta** | RGB (no CMYK); el hueco del código de barras va en blanco |
| 10 | Fuentes propias | `.ttf` desde Maquetar | Quedan en el equipo, no viajan en el proyecto; sin OTF con contornos CFF |
| 11 | Guía y recorrido | Pestaña **Guía** y recorrido inicial | |
| 12 | Cuatro modos | Planificar, Escribir, Editar, Publicar | |
| 13 | Paneles en inglés | Traducidos | Los mensajes de las reglas de español siguen en español |
| 14 | Vista continua y editor dividido | Botones en Vista | Sin paneles laterales de herramientas en esas vistas |
| 15 | Fiabilidad | Copias diarias en otra carpeta, aviso de cambio externo y actualizador firmado | El actualizador necesita los secretos de firma en GitHub: ver `docs/actualizador.md` |
| 16 | Pruebas de interfaz y carga diferida | `npm test`; el editor se carga al abrir un proyecto | |

## Siguientes pasos posibles

- Registrar cambios en vivo (modo sugerencias) y exportar a Word con control de cambios.
- PDF en CMYK y PDF/X para imprentas que lo exijan.
- Notas al pie que continúan en la página siguiente.
- Reglas editoriales completas para francés, portugués y alemán.
