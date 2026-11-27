# Changelog / Novedades

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Cada release de GitHub usa la sección de su versión.

## [Sin publicar]

## [0.9.0] - 2026-11-27
### Añadido
- Plugin **Creador de idiomas**: un idioma completo a partir del idioma del libro (una palabra para cada palabra de su diccionario), sonidos y estilos de partida, gramática con plurales, tiempos y personas, traductor que conjuga y reordena (español e inglés), letras propias dibujables, dialectos por cambios de sonido y cultura.
- Plugin **Sistemas de magia**: modo sencillo y complejo, escala de magia blanda a dura, reglas, escuelas, hechizos, rangos, personajes usuarios, avisos de coherencia e ideas al azar.
### Cambiado
- Las fichas se listan agrupadas por tipo (Personajes, Lugares, Objetos, Facciones).
- Mapa de relaciones: orden automático que separa los grupos y evita cruces, líneas curvas, un color por tipo de relación (dos relaciones entre las mismas fichas se ven por separado), resaltado al pasar el cursor y botón «Reordenar».
- La pestaña «Mapa» pasa a llamarse «Conexiones» (mapa de conexiones entre personajes). Se puede acercar, alejar y desplazar, y las fichas con más conexiones se ven más grandes.
- En el mapa de conexiones cada tipo de ficha tiene su icono: persona, casa (lugar), cubo (objeto) y escudo (facción).
- Todas las exportaciones, incluidas las de los plugins, están en Archivo › Exportar a.
- Las herramientas de los plugins pasan a una barra vertical a la derecha, cada una con su icono. Desaparecen los menús «Herramientas ▾» y «Más ▾»; Plugins es una pestaña. Las que solo actúan mientras escribes no salen en la barra.
- Importar (Markdown, texto y Word) y exportar a HTML, LaTeX y Fountain vienen en la app, en Archivo; los plugins «Importar» y «Exportar extra» desaparecen.
- Árbol genealógico rehecho: iconos de persona, generaciones ordenadas (abuelos, padres, hijos), parejas juntas, hijos bajo sus padres, familias separadas en recuadros y zoom.
- El árbol genealógico admite bucles (viajes en el tiempo): la relación que cierra el bucle se dibuja aparte, en rojo punteado y marcada como «paradoja».
- **Arcos de personaje** rehecho: tipo de arco, mentira, defecto y arco de la ficha, seis momentos clave con capítulo, nota y estado, curva de cambio, presencia por capítulo y avisos.
- **Tramas** rehecho: línea de tiempo con un carril por trama y zoom, descripción, tipo y personajes, nota y fase en cada capítulo, avisos de tramas abandonadas o sin resolver y confirmación al borrar. Se conservan las marcas anteriores.

## [0.8.0] - 2026-11-26
### Añadido
- **Web de Shakes** (`docs/`, GitHub Pages): descarga de la última versión directamente desde las releases y tutoriales de uso (primer proyecto, escribir cómodo, corrector, fichas, Taller creativo, guiones, exportar, atajos y problemas frecuentes).
- **Para cualquier tipo de escrito**: al crear un proyecto se elige novela, cuento, poemario (Intro = verso, Intro dos veces = estrofa), ensayo / no ficción, artículos / blog, diario (cada entrada con la fecha), novela epistolar, guion de cine, teatro, cómic / novela gráfica o radio / pódcast. Cada tipo llama a sus piezas por su nombre (poema, entrada, carta, página…) y se puede cambiar en los datos de la obra.
- **Guion para teatro, cómic y radio**: elementos propios (acotación y aparte; viñeta, descripción, cartela y onomatopeya; voz, sonido y música), con su formato en el editor y en el PDF.
- **Taller creativo** (se instala solo): personajes completos creados de acuerdo a tu historia —nombre de la cultura y época elegidas, edad según su papel, oficio de ese mundo, virtudes, defecto, herida, mentira, arco, deseo, miedo, secreto, voz, rasgo físico y su relación con tu protagonista—, más lugares, objetos, conflictos con tus personajes, giros de trama, «¿y si…?», títulos, «Estoy atascado» con ejercicios y sprints de escritura. Lo generado sale en el idioma del libro.
- **Nombres de 62 culturas y 8 épocas** (Antigüedad, Edad Media, siglos XVI–XVIII, XIX, XX, actualidad, fantasía y ciencia ficción), por género y con las costumbres de cada una: dos apellidos, patronímicos nórdicos, apellido delante en Asia oriental y Hungría, apellidos eslavos en femenino, «ibn/bint», «hijo de»… Incluye pueblos originarios de América (mexica, maya, inca, mapuche, guaraní) y nombres inventados para fantasía y ciencia ficción.
- **Escritorio**: abrir, guardar, elegir carpeta y exportar usan los diálogos y archivos nativos del sistema (sin permisos «de sitio web» ni diálogos minimizados); las carpetas elegidas se recuerdan entre sesiones. Exportar pregunta dónde guardar.
- PDF del guion generado por Shakes, sin pasar por el diálogo de impresión: sin fecha ni URL del navegador; Courier 12, negrita y cursiva, diálogos partidos con (MÁS) / (CONT.).
- **Corrector ortográfico en el idioma de cada libro**, no en el de la interfaz: se elige al crear el proyecto o en la barra de estado. Unos 90 idiomas (Hunspell); español e inglés vienen incluidos y los demás se descargan una vez y quedan guardados. Se puede apagar en Ajustes. Sustituye a los plugins `ortografia-es`/`ortografia-en`, que se quitan solos.
- **Plugin Guion** (se instala solo al abrir un guion): proyecto nuevo «Guion» con escenas (y actos opcionales); elementos de guion (encabezado, acción, personaje, acotación, diálogo, transición) con Tab/Mayús+Tab e Intro; «INT.»/«EXT.» y «CORTE A:» se reconocen solos; la escena toma el nombre de su encabezado; desglose de escenas y reparto con minutos aproximados; exportación a Fountain y a PDF con formato de industria.
- Guion con el formato profesional: Courier 12 sencillo (1 página ≈ 1 minuto), márgenes de 1" (izquierdo 1,5"), papel Carta o A4 (se propone según el idioma), sangrías de personaje (9,65 cm), diálogo (6,6 cm, 35 caracteres de ancho) y acotación (8,26 cm), transiciones a la derecha, sin justificar, encabezados en mayúsculas sin negrita, negrita permitida en la acción, portada sin número y páginas numeradas arriba a la derecha («2.»). Word y EPUB también salen con formato de guion.
- Guion: autocompletar personajes (los que ya hablan y las fichas): «AN» + Intro = ANA. Aviso de encabezados incompletos (INT./EXT. LUGAR - DÍA/NOCHE) en el editor y en el desglose. Reconoce «fundido a negro», «corte a», «dissolve to»…
- Botón «⁂» de cambio de escena dentro de un capítulo (se exporta como «* * *»).
- «Sin subrayados»: escribir sin ver correcciones de ortografía, estilo ni repeticiones, y revisar después.
- Ajustes de escritura: tamaño del texto y ancho de la columna.
- El título del capítulo o escena se cambia escribiendo directamente en la barra superior.
### Cambiado
- **Los libros se escriben por capítulos** (agrupados en partes si se quiere); las escenas quedan para los guiones. Los proyectos antiguos se convierten al abrirlos: las escenas de cada capítulo se unen en él, separadas con «* * *», y antes se guarda una copia en Versiones.
- Al abrir un proyecto se vuelve a lo último que se estaba escribiendo, no al primer capítulo.
- Los plugins incluidos en la app se actualizan solos cuando la app trae una versión más nueva.
- El corrector trabaja en un hilo aparte (Web Worker): cargar un diccionario o pedir sugerencias ya no congela la app.
- Linter de estilo, repeticiones y diálogo automático solo se activan si el libro está en español; las estadísticas ocultan adverbios en -mente y legibilidad INFLESZ en otros idiomas.
- Los subrayados (ortografía, estilo, repeticiones) solo se recalculan en el párrafo que cambia: escribir en capítulos largos ya no se ralentiza.
### Arreglado
- Pérdida de datos: «Nuevo» y luego «Volver al proyecto» recuperaba el proyecto tal como estaba al abrirlo y el autoguardado pisaba el archivo con esa copia vieja.
- «Cerrar proyecto» sin archivo (solo en el navegador) lo borraba sin avisar: ahora ofrece Guardar como….
- Abrir otro archivo perdía lo escrito en el último medio segundo.
- Instalar un plugin con extensiones de editor no tenía efecto hasta cambiar de capítulo.
- El corrector del navegador subrayaba a la vez que el de Shakes (y en el idioma del sistema).
- Fichas automáticas abría una ventana a mitad de frase que se quedaba con el Intro y creaba la ficha sin querer: ahora es un aviso discreto que no quita el teclado. Ya no propone palabras EN MAYÚSCULAS (sonidos, siglas, encabezados de guion) como nombres.
- PDF del guion: la portada desbordaba y dejaba una página en blanco.
- Las exportaciones avisan de dónde se guardó el archivo (antes caían en Descargas sin decir nada); el PDF recuerda desmarcar «Encabezados y pies de página» del diálogo de impresión.
- En un guion, «Exportar Fountain» de Exportar extra remite a «Exportar guion (Fountain)…», que sí conserva los elementos de guion.

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
