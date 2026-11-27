// Textos de la interfaz en español e inglés. `es` es la fuente; `en` debe tener las mismas claves (lo comprueba tsc y i18n.test.ts).
// Uso: t("clave", { n: 3 }) con marcadores {n}. Los plugins de herramienta pueden traducir su nombre con tr("tool.<id>", nombre).
export type Lang = "es" | "en";

const es = {
  // pestañas
  "tab.book": "Manuscrito", "tab.cork": "Corcho", "tab.cards": "Fichas", "tab.timeline": "Línea", "tab.map": "Conexiones", "tab.style": "Estadísticas",
  "tab.search": "Buscar", "tab.versions": "Versiones", "tab.plugins": "Plugins", "tab.settings": "Ajustes",
  // cinta
  "g.file": "Archivo", "g.insert": "Insertar", "g.scene": "Escena", "g.project": "Proyecto", "g.view": "Vista",
  "file.new": "Nuevo", "file.close": "Cerrar proyecto", "file.close.title": "Guardar y volver a la pantalla de inicio", "file.open": "Abrir", "file.saveas": "Guardar como…", "file.export": "Exportar ▾",
  "export.scope": "Se exporta: {what}", "export.all": "todo", "export.md": "Markdown (.md)", "export.docx": "Word (.docx)", "export.epub": "EPUB (.epub)", "export.pdf": "PDF (imprimir)",
  "ins.structure": "Estructura…", "ins.sceneTpl": "Plantilla de escena…", "ins.card": "+ Ficha",
  "scene.date": "Fecha en la línea de tiempo", "scene.goal": "Meta de palabras", "scene.goal.ph": "Meta",
  "proj.scope.title": "Qué usan Corcho, Línea, Estilo y Exportar", "proj.scope": "Ámbito: {v}", "proj.scope.book": "libro actual", "proj.scope.all": "todo",
  "proj.toSaga": "Convertir en saga", "proj.toUniverse": "Convertir en universo", "proj.goalAsk": "Meta de palabras del libro (0 = sin meta)", "proj.goal": "Meta: {n} palabras", "proj.setGoal": "Fijar meta",
  "view.focus": "Concentración", "view.exit": "Salir", "view.theme": "Tema: {v}", "view.dark": "oscuro", "view.light": "claro",
  "view.quiet": "Sin subrayados", "view.quiet.title": "Escribe sin correcciones a la vista (ortografía, estilo, repeticiones); revisa después", "view.check": "Mostrar revisión",
  "settings.open": "Ajustes (Ctrl+,)", "file.menu": "Archivo ▾", "file.save": "Guardar", "file.exportH": "Exportar a", "file.importH": "Importar desde", "import.md": "Markdown / texto (.md, .txt)…", "import.docx": "Word (.docx)…", "export.html": "HTML (.html)", "export.tex": "LaTeX (.tex)", "export.fountain": "Fountain (.fountain)", "imp.empty": "⚠ El archivo no tiene texto.", "imp.script": "⚠ Un guion no admite libros importados: crea un proyecto de libro o una saga.", "imp.bad": "⚠ No se pudo leer el archivo.", "imp.askAdd": "¿Añadir «{n}» como libro nuevo de «{r}»?", "imp.askReplace": "¿Reemplazar todo el libro por «{n}»? Antes se guarda una copia en Versiones.", "imp.added": "Libro «{n}» añadido", "imp.replaced": "Libro reemplazado con la estructura de {n}", "bar.tools": "Herramientas", "bar.open": "Abrir panel", "scene.date.label": "Fecha", "scene.goal.label": "Meta", "proj.goal.label": "Meta del libro", "prog.goal.label": "Meta diaria", "w.saveNeeded": "Guardado en el navegador; usa Guardar como… para crear el archivo.", "st.noStatus": "—",
  // editor
  "fmt.bold": "Negrita", "fmt.italic": "Cursiva", "fmt.h1": "Título", "fmt.h2": "Subtítulo", "fmt.list": "Lista", "fmt.quote": "Cita", "fmt.undo": "Deshacer", "fmt.redo": "Rehacer", "fmt.sep": "Cambio de escena (* * *)",
  "scene.in": "Aparecen aquí:", "empty.scene": "Selecciona o crea un capítulo para escribir.\nDoble clic o F2 renombra. Arrastra, o usa Alt+↑↓, para reordenar. Ctrl+F busca en todo el libro. Esc sale del modo concentración.",
  "title.rename": "Título (clic para cambiarlo)", "book.lang": "Idioma del texto (corrector)",
  "sp.title": "Posible error de ortografía", "sp.add": "＋ Añadir «{w}» al diccionario", "sp.fail": "⚠ No se pudo descargar el diccionario de {l}; sin corrector hasta que haya conexión.",
  // estado y avisos
  "st.saved": "Guardado {t}", "st.downloaded": "Descargado {t}", "st.open": "abierto", "st.browserOnly": "Solo en este navegador", "st.reconnect": "Reconectar «{name}»",
  "st.words.scene": "{n} palabras aquí", "st.today": "Hoy +{n}", "st.words": "{n} palabras", "st.pct": " · {n}% de la meta", "st.replaced": "{n} reemplazos", "st.exported": "«{n}» guardado", "w.export": "⚠ No se pudo exportar.",
  "w.idb": "⚠ No se pudo guardar en el navegador (¿almacenamiento lleno?). Usa Guardar como… para no perder datos.", "w.file": "⚠ No se pudo escribir el archivo. Reconéctalo con Abrir o Guardar como…",
  "w.invalid": "⚠ Archivo no válido.", "w.plugins": "⚠ No se pudieron guardar los plugins.",
  // diálogos
  "d.cancel": "Cancelar", "d.ok": "Aceptar", "d.closeFail": "No se pudo guardar el archivo. ¿Cerrar de todos modos?",
  "d.noFile": "Este proyecto solo está guardado en el navegador: al cerrarlo se pierde. ¿Qué hacemos?", "d.noFile.save": "Guardar como… (recomendado)", "d.noFile.close": "Cerrar y perderlo",
  "d.replace": "¿Reemplazar {n} coincidencias en {s} capítulos o escenas por «{r}»? Antes se guarda una copia.", "d.sagaName": "Nombre de la saga", "d.universeName": "Nombre del universo",
  "d.sagaDef": "Saga de {t}", "d.universeDef": "Universo de {t}", "snap.beforeReplace": "Antes de reemplazar", "snap.beforeImport": "Antes de importar", "snap.beforeSaga": "Antes de crear la saga", "snap.beforeUniverse": "Antes de crear el universo",
  "snap.beforeDelete": "Antes de eliminar", "snap.beforeDeleteCard": "Antes de eliminar ficha", "snap.auto": "Copia automática", "snap.beforeChapters": "Antes de pasar las escenas a capítulos",
  "d.addStructure": "Añadir estructura al libro:", "d.insertTpl": "Insertar plantilla en el texto:", "d.dailyGoal": "Meta diaria de palabras (0 = sin meta)", "d.deleteCard": "¿Eliminar la ficha \"{name}\"?",
  "d.newTitle": "Nuevo título", "d.emptyProject": "¿Vaciar el proyecto? Se elimina \"{t}\" y todo su contenido; queda una raíz en blanco. Se guarda una copia antes.", "d.deleteNode": "¿Eliminar \"{t}\" y todo su contenido? Se guarda una copia antes.",
  // árbol
  "tree.label": "Manuscrito", "tree.fold": "Plegar", "tree.unfold": "Desplegar", "tree.add": "Añadir {k}", "tree.delete": "Eliminar",
  "kind.blank": "proyecto", "kind.universe": "universo", "kind.saga": "saga", "kind.book": "libro", "kind.part": "parte", "kind.chapter": "capítulo", "kind.scene": "escena", "kind.script": "guion", "kind.act": "acto",
  "kindT.blank": "Proyecto", "kindT.universe": "Universo", "kindT.saga": "Saga", "kindT.book": "Libro", "kindT.part": "Parte", "kindT.chapter": "Capítulo", "kindT.scene": "Escena", "kindT.script": "Guion", "kindT.act": "Acto",
  // fichas
  "card.new": "Nueva ficha", "card.empty": "Crea o selecciona una ficha.", "card.name": "Nombre", "card.type": "Tipo", "card.alias": "Apodos o nombres cortos", "card.alias.ph": "Separados por comas (Vero, Véronique)", "card.age": "Edad", "card.job": "Ocupación", "card.origin": "Origen (de dónde viene)", "card.virtues": "Virtudes", "card.flaw": "Defecto central", "card.backstory": "Trasfondo", "card.lie": "Mentira que se cree", "card.arc": "Arco de cambio", "card.trait": "Rasgo inspirador", "card.notes.extra": "Notas",
  "card.notes": "Notas…", "card.links": "Relaciones", "card.deleted": "(borrada)", "card.unlink": "Quitar relación", "card.relateWith": "Relacionar con", "card.relate": "+ Relacionar con…",
  "card.relType": "Tipo de relación (ej. hermano de, vive en)", "card.appears": "Aparece en", "card.noScenes": "Ningún capítulo ni escena menciona «{name}».", "card.back": "← Volver a las conexiones", "card.delete": "Eliminar ficha",
  "type.character": "Personaje", "type.place": "Lugar", "type.object": "Objeto", "type.faction": "Facción",
  "types.character": "Personajes", "types.place": "Lugares", "types.object": "Objetos", "types.faction": "Facciones",
  "status.none": "Sin estado", "status.draft": "Borrador", "status.revised": "Revisada", "status.final": "Final", "scene.status": "Estado",
  // vistas
  "tl.narr": "Narrativa", "tl.chrono": "Cronológica", "tl.hint": "Cambia la fecha de cada capítulo o escena aquí mismo. Lo que no tiene fecha va al final.", "tl.dateOf": "Fecha de {t}", "words.n": "{n} palabras",
  "map.title": "Mapa de conexiones entre personajes", "map.zoomIn": "Acercar", "map.zoomOut": "Alejar", "map.fit": "Ver todo", "map.empty": "Crea fichas y relaciónalas para ver sus conexiones.", "map.hint": "Rueda para acercar, arrastra el fondo para desplazarte. Pasa el cursor por una ficha para ver solo sus conexiones.", "map.reorder": "Reordenar", "d.reorderMap": "¿Reordenar las conexiones automáticamente? Se pierden las posiciones que moviste a mano.",
  "lv.1": "muy difícil", "lv.2": "algo difícil", "lv.3": "normal", "lv.4": "bastante fácil", "lv.5": "muy fácil",
  "stat.words": "palabras", "stat.sentences": "frases", "stat.avg": "palabras por frase", "stat.longest": "frase más larga", "stat.adverbs": "adverbios en -mente", "stat.dialogue": "diálogo", "stat.read": "legibilidad · {l}",
  "stat.top": "Más repetidas (sin nombres de fichas)", "stat.near": "Repeticiones cercanas (misma palabra a menos de 25 palabras)",
  "prog.title": "Progreso diario", "prog.goal": "Meta diaria: {n}", "prog.setGoal": "Fijar meta diaria", "prog.today": "Hoy", "prog.book": "Libro completo",
  "ver.save": "Guardar versión", "ver.name": "Nombre de la versión", "ver.noName": "Sin nombre", "ver.auto": " · automática", "ver.hide": "Ocultar", "ver.compare": "Comparar", "ver.restore": "Restaurar",
  "ver.restoreAsk": "¿Restaurar esta versión? Antes se guarda una copia del estado actual.", "ver.delete": "Eliminar versión", "ver.deleteAsk": "¿Eliminar esta versión?",
  "ver.vs": "Frente al texto actual: {d} palabras", "ver.changed": "Cambiadas", "ver.added": "Añadidas después", "ver.removed": "Eliminadas después", "ver.same": "Sin diferencias en el texto.", "ver.none": "Sin versiones guardadas.",
  "cork.empty": "Aún no hay capítulos ni escenas.", "cork.synopsis": "Sinopsis…", "cork.synopsisOf": "Sinopsis de {t}",
  "se.find": "Buscar en todo el libro…", "se.replaceWith": "Reemplazar por…", "se.replaceAll": "Reemplazar todo", "se.hits": "{n} coincidencias en {s} capítulos o escenas",
  // metadatos del libro
  "bm.title": "Datos del {k}: {t}", "bm.author": "Autor", "bm.year": "Año", "bm.blurb": "Sinopsis", "bm.noCover": "Sin portada.", "bm.coverOf": "Portada de {t}", "bm.change": "Cambiar portada…", "bm.pick": "Elegir portada…", "bm.remove": "Quitar",
  "bm.hint": "La portada (imagen) se usa en Word, EPUB y PDF; en Markdown, LaTeX y Fountain salen autor, año y sinopsis.",
  // inicio
  "wl.open": "📂 Abrir existente…", "wl.folder": "🗂 Abrir carpeta…", "wl.back": "← Volver al proyecto", "wl.settings": "⚙ Ajustes", "wl.new": "Nuevo", "wl.recent": "Recientes", "wl.noRecent": "Aún no has abierto ningún proyecto.",
  "wl.templates": "Plantilla", "wl.name": "Nombre", "wl.namePh": "Mi novela", "wl.willBe": "Se creará en", "wl.noFolder": "(sin carpeta)", "wl.pickFolder": "Elegir carpeta…",
  "wl.inFolder": "Crear el .shks directamente en esta carpeta (sin subcarpeta)", "wl.always": "Usar esta carpeta siempre (predeterminada)", "wl.create": "Crear proyecto",
  "wl.noPicker": "Este navegador no puede elegir carpetas: se guardará solo el archivo .shks{how}. Con Edge o Chrome se crea la carpeta del proyecto.", "wl.noPicker.where": " donde lo indiques", "wl.noPicker.dl": " como descarga",
  "wl.errFolder": "Elige la carpeta donde se creará el proyecto.", "wl.errPerm": "Sin permiso para escribir en esa carpeta.", "wl.errCreate": "No se pudo crear: {e}",
  "wl.errPermOpen": "Sin permiso para abrir «{n}».", "wl.errOpen": "No se pudo abrir «{n}»: ¿se movió o se borró?", "wl.multi": "«{n}» tiene {c} proyectos: ábrelo con «Abrir existente…».",
  "wl.noShks": "«{n}» no tiene ningún .shks: ponle nombre y pulsa «Crear proyecto» para crearlo aquí.", "wl.errFolderOpen": "No se pudo abrir la carpeta: {e}", "wl.errFile": "Archivo no válido.",
  "wl.removeRecent": "Quitar de recientes: {n}", "wl.removeRecent.title": "Quitar de la lista", "pl.blank": "En blanco", "pl.blank.i": "Nada creado: tú montas la estructura desde cero.", "pl.book": "Libro", "pl.book.i": "Una sola historia: capítulos, agrupados en partes si quieres.", "pl.script": "Guion de cine", "pl.script.i": "Cine o serie: escenas con formato de guion de industria.",
  "pl.short": "Cuento", "pl.short.i": "Relato breve, en una o pocas secciones.", "pl.poetry": "Poemario", "pl.poetry.i": "Poemas: Intro = verso nuevo, Intro dos veces = estrofa.",
  "pl.essay": "Ensayo / no ficción", "pl.essay.i": "Capítulos con títulos y citas; divulgación, memorias, tesis.", "pl.article": "Artículos / blog", "pl.article.i": "Piezas sueltas agrupadas en series.",
  "pl.diary": "Diario", "pl.diary.i": "Cada entrada lleva la fecha del día.", "pl.letters": "Novela epistolar", "pl.letters.i": "Historia contada en cartas.",
  "pl.theatre": "Teatro", "pl.theatre.i": "Actos y escenas con personajes, diálogo y acotaciones.", "pl.comic": "Cómic / novela gráfica", "pl.comic.i": "Páginas y viñetas: descripción, diálogo, cartela, onomatopeya.",
  "pl.audio": "Radio / pódcast", "pl.audio.i": "Episodios con voces, sonidos y música.", "bm.formato": "Tipo de obra", "wl.lang": "Idioma del libro",
  "pl.saga": "Saga / trilogía", "pl.saga.i": "Varios libros con fichas compartidas.", "pl.universe": "Universo", "pl.universe.i": "Sagas y libros sueltos del mismo mundo.", "pl.tpl.i": "Libro con {n} partes de estructura.",
  // plugins
  "pg.search": "Buscar plugins…", "pg.file": "Desde archivo…", "pg.tool": "Herramientas", "pg.struct": "Estructuras", "pg.theme": "Temas", "pg.active": "Tema activo", "pg.default": "Predeterminado",
  "pg.installed": "Instalados", "pg.none": "Ninguno.", "pg.remove": "Quitar", "pg.available": "Disponibles", "pg.loading": "· buscando en GitHub…", "pg.gh": "· GitHub: {n} plugins", "pg.noGh": "· sin GitHub ({e}); se muestran los incluidos",
  "pg.refresh": "Actualizar", "pg.noHits": "Sin resultados.", "pg.allIn": "Todos instalados.", "pg.install": "Instalar", "pg.needNew": "⚠ La herramienta «{t}» necesita una versión más nueva de Shakes.", "pg.added": "Plugin «{n}» instalado",
  "pg.trust": "«{n}» ejecuta código dentro de Shakes, con acceso a tu proyecto. Instálalo solo si confías en su autor. ¿Continuar?", "pg.errCode": "⚠ No se pudo bajar el código de «{n}»: {e}", "pg.errLoad": "⚠ «{n}» tiene código no válido o incompatible con esta versión de Shakes.",
  "pg.invalid": "⚠ Plugin no válido: {e}", "pg.badJson": "⚠ El archivo no es JSON válido.",
  // ajustes
  "set.title": "Ajustes", "set.general": "General", "set.lang": "Idioma", "set.theme": "Tema", "set.theme.auto": "Según el sistema", "set.theme.light": "Claro", "set.theme.dark": "Oscuro",
  "set.projects": "Proyectos", "set.dir": "Carpeta predeterminada para proyectos nuevos", "set.dir.none": "Ninguna (se pregunta al crear)", "set.dir.pick": "Elegir carpeta…", "set.dir.clear": "Quitar", "set.dir.unsupported": "Este navegador no puede elegir carpetas.",
  "set.saving": "Copias de seguridad", "set.copy": "Copia automática cada", "set.copy.off": "Desactivada", "set.copy.min": "{n} min", "set.copy.hint": "Se guarda una versión automática (máx. 20) si hubo cambios.",
  "set.writing": "Escritura", "set.spell": "Corregir la ortografía en el idioma de cada libro", "set.spell.hint": "El idioma se elige al crear el proyecto o en la barra de estado. Español e inglés vienen incluidos; los demás se descargan una vez.",
  "set.font": "Tamaño del texto", "set.width": "Ancho de la columna", "set.width.n": "Estrecha", "set.width.m": "Media", "set.width.w": "Ancha",
  "set.updates": "Actualizaciones", "set.checkStart": "Buscar actualizaciones al abrir Shakes", "set.checkNow": "Buscar ahora", "set.version": "Versión instalada: {v}", "set.upToDate": "Estás en la última versión.", "set.checking": "Buscando…", "set.checkFail": "No se pudo comprobar: {e}",
  "set.changelog": "Novedades",
  // actualizador
  "up.available": "Shakes {v} está disponible (tienes {cur}).", "up.update": "Actualizar", "up.notes": "Novedades", "up.hide": "Ocultar", "up.later": "Más tarde", "up.noAsset": "Abrir la página de la versión",
  "up.hint": "Se descarga el instalador; ciérralo todo y ejecútalo para actualizar.",
} as const;

export type Key = keyof typeof es;

const en: Record<Key, string> = {
  "tab.book": "Manuscript", "tab.cork": "Corkboard", "tab.cards": "Cards", "tab.timeline": "Timeline", "tab.map": "Connections", "tab.style": "Statistics",
  "tab.search": "Search", "tab.versions": "Versions", "tab.plugins": "Plugins", "tab.settings": "Settings",
  "g.file": "File", "g.insert": "Insert", "g.scene": "Scene", "g.project": "Project", "g.view": "View",
  "file.new": "New", "file.close": "Close project", "file.close.title": "Save and go back to the start screen", "file.open": "Open", "file.saveas": "Save as…", "file.export": "Export ▾",
  "export.scope": "Exporting: {what}", "export.all": "everything", "export.md": "Markdown (.md)", "export.docx": "Word (.docx)", "export.epub": "EPUB (.epub)", "export.pdf": "PDF (print)",
  "ins.structure": "Structure…", "ins.sceneTpl": "Scene template…", "ins.card": "+ Card",
  "scene.date": "Date on the timeline", "scene.goal": "Word goal", "scene.goal.ph": "Goal",
  "proj.scope.title": "What Corkboard, Timeline, Style and Export use", "proj.scope": "Scope: {v}", "proj.scope.book": "current book", "proj.scope.all": "everything",
  "proj.toSaga": "Turn into saga", "proj.toUniverse": "Turn into universe", "proj.goalAsk": "Book word goal (0 = no goal)", "proj.goal": "Goal: {n} words", "proj.setGoal": "Set goal",
  "view.focus": "Focus mode", "view.exit": "Exit", "view.theme": "Theme: {v}", "view.dark": "dark", "view.light": "light",
  "view.quiet": "No underlines", "view.quiet.title": "Write with no corrections in sight (spelling, style, repetitions); revise later", "view.check": "Show review",
  "settings.open": "Settings (Ctrl+,)", "file.menu": "File ▾", "file.save": "Save", "file.exportH": "Export to", "file.importH": "Import from", "import.md": "Markdown / text (.md, .txt)…", "import.docx": "Word (.docx)…", "export.html": "HTML (.html)", "export.tex": "LaTeX (.tex)", "export.fountain": "Fountain (.fountain)", "imp.empty": "⚠ The file has no text.", "imp.script": "⚠ A script cannot take imported books: create a book or saga project.", "imp.bad": "⚠ The file could not be read.", "imp.askAdd": "Add “{n}” as a new book in “{r}”?", "imp.askReplace": "Replace the whole book with “{n}”? A copy is saved in Versions first.", "imp.added": "Book “{n}” added", "imp.replaced": "Book replaced with the structure of {n}", "bar.tools": "Tools", "bar.open": "Open panel", "scene.date.label": "Date", "scene.goal.label": "Goal", "proj.goal.label": "Book goal", "prog.goal.label": "Daily goal", "w.saveNeeded": "Saved in the browser; use Save as… to create the file.", "st.noStatus": "—",
  "fmt.bold": "Bold", "fmt.italic": "Italic", "fmt.h1": "Heading", "fmt.h2": "Subheading", "fmt.list": "List", "fmt.quote": "Quote", "fmt.undo": "Undo", "fmt.redo": "Redo", "fmt.sep": "Scene break (* * *)",
  "scene.in": "Appear here:", "empty.scene": "Select or create a chapter to write.\nDouble-click or F2 renames. Drag, or use Alt+↑↓, to reorder. Ctrl+F searches the whole book. Esc leaves focus mode.",
  "title.rename": "Title (click to change it)", "book.lang": "Language of the text (spelling)",
  "sp.title": "Possible spelling mistake", "sp.add": "＋ Add “{w}” to the dictionary", "sp.fail": "⚠ Couldn't download the {l} dictionary; no spell check until you're online.",
  "st.saved": "Saved {t}", "st.downloaded": "Downloaded {t}", "st.open": "open", "st.browserOnly": "Only in this browser", "st.reconnect": "Reconnect “{name}”",
  "st.words.scene": "{n} words here", "st.today": "Today +{n}", "st.words": "{n} words", "st.pct": " · {n}% of the goal", "st.replaced": "{n} replacements", "st.exported": "“{n}” saved", "w.export": "⚠ Export failed.",
  "w.idb": "⚠ Could not save in the browser (storage full?). Use Save as… so you don't lose data.", "w.file": "⚠ Could not write the file. Reconnect it with Open or Save as…",
  "w.invalid": "⚠ Invalid file.", "w.plugins": "⚠ Could not save the plugins.",
  "d.cancel": "Cancel", "d.ok": "OK", "d.closeFail": "The file could not be saved. Close anyway?",
  "d.noFile": "This project is only saved in the browser: closing it loses it. What should we do?", "d.noFile.save": "Save as… (recommended)", "d.noFile.close": "Close and lose it",
  "d.replace": "Replace {n} matches in {s} chapters or scenes with “{r}”? A copy is saved first.", "d.sagaName": "Saga name", "d.universeName": "Universe name",
  "d.sagaDef": "Saga of {t}", "d.universeDef": "Universe of {t}", "snap.beforeReplace": "Before replacing", "snap.beforeImport": "Before importing", "snap.beforeSaga": "Before creating the saga", "snap.beforeUniverse": "Before creating the universe",
  "snap.beforeDelete": "Before deleting", "snap.beforeDeleteCard": "Before deleting card", "snap.auto": "Automatic copy", "snap.beforeChapters": "Before turning scenes into chapters",
  "d.addStructure": "Add a structure to the book:", "d.insertTpl": "Insert a template in the text:", "d.dailyGoal": "Daily word goal (0 = no goal)", "d.deleteCard": "Delete the card \"{name}\"?",
  "d.newTitle": "New title", "d.emptyProject": "Empty the project? \"{t}\" and all its content are deleted; a blank root remains. A copy is saved first.", "d.deleteNode": "Delete \"{t}\" and all its content? A copy is saved first.",
  "tree.label": "Manuscript", "tree.fold": "Collapse", "tree.unfold": "Expand", "tree.add": "Add {k}", "tree.delete": "Delete",
  "kind.blank": "project", "kind.universe": "universe", "kind.saga": "saga", "kind.book": "book", "kind.part": "part", "kind.chapter": "chapter", "kind.scene": "scene", "kind.script": "script", "kind.act": "act",
  "kindT.blank": "Project", "kindT.universe": "Universe", "kindT.saga": "Saga", "kindT.book": "Book", "kindT.part": "Part", "kindT.chapter": "Chapter", "kindT.scene": "Scene", "kindT.script": "Script", "kindT.act": "Act",
  "card.new": "New card", "card.empty": "Create or select a card.", "card.name": "Name", "card.type": "Type", "card.alias": "Nicknames or short names", "card.alias.ph": "Comma-separated (Vero, Véronique)", "card.age": "Age", "card.job": "Occupation", "card.origin": "Origin (where they come from)", "card.virtues": "Virtues", "card.flaw": "Central flaw", "card.backstory": "Backstory", "card.lie": "The lie they believe", "card.arc": "Arc of change", "card.trait": "Inspiring trait", "card.notes.extra": "Notes",
  "card.notes": "Notes…", "card.links": "Relationships", "card.deleted": "(deleted)", "card.unlink": "Remove relationship", "card.relateWith": "Relate to", "card.relate": "+ Relate to…",
  "card.relType": "Relationship type (e.g. brother of, lives in)", "card.appears": "Appears in", "card.noScenes": "No chapter or scene mentions “{name}”.", "card.back": "← Back to connections", "card.delete": "Delete card",
  "type.character": "Character", "type.place": "Place", "type.object": "Object", "type.faction": "Faction",
  "types.character": "Characters", "types.place": "Places", "types.object": "Objects", "types.faction": "Factions",
  "status.none": "No status", "status.draft": "Draft", "status.revised": "Revised", "status.final": "Final", "scene.status": "Status",
  "tl.narr": "Narrative", "tl.chrono": "Chronological", "tl.hint": "Change each chapter's or scene's date right here. Undated ones go last.", "tl.dateOf": "Date of {t}", "words.n": "{n} words",
  "map.title": "Character connections map", "map.zoomIn": "Zoom in", "map.zoomOut": "Zoom out", "map.fit": "Show all", "map.empty": "Create cards and link them to see their connections.", "map.hint": "Scroll to zoom, drag the background to pan. Hover a card to see only its connections.", "map.reorder": "Rearrange", "d.reorderMap": "Rearrange the connections automatically? Positions you set by hand will be lost.",
  "lv.1": "very hard", "lv.2": "somewhat hard", "lv.3": "normal", "lv.4": "fairly easy", "lv.5": "very easy",
  "stat.words": "words", "stat.sentences": "sentences", "stat.avg": "words per sentence", "stat.longest": "longest sentence", "stat.adverbs": "-mente adverbs", "stat.dialogue": "dialogue", "stat.read": "readability · {l}",
  "stat.top": "Most repeated (excluding card names)", "stat.near": "Close repetitions (same word within 25 words)",
  "prog.title": "Daily progress", "prog.goal": "Daily goal: {n}", "prog.setGoal": "Set daily goal", "prog.today": "Today", "prog.book": "Whole book",
  "ver.save": "Save version", "ver.name": "Version name", "ver.noName": "Unnamed", "ver.auto": " · automatic", "ver.hide": "Hide", "ver.compare": "Compare", "ver.restore": "Restore",
  "ver.restoreAsk": "Restore this version? A copy of the current state is saved first.", "ver.delete": "Delete version", "ver.deleteAsk": "Delete this version?",
  "ver.vs": "Compared with the current text: {d} words", "ver.changed": "Changed", "ver.added": "Added since", "ver.removed": "Removed since", "ver.same": "No differences in the text.", "ver.none": "No saved versions.",
  "cork.empty": "There are no chapters or scenes yet.", "cork.synopsis": "Synopsis…", "cork.synopsisOf": "Synopsis of {t}",
  "se.find": "Search the whole book…", "se.replaceWith": "Replace with…", "se.replaceAll": "Replace all", "se.hits": "{n} matches in {s} chapters or scenes",
  "bm.title": "{k} details: {t}", "bm.author": "Author", "bm.year": "Year", "bm.blurb": "Synopsis", "bm.noCover": "No cover.", "bm.coverOf": "Cover of {t}", "bm.change": "Change cover…", "bm.pick": "Choose cover…", "bm.remove": "Remove",
  "bm.hint": "The cover (image) is used in Word, EPUB and PDF; Markdown, LaTeX and Fountain include author, year and synopsis.",
  "wl.open": "📂 Open existing…", "wl.folder": "🗂 Open folder…", "wl.back": "← Back to the project", "wl.settings": "⚙ Settings", "wl.new": "New", "wl.recent": "Recent", "wl.noRecent": "You haven't opened any project yet.",
  "wl.templates": "Template", "wl.name": "Name", "wl.namePh": "My novel", "wl.willBe": "It will be created in", "wl.noFolder": "(no folder)", "wl.pickFolder": "Choose folder…",
  "wl.inFolder": "Create the .shks directly in this folder (no subfolder)", "wl.always": "Always use this folder (default)", "wl.create": "Create project",
  "wl.noPicker": "This browser can't pick folders: only the .shks file will be saved{how}. With Edge or Chrome the project folder is created.", "wl.noPicker.where": " wherever you choose", "wl.noPicker.dl": " as a download",
  "wl.errFolder": "Choose the folder where the project will be created.", "wl.errPerm": "No permission to write in that folder.", "wl.errCreate": "Could not create it: {e}",
  "wl.errPermOpen": "No permission to open “{n}”.", "wl.errOpen": "Could not open “{n}”: was it moved or deleted?", "wl.multi": "“{n}” has {c} projects: open it with “Open existing…”.",
  "wl.noShks": "“{n}” has no .shks: type a name and press “Create project” to create it here.", "wl.errFolderOpen": "Could not open the folder: {e}", "wl.errFile": "Invalid file.",
  "wl.removeRecent": "Remove from recent: {n}", "wl.removeRecent.title": "Remove from the list", "pl.blank": "Blank", "pl.blank.i": "Nothing created: you build the structure from scratch.", "pl.book": "Book", "pl.book.i": "A single story: chapters, grouped into parts if you like.", "pl.script": "Screenplay", "pl.script.i": "Film or TV: scenes in industry screenplay format.",
  "pl.short": "Short story", "pl.short.i": "A brief tale, in one or a few sections.", "pl.poetry": "Poetry collection", "pl.poetry.i": "Poems: Enter = new line, Enter twice = new stanza.",
  "pl.essay": "Essay / non-fiction", "pl.essay.i": "Chapters with headings and quotes; memoir, popular science, thesis.", "pl.article": "Articles / blog", "pl.article.i": "Standalone pieces grouped into series.",
  "pl.diary": "Diary", "pl.diary.i": "Each entry is titled with the day's date.", "pl.letters": "Epistolary novel", "pl.letters.i": "A story told in letters.",
  "pl.theatre": "Stage play", "pl.theatre.i": "Acts and scenes with characters, dialogue and stage directions.", "pl.comic": "Comic / graphic novel", "pl.comic.i": "Pages and panels: description, dialogue, caption, sound effects.",
  "pl.audio": "Radio / podcast", "pl.audio.i": "Episodes with voices, sounds and music.", "bm.formato": "Type of work", "wl.lang": "Book language",
  "pl.saga": "Saga / trilogy", "pl.saga.i": "Several books sharing cards.", "pl.universe": "Universe", "pl.universe.i": "Sagas and standalone books from the same world.", "pl.tpl.i": "Book with {n} structure parts.",
  "pg.search": "Search plugins…", "pg.file": "From file…", "pg.tool": "Tools", "pg.struct": "Structures", "pg.theme": "Themes", "pg.active": "Active theme", "pg.default": "Default",
  "pg.installed": "Installed", "pg.none": "None.", "pg.remove": "Remove", "pg.available": "Available", "pg.loading": "· searching GitHub…", "pg.gh": "· GitHub: {n} plugins", "pg.noGh": "· no GitHub ({e}); showing the bundled ones",
  "pg.refresh": "Refresh", "pg.noHits": "No results.", "pg.allIn": "All installed.", "pg.install": "Install", "pg.needNew": "⚠ The tool “{t}” needs a newer version of Shakes.", "pg.added": "Plugin “{n}” installed",
  "pg.trust": "“{n}” runs code inside Shakes, with access to your project. Install it only if you trust its author. Continue?", "pg.errCode": "⚠ Couldn't download the code of “{n}”: {e}", "pg.errLoad": "⚠ “{n}” has invalid code or is incompatible with this version of Shakes.",
  "pg.invalid": "⚠ Invalid plugin: {e}", "pg.badJson": "⚠ The file is not valid JSON.",
  "set.title": "Settings", "set.general": "General", "set.lang": "Language", "set.theme": "Theme", "set.theme.auto": "Follow the system", "set.theme.light": "Light", "set.theme.dark": "Dark",
  "set.projects": "Projects", "set.dir": "Default folder for new projects", "set.dir.none": "None (asked when creating)", "set.dir.pick": "Choose folder…", "set.dir.clear": "Clear", "set.dir.unsupported": "This browser can't pick folders.",
  "set.saving": "Backups", "set.copy": "Automatic copy every", "set.copy.off": "Off", "set.copy.min": "{n} min", "set.copy.hint": "An automatic version (max. 20) is saved if there were changes.",
  "set.writing": "Writing", "set.spell": "Check spelling in each book's language", "set.spell.hint": "The language is chosen when creating the project or in the status bar. Spanish and English are bundled; others are downloaded once.",
  "set.font": "Text size", "set.width": "Column width", "set.width.n": "Narrow", "set.width.m": "Medium", "set.width.w": "Wide",
  "set.updates": "Updates", "set.checkStart": "Check for updates when Shakes starts", "set.checkNow": "Check now", "set.version": "Installed version: {v}", "set.upToDate": "You have the latest version.", "set.checking": "Checking…", "set.checkFail": "Could not check: {e}",
  "set.changelog": "What's new",
  "up.available": "Shakes {v} is available (you have {cur}).", "up.update": "Update", "up.notes": "What's new", "up.hide": "Hide", "up.later": "Later", "up.noAsset": "Open the release page",
  "up.hint": "The installer is downloaded; close everything and run it to update.",
};

// Nombres de herramientas (tool.<id>) y acciones del menú (a.<texto en español>) en inglés. Lo que falte se muestra en español.
const toolEn: Record<string, string> = {
  "tool.arbol-genealogico": "Family tree", "tool.arcos-personaje": "Character arcs", "tool.calendario": "Calendar", "tool.dialogo-auto": "Dialogue and quotes",
  "tool.fichas-auto": "Automatic cards", "tool.idiomas": "Language creator", "tool.magia": "Magic systems", "tool.generador-nombres": "Name generator", 
  "tool.inconsistencias": "Inconsistencies", "tool.linter-estilo": "Style linter", "tool.manuscrito-editorial": "Publisher manuscript", "tool.mapa-lugares": "Places map",
  "tool.maquina-escribir": "Typewriter", "tool.notas-laterales": "Side notes", "tool.notas-margen": "Margin notes", "tool.obsidian-sync": "Sync with Obsidian",
  "tool.borrador": "Story draft", "tool.repeticiones": "Repetitions and crutch words", "tool.resumen-escenas": "Scene summaries", "tool.sesion-pomodoro": "Session and pomodoro", "tool.tramas": "Plots", "tool.guion": "Script", "tool.taller-creativo": "Creative workshop",
  "a.Personaje para esta historia": "Character for this story", "a.Estoy atascado…": "I'm stuck…",
  "a.Guion (Fountain)…": "Script (Fountain)…", "a.Guion (PDF)…": "Script (PDF)…",
  "a.Generar nombres…": "Generate names…",
  "a.Manuscrito estándar (PDF)…": "Standard manuscript (PDF)…", "a.Fichas a Obsidian (carpeta)…": "Cards to Obsidian (folder)…", "a.Rellenar sinopsis vacías del corcho": "Fill empty corkboard synopses",
};
const dict: Record<Lang, Record<string, string>> = { es, en: { ...en, ...toolEn } };
export const detectLang = (): Lang => (typeof navigator !== "undefined" && /^en/i.test(navigator.language) ? "en" : "es");

let lang: Lang = "es"; // por defecto español (los tests); settings.ts aplica el idioma guardado o detectado
const subs = new Set<() => void>();
export const getLang = () => lang;
export function setLang(l: Lang) { if (l !== lang) { lang = l; subs.forEach((f) => f()); } }
export const subscribeLang = (f: () => void) => { subs.add(f); return () => void subs.delete(f); };

const fill = (s: string, v?: Record<string, string | number>) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s);
export const t = (key: Key, vars?: Record<string, string | number>): string => fill(dict[lang][key] ?? es[key], vars);
// Traducción opcional (nombres de plugins, tipos de ficha guardados en español): si no hay clave, devuelve el texto original.
export const tr = (key: string, fallback: string): string => dict[lang][key] ?? fallback;
export const KEYS = Object.keys(es) as Key[];
export const EN = en;
