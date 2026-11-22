// Textos de la interfaz en español e inglés. `es` es la fuente; `en` debe tener las mismas claves (lo comprueba tsc y i18n.test.ts).
// Uso: t("clave", { n: 3 }) con marcadores {n}. Los plugins de herramienta pueden traducir su nombre con tr("tool.<id>", nombre).
export type Lang = "es" | "en";

const es = {
  // pestañas
  "tab.book": "Manuscrito", "tab.cork": "Corcho", "tab.cards": "Fichas", "tab.timeline": "Línea", "tab.map": "Mapa", "tab.style": "Estadísticas",
  "tab.search": "Buscar", "tab.versions": "Versiones", "tab.plugins": "Plugins", "tab.settings": "Ajustes",
  // cinta
  "g.file": "Archivo", "g.insert": "Insertar", "g.scene": "Escena", "g.project": "Proyecto", "g.plugins": "Plugins", "g.view": "Vista",
  "file.new": "Nuevo", "file.close": "Cerrar proyecto", "file.close.title": "Guardar y volver a la pantalla de inicio", "file.open": "Abrir", "file.saveas": "Guardar como…", "file.export": "Exportar ▾",
  "export.scope": "Se exporta: {what}", "export.all": "todo", "export.md": "Markdown (.md)", "export.docx": "Word (.docx)", "export.epub": "EPUB (.epub)", "export.pdf": "PDF (imprimir)",
  "ins.structure": "Estructura…", "ins.sceneTpl": "Plantilla de escena…", "ins.card": "+ Ficha",
  "scene.date": "Fecha de la escena", "scene.goal": "Meta de palabras de la escena", "scene.goal.ph": "Meta",
  "proj.scope.title": "Qué usan Corcho, Línea, Estilo y Exportar", "proj.scope": "Ámbito: {v}", "proj.scope.book": "libro actual", "proj.scope.all": "todo",
  "proj.toSaga": "Convertir en saga", "proj.toUniverse": "Convertir en universo", "proj.goalAsk": "Meta de palabras del libro (0 = sin meta)", "proj.goal": "Meta: {n} palabras", "proj.setGoal": "Fijar meta",
  "tools.menu": "Herramientas ▾", "view.focus": "Concentración", "view.exit": "Salir", "view.theme": "Tema: {v}", "view.dark": "oscuro", "view.light": "claro",
  "settings.open": "Ajustes (Ctrl+,)", "file.menu": "Archivo ▾", "file.save": "Guardar", "file.exportH": "Exportar", "tabs.more": "Más ▾", "scene.date.label": "Fecha", "scene.goal.label": "Meta", "proj.goal.label": "Meta del libro", "prog.goal.label": "Meta diaria", "w.saveNeeded": "Guardado en el navegador; usa Guardar como… para crear el archivo.", "st.noStatus": "—",
  // editor
  "fmt.bold": "Negrita", "fmt.italic": "Cursiva", "fmt.h1": "Título", "fmt.h2": "Subtítulo", "fmt.list": "Lista", "fmt.quote": "Cita", "fmt.undo": "Deshacer", "fmt.redo": "Rehacer",
  "scene.in": "En esta escena:", "empty.scene": "Selecciona o crea una escena para escribir.\nDoble clic o F2 renombra. Arrastra, o usa Alt+↑↓, para reordenar. Ctrl+F busca en todo el libro. Esc sale del modo concentración.",
  // estado y avisos
  "st.saved": "Guardado {t}", "st.downloaded": "Descargado {t}", "st.open": "abierto", "st.browserOnly": "Solo en este navegador", "st.reconnect": "Reconectar «{name}»",
  "st.words.scene": "{n} palabras en la escena", "st.today": "Hoy +{n}", "st.words": "{n} palabras", "st.pct": " · {n}% de la meta", "st.replaced": "{n} reemplazos",
  "w.idb": "⚠ No se pudo guardar en el navegador (¿almacenamiento lleno?). Usa Guardar como… para no perder datos.", "w.file": "⚠ No se pudo escribir el archivo. Reconéctalo con Abrir o Guardar como…",
  "w.invalid": "⚠ Archivo no válido.", "w.plugins": "⚠ No se pudieron guardar los plugins.",
  // diálogos
  "d.cancel": "Cancelar", "d.ok": "Aceptar", "d.closeFail": "No se pudo guardar el archivo. ¿Cerrar de todos modos?",
  "d.replace": "¿Reemplazar {n} coincidencias en {s} escenas por «{r}»? Antes se guarda una copia.", "d.sagaName": "Nombre de la saga", "d.universeName": "Nombre del universo",
  "d.sagaDef": "Saga de {t}", "d.universeDef": "Universo de {t}", "snap.beforeReplace": "Antes de reemplazar", "snap.beforeSaga": "Antes de crear la saga", "snap.beforeUniverse": "Antes de crear el universo",
  "snap.beforeDelete": "Antes de eliminar", "snap.beforeDeleteCard": "Antes de eliminar ficha", "snap.auto": "Copia automática",
  "d.addStructure": "Añadir estructura al libro:", "d.insertTpl": "Insertar plantilla en la escena:", "d.dailyGoal": "Meta diaria de palabras (0 = sin meta)", "d.deleteCard": "¿Eliminar la ficha \"{name}\"?",
  "d.newTitle": "Nuevo título", "d.emptyProject": "¿Vaciar el proyecto? Se elimina \"{t}\" y todo su contenido; queda una raíz en blanco. Se guarda una copia antes.", "d.deleteNode": "¿Eliminar \"{t}\" y todo su contenido? Se guarda una copia antes.",
  // árbol
  "tree.label": "Manuscrito", "tree.fold": "Plegar", "tree.unfold": "Desplegar", "tree.add": "Añadir {k}", "tree.delete": "Eliminar",
  "kind.blank": "proyecto", "kind.universe": "universo", "kind.saga": "saga", "kind.book": "libro", "kind.part": "parte", "kind.chapter": "capítulo", "kind.scene": "escena",
  "kindT.blank": "Proyecto", "kindT.universe": "Universo", "kindT.saga": "Saga", "kindT.book": "Libro", "kindT.part": "Parte", "kindT.chapter": "Capítulo", "kindT.scene": "Escena",
  // fichas
  "card.new": "Nueva ficha", "card.empty": "Crea o selecciona una ficha.", "card.name": "Nombre", "card.type": "Tipo", "card.alias": "Apodos o nombres cortos", "card.alias.ph": "Separados por comas (Vero, Véronique)", "card.age": "Edad", "card.job": "Ocupación", "card.origin": "Origen (de dónde viene)", "card.virtues": "Virtudes", "card.flaw": "Defecto central", "card.backstory": "Trasfondo", "card.lie": "Mentira que se cree", "card.arc": "Arco de cambio", "card.trait": "Rasgo inspirador", "card.notes.extra": "Notas",
  "card.notes": "Notas…", "card.links": "Relaciones", "card.deleted": "(borrada)", "card.unlink": "Quitar relación", "card.relateWith": "Relacionar con", "card.relate": "+ Relacionar con…",
  "card.relType": "Tipo de relación (ej. hermano de, vive en)", "card.appears": "Aparece en", "card.noScenes": "Ninguna escena menciona «{name}».", "card.back": "← Volver al mapa", "card.delete": "Eliminar ficha",
  "type.character": "Personaje", "type.place": "Lugar", "type.object": "Objeto", "type.faction": "Facción",
  "status.none": "Sin estado", "status.draft": "Borrador", "status.revised": "Revisada", "status.final": "Final", "scene.status": "Estado de la escena",
  // vistas
  "tl.narr": "Narrativa", "tl.chrono": "Cronológica", "tl.hint": "Cambia la fecha de cada escena aquí mismo. Las escenas sin fecha van al final.", "tl.dateOf": "Fecha de {t}", "words.n": "{n} palabras",
  "map.empty": "Crea fichas y relaciónalas para ver el mapa.", "map.hint": "Arrastra los nodos para ordenar el mapa. Clic para abrir la ficha.",
  "lv.1": "muy difícil", "lv.2": "algo difícil", "lv.3": "normal", "lv.4": "bastante fácil", "lv.5": "muy fácil",
  "stat.words": "palabras", "stat.sentences": "frases", "stat.avg": "palabras por frase", "stat.longest": "frase más larga", "stat.adverbs": "adverbios en -mente", "stat.dialogue": "diálogo", "stat.read": "legibilidad · {l}",
  "stat.top": "Más repetidas (sin nombres de fichas)", "stat.near": "Repeticiones cercanas (misma palabra a menos de 25 palabras)",
  "prog.title": "Progreso diario", "prog.goal": "Meta diaria: {n}", "prog.setGoal": "Fijar meta diaria", "prog.today": "Hoy", "prog.book": "Libro completo",
  "ver.save": "Guardar versión", "ver.name": "Nombre de la versión", "ver.noName": "Sin nombre", "ver.auto": " · automática", "ver.hide": "Ocultar", "ver.compare": "Comparar", "ver.restore": "Restaurar",
  "ver.restoreAsk": "¿Restaurar esta versión? Antes se guarda una copia del estado actual.", "ver.delete": "Eliminar versión", "ver.deleteAsk": "¿Eliminar esta versión?",
  "ver.vs": "Frente al texto actual: {d} palabras", "ver.changed": "Cambiadas", "ver.added": "Añadidas después", "ver.removed": "Eliminadas después", "ver.same": "Sin diferencias en las escenas.", "ver.none": "Sin versiones guardadas.",
  "cork.empty": "Aún no hay escenas.", "cork.synopsis": "Sinopsis…", "cork.synopsisOf": "Sinopsis de {t}",
  "se.find": "Buscar en todo el libro…", "se.replaceWith": "Reemplazar por…", "se.replaceAll": "Reemplazar todo", "se.hits": "{n} coincidencias en {s} escenas",
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
  "wl.removeRecent": "Quitar de recientes: {n}", "wl.removeRecent.title": "Quitar de la lista", "pl.blank": "En blanco", "pl.blank.i": "Nada creado: tú montas la estructura desde cero.", "pl.book": "Libro", "pl.book.i": "Una sola historia: parte, capítulo y escena.",
  "pl.saga": "Saga / trilogía", "pl.saga.i": "Varios libros con fichas compartidas.", "pl.universe": "Universo", "pl.universe.i": "Sagas y libros sueltos del mismo mundo.", "pl.tpl.i": "Libro con {n} partes de estructura.",
  // plugins
  "pg.search": "Buscar plugins…", "pg.file": "Desde archivo…", "pg.tool": "Herramientas", "pg.struct": "Estructuras", "pg.theme": "Temas", "pg.active": "Tema activo", "pg.default": "Predeterminado",
  "pg.installed": "Instalados", "pg.none": "Ninguno.", "pg.remove": "Quitar", "pg.available": "Disponibles", "pg.loading": "· buscando en GitHub…", "pg.gh": "· GitHub: {n} plugins", "pg.noGh": "· sin GitHub ({e}); se muestran los incluidos",
  "pg.refresh": "Actualizar", "pg.noHits": "Sin resultados.", "pg.allIn": "Todos instalados.", "pg.install": "Instalar", "pg.needNew": "⚠ La herramienta «{t}» necesita una versión más nueva de Shakes.", "pg.added": "Plugin «{n}» instalado",
  "pg.invalid": "⚠ Plugin no válido: {e}", "pg.badJson": "⚠ El archivo no es JSON válido.",
  // ajustes
  "set.title": "Ajustes", "set.general": "General", "set.lang": "Idioma", "set.theme": "Tema", "set.theme.auto": "Según el sistema", "set.theme.light": "Claro", "set.theme.dark": "Oscuro",
  "set.projects": "Proyectos", "set.dir": "Carpeta predeterminada para proyectos nuevos", "set.dir.none": "Ninguna (se pregunta al crear)", "set.dir.pick": "Elegir carpeta…", "set.dir.clear": "Quitar", "set.dir.unsupported": "Este navegador no puede elegir carpetas.",
  "set.saving": "Copias de seguridad", "set.copy": "Copia automática cada", "set.copy.off": "Desactivada", "set.copy.min": "{n} min", "set.copy.hint": "Se guarda una versión automática (máx. 20) si hubo cambios.",
  "set.updates": "Actualizaciones", "set.checkStart": "Buscar actualizaciones al abrir Shakes", "set.checkNow": "Buscar ahora", "set.version": "Versión instalada: {v}", "set.upToDate": "Estás en la última versión.", "set.checking": "Buscando…", "set.checkFail": "No se pudo comprobar: {e}",
  "set.changelog": "Novedades",
  // actualizador
  "up.available": "Shakes {v} está disponible (tienes {cur}).", "up.update": "Actualizar", "up.notes": "Novedades", "up.hide": "Ocultar", "up.later": "Más tarde", "up.noAsset": "Abrir la página de la versión",
  "up.hint": "Se descarga el instalador; ciérralo todo y ejecútalo para actualizar.",
} as const;

export type Key = keyof typeof es;

const en: Record<Key, string> = {
  "tab.book": "Manuscript", "tab.cork": "Corkboard", "tab.cards": "Cards", "tab.timeline": "Timeline", "tab.map": "Map", "tab.style": "Statistics",
  "tab.search": "Search", "tab.versions": "Versions", "tab.plugins": "Plugins", "tab.settings": "Settings",
  "g.file": "File", "g.insert": "Insert", "g.scene": "Scene", "g.project": "Project", "g.plugins": "Plugins", "g.view": "View",
  "file.new": "New", "file.close": "Close project", "file.close.title": "Save and go back to the start screen", "file.open": "Open", "file.saveas": "Save as…", "file.export": "Export ▾",
  "export.scope": "Exporting: {what}", "export.all": "everything", "export.md": "Markdown (.md)", "export.docx": "Word (.docx)", "export.epub": "EPUB (.epub)", "export.pdf": "PDF (print)",
  "ins.structure": "Structure…", "ins.sceneTpl": "Scene template…", "ins.card": "+ Card",
  "scene.date": "Scene date", "scene.goal": "Scene word goal", "scene.goal.ph": "Goal",
  "proj.scope.title": "What Corkboard, Timeline, Style and Export use", "proj.scope": "Scope: {v}", "proj.scope.book": "current book", "proj.scope.all": "everything",
  "proj.toSaga": "Turn into saga", "proj.toUniverse": "Turn into universe", "proj.goalAsk": "Book word goal (0 = no goal)", "proj.goal": "Goal: {n} words", "proj.setGoal": "Set goal",
  "tools.menu": "Tools ▾", "view.focus": "Focus mode", "view.exit": "Exit", "view.theme": "Theme: {v}", "view.dark": "dark", "view.light": "light",
  "settings.open": "Settings (Ctrl+,)", "file.menu": "File ▾", "file.save": "Save", "file.exportH": "Export", "tabs.more": "More ▾", "scene.date.label": "Date", "scene.goal.label": "Goal", "proj.goal.label": "Book goal", "prog.goal.label": "Daily goal", "w.saveNeeded": "Saved in the browser; use Save as… to create the file.", "st.noStatus": "—",
  "fmt.bold": "Bold", "fmt.italic": "Italic", "fmt.h1": "Heading", "fmt.h2": "Subheading", "fmt.list": "List", "fmt.quote": "Quote", "fmt.undo": "Undo", "fmt.redo": "Redo",
  "scene.in": "In this scene:", "empty.scene": "Select or create a scene to write.\nDouble-click or F2 renames. Drag, or use Alt+↑↓, to reorder. Ctrl+F searches the whole book. Esc leaves focus mode.",
  "st.saved": "Saved {t}", "st.downloaded": "Downloaded {t}", "st.open": "open", "st.browserOnly": "Only in this browser", "st.reconnect": "Reconnect “{name}”",
  "st.words.scene": "{n} words in the scene", "st.today": "Today +{n}", "st.words": "{n} words", "st.pct": " · {n}% of the goal", "st.replaced": "{n} replacements",
  "w.idb": "⚠ Could not save in the browser (storage full?). Use Save as… so you don't lose data.", "w.file": "⚠ Could not write the file. Reconnect it with Open or Save as…",
  "w.invalid": "⚠ Invalid file.", "w.plugins": "⚠ Could not save the plugins.",
  "d.cancel": "Cancel", "d.ok": "OK", "d.closeFail": "The file could not be saved. Close anyway?",
  "d.replace": "Replace {n} matches in {s} scenes with “{r}”? A copy is saved first.", "d.sagaName": "Saga name", "d.universeName": "Universe name",
  "d.sagaDef": "Saga of {t}", "d.universeDef": "Universe of {t}", "snap.beforeReplace": "Before replacing", "snap.beforeSaga": "Before creating the saga", "snap.beforeUniverse": "Before creating the universe",
  "snap.beforeDelete": "Before deleting", "snap.beforeDeleteCard": "Before deleting card", "snap.auto": "Automatic copy",
  "d.addStructure": "Add a structure to the book:", "d.insertTpl": "Insert a template in the scene:", "d.dailyGoal": "Daily word goal (0 = no goal)", "d.deleteCard": "Delete the card \"{name}\"?",
  "d.newTitle": "New title", "d.emptyProject": "Empty the project? \"{t}\" and all its content are deleted; a blank root remains. A copy is saved first.", "d.deleteNode": "Delete \"{t}\" and all its content? A copy is saved first.",
  "tree.label": "Manuscript", "tree.fold": "Collapse", "tree.unfold": "Expand", "tree.add": "Add {k}", "tree.delete": "Delete",
  "kind.blank": "project", "kind.universe": "universe", "kind.saga": "saga", "kind.book": "book", "kind.part": "part", "kind.chapter": "chapter", "kind.scene": "scene",
  "kindT.blank": "Project", "kindT.universe": "Universe", "kindT.saga": "Saga", "kindT.book": "Book", "kindT.part": "Part", "kindT.chapter": "Chapter", "kindT.scene": "Scene",
  "card.new": "New card", "card.empty": "Create or select a card.", "card.name": "Name", "card.type": "Type", "card.alias": "Nicknames or short names", "card.alias.ph": "Comma-separated (Vero, Véronique)", "card.age": "Age", "card.job": "Occupation", "card.origin": "Origin (where they come from)", "card.virtues": "Virtues", "card.flaw": "Central flaw", "card.backstory": "Backstory", "card.lie": "The lie they believe", "card.arc": "Arc of change", "card.trait": "Inspiring trait", "card.notes.extra": "Notes",
  "card.notes": "Notes…", "card.links": "Relationships", "card.deleted": "(deleted)", "card.unlink": "Remove relationship", "card.relateWith": "Relate to", "card.relate": "+ Relate to…",
  "card.relType": "Relationship type (e.g. brother of, lives in)", "card.appears": "Appears in", "card.noScenes": "No scene mentions “{name}”.", "card.back": "← Back to the map", "card.delete": "Delete card",
  "type.character": "Character", "type.place": "Place", "type.object": "Object", "type.faction": "Faction",
  "status.none": "No status", "status.draft": "Draft", "status.revised": "Revised", "status.final": "Final", "scene.status": "Scene status",
  "tl.narr": "Narrative", "tl.chrono": "Chronological", "tl.hint": "Change each scene's date right here. Scenes without a date go last.", "tl.dateOf": "Date of {t}", "words.n": "{n} words",
  "map.empty": "Create cards and link them to see the map.", "map.hint": "Drag the nodes to arrange the map. Click to open the card.",
  "lv.1": "very hard", "lv.2": "somewhat hard", "lv.3": "normal", "lv.4": "fairly easy", "lv.5": "very easy",
  "stat.words": "words", "stat.sentences": "sentences", "stat.avg": "words per sentence", "stat.longest": "longest sentence", "stat.adverbs": "-mente adverbs", "stat.dialogue": "dialogue", "stat.read": "readability · {l}",
  "stat.top": "Most repeated (excluding card names)", "stat.near": "Close repetitions (same word within 25 words)",
  "prog.title": "Daily progress", "prog.goal": "Daily goal: {n}", "prog.setGoal": "Set daily goal", "prog.today": "Today", "prog.book": "Whole book",
  "ver.save": "Save version", "ver.name": "Version name", "ver.noName": "Unnamed", "ver.auto": " · automatic", "ver.hide": "Hide", "ver.compare": "Compare", "ver.restore": "Restore",
  "ver.restoreAsk": "Restore this version? A copy of the current state is saved first.", "ver.delete": "Delete version", "ver.deleteAsk": "Delete this version?",
  "ver.vs": "Compared with the current text: {d} words", "ver.changed": "Changed", "ver.added": "Added since", "ver.removed": "Removed since", "ver.same": "No differences in the scenes.", "ver.none": "No saved versions.",
  "cork.empty": "There are no scenes yet.", "cork.synopsis": "Synopsis…", "cork.synopsisOf": "Synopsis of {t}",
  "se.find": "Search the whole book…", "se.replaceWith": "Replace with…", "se.replaceAll": "Replace all", "se.hits": "{n} matches in {s} scenes",
  "bm.title": "{k} details: {t}", "bm.author": "Author", "bm.year": "Year", "bm.blurb": "Synopsis", "bm.noCover": "No cover.", "bm.coverOf": "Cover of {t}", "bm.change": "Change cover…", "bm.pick": "Choose cover…", "bm.remove": "Remove",
  "bm.hint": "The cover (image) is used in Word, EPUB and PDF; Markdown, LaTeX and Fountain include author, year and synopsis.",
  "wl.open": "📂 Open existing…", "wl.folder": "🗂 Open folder…", "wl.back": "← Back to the project", "wl.settings": "⚙ Settings", "wl.new": "New", "wl.recent": "Recent", "wl.noRecent": "You haven't opened any project yet.",
  "wl.templates": "Template", "wl.name": "Name", "wl.namePh": "My novel", "wl.willBe": "It will be created in", "wl.noFolder": "(no folder)", "wl.pickFolder": "Choose folder…",
  "wl.inFolder": "Create the .shks directly in this folder (no subfolder)", "wl.always": "Always use this folder (default)", "wl.create": "Create project",
  "wl.noPicker": "This browser can't pick folders: only the .shks file will be saved{how}. With Edge or Chrome the project folder is created.", "wl.noPicker.where": " wherever you choose", "wl.noPicker.dl": " as a download",
  "wl.errFolder": "Choose the folder where the project will be created.", "wl.errPerm": "No permission to write in that folder.", "wl.errCreate": "Could not create it: {e}",
  "wl.errPermOpen": "No permission to open “{n}”.", "wl.errOpen": "Could not open “{n}”: was it moved or deleted?", "wl.multi": "“{n}” has {c} projects: open it with “Open existing…”.",
  "wl.noShks": "“{n}” has no .shks: type a name and press “Create project” to create it here.", "wl.errFolderOpen": "Could not open the folder: {e}", "wl.errFile": "Invalid file.",
  "wl.removeRecent": "Remove from recent: {n}", "wl.removeRecent.title": "Remove from the list", "pl.blank": "Blank", "pl.blank.i": "Nothing created: you build the structure from scratch.", "pl.book": "Book", "pl.book.i": "A single story: part, chapter and scene.",
  "pl.saga": "Saga / trilogy", "pl.saga.i": "Several books sharing cards.", "pl.universe": "Universe", "pl.universe.i": "Sagas and standalone books from the same world.", "pl.tpl.i": "Book with {n} structure parts.",
  "pg.search": "Search plugins…", "pg.file": "From file…", "pg.tool": "Tools", "pg.struct": "Structures", "pg.theme": "Themes", "pg.active": "Active theme", "pg.default": "Default",
  "pg.installed": "Installed", "pg.none": "None.", "pg.remove": "Remove", "pg.available": "Available", "pg.loading": "· searching GitHub…", "pg.gh": "· GitHub: {n} plugins", "pg.noGh": "· no GitHub ({e}); showing the bundled ones",
  "pg.refresh": "Refresh", "pg.noHits": "No results.", "pg.allIn": "All installed.", "pg.install": "Install", "pg.needNew": "⚠ The tool “{t}” needs a newer version of Shakes.", "pg.added": "Plugin “{n}” installed",
  "pg.invalid": "⚠ Invalid plugin: {e}", "pg.badJson": "⚠ The file is not valid JSON.",
  "set.title": "Settings", "set.general": "General", "set.lang": "Language", "set.theme": "Theme", "set.theme.auto": "Follow the system", "set.theme.light": "Light", "set.theme.dark": "Dark",
  "set.projects": "Projects", "set.dir": "Default folder for new projects", "set.dir.none": "None (asked when creating)", "set.dir.pick": "Choose folder…", "set.dir.clear": "Clear", "set.dir.unsupported": "This browser can't pick folders.",
  "set.saving": "Backups", "set.copy": "Automatic copy every", "set.copy.off": "Off", "set.copy.min": "{n} min", "set.copy.hint": "An automatic version (max. 20) is saved if there were changes.",
  "set.updates": "Updates", "set.checkStart": "Check for updates when Shakes starts", "set.checkNow": "Check now", "set.version": "Installed version: {v}", "set.upToDate": "You have the latest version.", "set.checking": "Checking…", "set.checkFail": "Could not check: {e}",
  "set.changelog": "What's new",
  "up.available": "Shakes {v} is available (you have {cur}).", "up.update": "Update", "up.notes": "What's new", "up.hide": "Hide", "up.later": "Later", "up.noAsset": "Open the release page",
  "up.hint": "The installer is downloaded; close everything and run it to update.",
};

// Nombres de herramientas (tool.<id>) y acciones del menú (a.<texto en español>) en inglés. Lo que falte se muestra en español.
const toolEn: Record<string, string> = {
  "tool.arbol-genealogico": "Family tree", "tool.arcos-personaje": "Character arcs", "tool.calendario": "Calendar", "tool.dialogo-auto": "Dialogue and quotes",
  "tool.exportar-extra": "Export: Fountain, LaTeX, HTML", "tool.fichas-auto": "Automatic cards", "tool.generador-nombres": "Name generator", "tool.importar": "Import",
  "tool.inconsistencias": "Inconsistencies", "tool.linter-estilo": "Style linter", "tool.manuscrito-editorial": "Publisher manuscript", "tool.mapa-lugares": "Places map",
  "tool.maquina-escribir": "Typewriter", "tool.notas-laterales": "Side notes", "tool.notas-margen": "Margin notes", "tool.obsidian-sync": "Sync with Obsidian",
  "tool.borrador": "Story draft", "tool.repeticiones": "Repetitions and crutch words", "tool.resumen-escenas": "Scene summaries", "tool.sesion-pomodoro": "Session and pomodoro", "tool.tramas": "Plots",
  "a.Exportar Fountain (.fountain)": "Export Fountain (.fountain)", "a.Exportar LaTeX (.tex)": "Export LaTeX (.tex)", "a.Exportar HTML (.html)": "Export HTML (.html)",
  "a.Generar nombres…": "Generate names…", "a.Importar Markdown / texto…": "Import Markdown / text…", "a.Importar Word (.docx)…": "Import Word (.docx)…",
  "a.Manuscrito estándar (PDF)…": "Standard manuscript (PDF)…", "a.Volcar fichas a una carpeta (Obsidian)…": "Dump cards to a folder (Obsidian)…", "a.Rellenar sinopsis vacías del corcho": "Fill empty corkboard synopses",
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
