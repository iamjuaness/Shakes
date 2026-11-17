# plugins/

Todo plugin de Shakes vive aquí. Se instalan desde la pestaña **Plugins** (lista «Disponibles» o «Instalar desde archivo…»).

- `temas/*.json`, `estructuras/*.json`: solo datos.
- `herramientas/<id>/`: código + `plugin.json` con `"tool": "<id>"`. Contrato en `herramientas/types.ts`; registro en `index.ts`.

## Temas
| Archivo | Plugin |
|---|---|
| `tema-sepia.json` | Sepia |
| `tema-alto-contraste.json` | Alto contraste |
| `tema-maquina-escribir.json` | Máquina de escribir (monoespaciado) |
| `tema-noche-azul.json` | Noche azul y Solarized |
| `tema-generos.json` | Terror, Fantasía, Ciencia ficción, Romance |
| `bosque_y_terror.json` | Tema + estructura + plantillas de ejemplo |

## Estructuras
`estructura-vogler` (12 etapas) · `estructura-save-the-cat` (15 beats) · `estructura-siete-puntos-wells` · `estructura-snowflake` · `estructura-novela-negra` · `estructura-guion-corto`

## Herramientas
| Id | Qué hace | Dónde sale |
|---|---|---|
| `fichas-auto` | Detecta nombres nuevos, sugiere fichas, resalta y abre ficha lateral | Editor |
| `dialogo-auto` | `"` → « », `--` → — | Editor |
| `repeticiones` | Subraya repeticiones y muletillas; clic = menú de sustitutos | Editor |
| `linter-estilo` | Adverbios, pasiva, gramática, frases largas…; clic = alternativas | Editor |
| `notas-margen` | Notas sobre texto seleccionado | Editor |
| `notas-laterales` | Panel derecho con un .md/.txt de notas previas | Editor |
| `sesion-pomodoro` | Temporizador 25/5 y palabras de la sesión | Editor |
| `maquina-escribir` | Línea de escritura centrada | Editor |
| `inconsistencias` | Ficha vs escenas (ojos, pelo, edad) | Pestaña |
| `arcos-personaje` | Presencia de personajes por escena | Pestaña |
| `mapa-lugares` | Imagen de mapa con lugares | Pestaña |
| `arbol-genealogico` | Generaciones desde relaciones | Pestaña |
| `calendario` | Escenas por fecha | Pestaña |
| `tramas` | Tramas y subtramas por escena | Pestaña |
| `generador-nombres` | Nombres por cultura → ficha | Menú Herramientas |
| `importar` | Markdown, texto y .docx | Menú Herramientas |
| `exportar-extra` | Fountain, LaTeX, HTML | Menú Herramientas |
| `manuscrito-editorial` | Formato estándar para editoriales (PDF) | Menú Herramientas |
| `obsidian-sync` | Fichas → notas `.md` | Menú Herramientas |
| `resumen-escenas` | Rellena sinopsis vacías | Menú Herramientas |

Tests: `node plugins/herramientas/herramientas.test.ts` y `node plugins/herramientas/fichas-auto/detect.test.ts`.
