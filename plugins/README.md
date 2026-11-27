# plugins/

Todo plugin de Shakes vive aquí. Se instalan desde la pestaña **Plugins** (lista «Disponibles» o «Instalar desde archivo…»).

- `temas/*.json`, `estructuras/*.json`: solo datos.
- `herramientas/<id>/`: código + `plugin.json` con `"tool": "<id>"`. Contrato en `herramientas/types.ts`.
  - **Incluidas en la app** (solo ortografía, por sus diccionarios): registro en `index.ts`.
  - **Externas** (se instalan sin actualizar la app): `plugin.json` con `"main": "main.js"`, sin registrar en `index.ts`. Compila con `npm run plugins` y sube `main.js` junto al manifiesto. Puede importar `react`, `@tiptap/react`, `@tiptap/pm/state|view` y `src/{spell,tree,dialog,i18n}` (los presta Shakes); lo demás se empaqueta dentro. Debe exportar la herramienta (`export default` o export con `id` igual a `tool`).

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
| ~~`ortografia-es` / `ortografia-en`~~ (ahora en el núcleo, en el idioma de cada libro) | Subraya en rojo palabras mal escritas (diccionario Hunspell); clic = sugerencias o añadir al diccionario; conoce nombres y apodos de fichas. Activa solo el del idioma del texto | Editor |
| `notas-margen` | Notas sobre texto seleccionado | Editor |
| `notas-laterales` | Panel derecho con un .md/.txt de notas previas | Editor |
| `sesion-pomodoro` | Temporizador 25/5 y palabras de la sesión | Editor |
| `maquina-escribir` | Línea de escritura centrada | Editor |
| `inconsistencias` | Ficha vs escenas (ojos, pelo, edad) | Barra derecha |
| `arcos-personaje` | Arco de cada personaje: momentos, curva y presencia | Barra derecha |
| `mapa-lugares` | Imagen de mapa con lugares | Barra derecha |
| `arbol-genealogico` | Generaciones desde relaciones | Barra derecha |
| `calendario` | Escenas por fecha | Barra derecha |
| `idiomas` | Idiomas inventados: sonidos, diccionario, gramática y traductor | Barra derecha |
| `magia` | Sistemas de magia sencillos y complejos | Barra derecha |
| `tramas` | Línea de tiempo de tramas y subtramas | Barra derecha |
| `generador-nombres` | Nombres por cultura → ficha | Barra derecha |
| `manuscrito-editorial` | Formato estándar para editoriales (PDF) | Archivo › Exportar a |
| `obsidian-sync` | Fichas → notas `.md` | Archivo › Exportar a |
| `resumen-escenas` | Rellena sinopsis vacías | Barra derecha |

Tests: `node plugins/herramientas/herramientas.test.ts` y `node plugins/herramientas/fichas-auto/detect.test.ts`.
