import { useEffect, useRef, useState } from "react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CARD_TYPES, Card, Formato, Node, Project, templates, addChild, books, conTexto, formatoDe, esContenedor, esObra, applyTemplate, bookOf, countWords, find, firstScene, logWords, mentions, move, remove, replaceAll, restore, search, shift, snapshot, today, totalWords, update, wrapIn, writtenOn } from "./tree";
import { Analysis, CardForm, Corkboard, RelationMap, SearchPanel, Timeline, Versions } from "./Views";
import Tree from "./TreeView";
import { BookMeta } from "./BookMeta";
import { DialogHost, ask, choose, confirmAsk } from "./dialog";
import { idbGet, idbSet, recentAdd } from "./store";
import { PluginState, activeTheme, allSceneTemplates, allStructures, install, themeCss } from "./plugins";
import { PluginsPanel } from "./PluginsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { isDark, saveSettings, useSettings } from "./settings";
import { Ribbon } from "./Ribbon";
import { ToolBar } from "./ToolBar";
import { canSavePick, pickProject, saveProjectAs, writeProject } from "./fileio";
import { ExportKind, exportAs } from "./exporting";
import { importDoc } from "./importing";
import { compareVersions, type Update } from "./update";
import { Key, t, tr } from "./i18n";
import { SPELL_LANGS, langName, ortografia } from "./spell";
import { ESSENTIAL, ESSENTIAL_NEW, RETIRED, TOOLS, catalog } from "../plugins/index";
import type { ToolHost, ToolPlugin } from "./pluginApi";
import { loadTool } from "./extTools";
import "./App.css";

type Tab = string; // pestaña fija o id de una herramienta con Panel
const TABS = ["book", "cork", "cards", "timeline", "map", "style", "search", "versions"] as const; // pestañas fijas; su texto es t("tab.<id>")

// Tipo de párrafo de guion (data-sp="heading|action|character|…"). Vive en el núcleo para que el texto lo conserve
// aunque el plugin Guion no esté cargado; el formato y las teclas los pone el plugin.
const SpAttr = Extension.create({
  name: "spAttr",
  addGlobalAttributes: () => [{ types: ["paragraph"], attributes: { sp: { default: null, parseHTML: (el) => el.getAttribute("data-sp"), renderHTML: (a) => (a.sp ? { "data-sp": a.sp } : {}) } } }],
});

// Poesía: Intro = verso nuevo (salto de línea); Intro en un verso vacío = estrofa nueva (párrafo).
const Verso = Extension.create({
  name: "verso",
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parent.type.name !== "paragraph" || !$from.parent.textContent) return false;
        if ($from.nodeBefore?.type.name === "hardBreak") return this.editor.chain().deleteRange({ from: $from.pos - 1, to: $from.pos }).splitBlock().run();
        return this.editor.commands.setHardBreak();
      },
    };
  },
});

// `lang`: idioma de la obra; null = sin corrector. El corrector del navegador se apaga (lo sustituye el nuestro, en el idioma del libro).
// `formato`: tipo de obra (la poesía cambia el Intro; el resto lo usan los plugins y el CSS).
function SceneEditor({ html, onChange, tools, host, lang, formato }: { html: string; onChange: (html: string) => void; tools: ToolPlugin[]; host: ToolHost; lang: string | null; formato?: Formato }) {
  const hostRef = useRef(host);
  hostRef.current = host;
  const editor = useEditor({
    extensions: [StarterKit, SpAttr, ...(formato === "poetry" ? [Verso] : []), ...(lang ? [ortografia(lang, () => hostRef.current.cards, (m) => hostRef.current.notify(m))] : []), ...tools.flatMap((t) => t.extensions?.(() => hostRef.current) ?? [])],
    content: html,
    autofocus: "end",
    editorProps: { attributes: { spellcheck: "false", lang: host.bookLang } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => { if (editor) tools.forEach((t) => t.refresh?.(editor)); }, [editor, host.cards]); // eslint-disable-line react-hooks/exhaustive-deps
  const btn = (label: string, title: string, active: boolean, run: () => void) => (
    <button key={title} title={title} className={active ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); run(); }}>{label}</button>
  );
  const c = () => editor!.chain().focus();
  return (
    <>
      {editor && (
        <div className="format">
          {btn("B", t("fmt.bold"), editor.isActive("bold"), () => c().toggleBold().run())}
          {btn("I", t("fmt.italic"), editor.isActive("italic"), () => c().toggleItalic().run())}
          <span className="sep" />
          {btn("H1", t("fmt.h1"), editor.isActive("heading", { level: 1 }), () => c().toggleHeading({ level: 1 }).run())}
          {btn("H2", t("fmt.h2"), editor.isActive("heading", { level: 2 }), () => c().toggleHeading({ level: 2 }).run())}
          <span className="sep" />
          {btn("•", t("fmt.list"), editor.isActive("bulletList"), () => c().toggleBulletList().run())}
          {btn("❝", t("fmt.quote"), editor.isActive("blockquote"), () => c().toggleBlockquote().run())}
          {btn("⁂", t("fmt.sep"), false, () => c().setHorizontalRule().run())}
          <span className="sep" />
          {btn("↶", t("fmt.undo"), false, () => c().undo().run())}
          {btn("↷", t("fmt.redo"), false, () => c().redo().run())}
        </div>
      )}
      <div className={`editor-row fmt-${formato ?? "novel"}`}>
        <EditorContent editor={editor} className="editor" />
        {editor && tools.map((t) => t.Overlay && <t.Overlay key={t.id} editor={editor} host={host} />)}
      </div>
    </>
  );
}

// `hidden`: la pantalla de inicio está encima (Nuevo…); App sigue montada para no perder el estado ni el autoguardado.
export default function App({ initial, handle: savedHandle, granted, onNew, onClose, update: info, onUpdate, hidden = false }: { initial: Project; handle: any; granted: boolean; onNew: () => void; onClose: () => void; update: Update | null; onUpdate: (u: Update | null) => void; hidden?: boolean }) {
  const [project, setProject] = useState<Project>(initial);
  const { book, cards, goal } = project;
  const setBook = (f: (b: Node) => Node) => setProject((p) => ({ ...p, book: f(p.book) }));
  const setCards = (f: (c: Card[]) => Card[]) => setProject((p) => ({ ...p, cards: f(p.cards) }));
  // Se vuelve a lo último que se abrió (no al primer capítulo): retomar donde se dejó.
  const [selected, setSel] = useState<string>(() => (initial.last && find(book, initial.last) ? initial.last : firstScene(book)?.id ?? book.id));
  const setSelected = (id: string) => { setSel(id); setProject((p) => (p.last === id ? p : { ...p, last: id })); };
  const [ambito, setAmbito] = useState<"libro" | "todo">("libro"); // en una saga/universo: vistas y exportación del libro actual o de todo
  const [cardId, setCardId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("book");
  const [rev, setRev] = useState(0); // fuerza recrear el editor cuando el texto cambia desde fuera (reemplazar, restaurar)
  const settings = useSettings();
  const dark = isDark(settings);
  const [focus, setFocus] = useState(false);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [warn, setWarn] = useState("");
  const flash = (m: string) => { setWarn(m); setTimeout(() => setWarn((w) => (w === m ? "" : w)), 6000); }; // avisos de plugins: se borran solos
  const handle = useRef<any>(granted ? savedHandle : null);
  const [pending, setPending] = useState<any>(savedHandle && !granted ? savedHandle : null); // handle que falta autorizar tras reiniciar
  useEffect(() => { if (handle.current) setFileName(handle.current.name); }, []);

  // Autoguardado (600 ms): IndexedDB siempre; archivo si hay uno autorizado. Los fallos se muestran, no se tragan.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try { await idbSet("project", project); setWarn(""); }
      catch { setWarn(t("w.idb")); }
      if (!handle.current) return;
      try { await writeProject(handle.current, project); setStatus(t("st.saved", { t: new Date().toLocaleTimeString() })); }
      catch { setWarn(t("w.file")); }
    }, 600);
    return () => clearTimeout(timer);
  }, [project]);

  // Copia automática (intervalo en Ajustes) si hubo cambios (el libro es inmutable: basta comparar referencias).
  useEffect(() => {
    if (!settings.copyMinutes) return;
    const id = setInterval(() => setProject((p) => (p.versions[0]?.book === p.book ? p : snapshot(p, t("snap.auto"), true))), settings.copyMinutes * 60_000);
    return () => clearInterval(id);
  }, [settings.copyMinutes]);

  async function reconnect() {
    try {
      if ((await pending.requestPermission({ mode: "readwrite" })) === "granted") {
        handle.current = pending;
        setFileName(pending.name);
        setPending(null);
        setProject((p) => ({ ...p }));
      }
    } catch {}
  }

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  // Plugins: globales de la app (no van en el .shks). Su tema se inyecta como <style> al final del <head>.
  const [plug, setPlug] = useState<PluginState>({ plugins: [], theme: null });
  const plugLoaded = useRef(false);
  useEffect(() => {
    // Primera vez (sin marca `seeded`, aunque haya un estado vacío guardado): se instalan los esenciales que falten; el resto queda en «Disponibles».
    // Instalaciones de antes de las herramientas externas: tenían la herramienta compilada en la app; ahora se les da su código del catálogo.
    // Los plugins que trae la app se actualizan solos si la app trae una versión más nueva; los retirados (su función pasó al núcleo) se quitan.
    const migrate = (s: PluginState): PluginState => ({ ...s, plugins: s.plugins.filter((p) => !RETIRED.includes(p.id)).map((p) => {
      const c = p.tool && !TOOLS.some((x) => x.id === p.tool) ? catalog.find((x) => x.id === p.id) : undefined;
      return c?.code && (!p.code || compareVersions(c.version, p.version) > 0) ? { ...p, version: c.version, main: c.main, code: c.code } : p;
    }) });
    // Esenciales nuevos: se instalan una sola vez en instalaciones antiguas (si luego se quitan, no vuelven).
    const nuevos = (s: PluginState): PluginState => { const ids = ESSENTIAL_NEW.filter((id) => !s.offered?.includes(id)); return ids.length ? { ...s, offered: [...(s.offered ?? []), ...ids], plugins: [...s.plugins, ...catalog.filter((c) => ids.includes(c.id) && !s.plugins.some((p) => p.id === c.id))] } : s; };
    const seed = (s: PluginState): PluginState => migrate(nuevos(s.seeded ? s : { ...s, seeded: true, plugins: [...s.plugins, ...catalog.filter((c) => ESSENTIAL.includes(c.id) && !s.plugins.some((p) => p.id === c.id))] }));
    idbGet<PluginState>("plugins").then((s) => { plugLoaded.current = true; setPlug(seed(s ?? { plugins: [], theme: null })); })
      .catch(() => setPlug(seed({ plugins: [], theme: null }))); // no se pudo leer: esenciales en memoria, sin sobrescribir lo guardado
  }, []);
  useEffect(() => {
    if (plugLoaded.current) idbSet("plugins", plug).catch(() => setWarn(t("w.plugins")));
    let el = document.getElementById("shakes-plugin-theme");
    if (!el) { el = document.createElement("style"); el.id = "shakes-plugin-theme"; document.head.appendChild(el); }
    el.textContent = themeCss(activeTheme(plug));
  }, [plug]);
  // Un proyecto con guion necesita el plugin Guion (formato y teclas): viene con la app, se instala solo.
  const hayGuion = books(book).some((b) => b.kind === "script");
  useEffect(() => {
    const c = catalog.find((x) => x.id === "guion");
    if (hayGuion && c && plugLoaded.current && !plug.plugins.some((p) => p.id === "guion")) setPlug((s) => install(s, c));
  }, [hayGuion, plug]);
  const structures = [...templates(), ...allStructures(plug)];
  const sceneTpls = allSceneTemplates(plug);
  const tools = [ // herramientas instaladas: las incluidas en la app y las externas (código guardado con el plugin)
    ...TOOLS.filter((x) => plug.plugins.some((p) => p.tool === x.id)),
    ...plug.plugins.filter((p) => p.code && !TOOLS.some((x) => x.id === p.tool)).flatMap((p) => loadTool(p) ?? []),
  ];
  const toolName = (x: ToolPlugin) => tr("tool." + x.id, x.name);
  const tabs = [...TABS, "plugins" as const].map((k) => ({ id: k as string, label: t(`tab.${k}`) }));
  const ToolPanel = tools.find((x) => x.id === tab)?.Panel;

  function load(p: Project, name: string) {
    setFileName(name);
    setProject(p);
    setSel(p.last && find(p.book, p.last) ? p.last : firstScene(p.book)?.id ?? p.book.id);
    setCardId(null);
    setRev((r) => r + 1);
  }

  async function openFile() {
    try {
      const r = await pickProject();
      if (!r) return;
      if (handle.current) await writeProject(handle.current, project).catch(() => {}); // lo último escrito (<600 ms) no se pierde al cambiar de archivo
      handle.current = r.handle;
      setPending(null);
      idbSet("handle", r.handle).catch(() => {});
      if (r.handle) recentAdd(r.handle);
      load(r.project, r.name);
    } catch { setWarn(t("w.invalid")); }
  }

  // Guarda ya (sin esperar al autoguardado de 600 ms); sin archivo asociado abre Guardar como…
  async function saveNow() {
    if (!handle.current) return void (await saveAs());
    try { await writeProject(handle.current, project); setStatus(t("st.saved", { t: new Date().toLocaleTimeString() })); recentAdd(handle.current); }
    catch { setWarn(t("w.file")); }
  }

  // Guarda y vuelve a la pantalla de inicio. Sin archivo, cerrar borraría el proyecto (solo vive en el navegador): se ofrece Guardar como.
  async function cerrar() {
    if (!handle.current) {
      const i = await choose(t("d.noFile"), [t("d.noFile.save"), t("d.noFile.close")]);
      if (i === null) return;
      if (i === 0) { await saveAs(); if (!handle.current && canSavePick()) return; } // sin selector, Guardar como descarga el .shks: ya se puede cerrar
    }
    try {
      if (handle.current) { await writeProject(handle.current, project); recentAdd(handle.current); }
    } catch { if (!(await confirmAsk(t("d.closeFail")))) return; }
    onClose();
  }

  async function saveAs() {
    try {
      const r = await saveProjectAs(project, book.title);
      if (!r) return;
      if (!r.handle) return setStatus(t("st.downloaded", { t: new Date().toLocaleTimeString() }));
      handle.current = r.handle;
      setFileName(r.handle.name);
      setPending(null);
      idbSet("handle", r.handle).catch(() => {});
      recentAdd(r.handle);
      setProject({ ...project }); // dispara el autoguardado
    } catch { setWarn(t("w.file")); }
  }

  // Progreso diario: se anotan las palabras totales del día (la 1ª vez como inicio).
  useEffect(() => {
    setProject((p) => { const l = logWords(p.log, today(), totalWords(p.book)); return l === p.log ? p : { ...p, log: l }; });
  }, [book]);

  // Atajos: Ctrl+S/Shift+S/N/O/F/, y Esc (salir de concentración). `keys` guarda siempre las funciones del último render.
  const keys = useRef<Record<string, () => void>>({});
  keys.current = { s: saveNow, S: saveAs, n: onNew, o: openFile, f: () => setTab("search"), ",": () => setTab("settings") };
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (hiddenRef.current) return;
      if (e.key === "Escape") return setFocus(false);
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.shiftKey && e.key.toLowerCase() === "s" ? "S" : e.key.toLowerCase();
      const run = keys.current[k];
      if (run) { e.preventDefault(); run(); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const current = find(book, selected);
  const libro = bookOf(book, selected);
  const scope = esContenedor(book.kind) && ambito === "libro" && libro ? libro : book; // raíz sobre la que trabajan corcho, línea, estilo y exportación
  const card = cards.find((c) => c.id === cardId);
  const words = totalWords(book);
  const patchCard = (id: string, patch: Partial<Card>) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const openScene = (id: string) => { setSelected(id); setTab("book"); };
  const bookLang = project.lang || settings.lang; // proyectos antiguos sin idioma: el de la interfaz
  const spellLang = settings.spell && SPELL_LANGS.includes(bookLang) ? bookLang : null;
  const langs = [...new Set([...SPELL_LANGS, bookLang])].map((c) => [c, langName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
  const host: ToolHost = { project, scope, setProject, openScene, notify: setStatus, t: (k, v) => t(k as Key, v), lang: settings.lang, bookLang, current, cards, addCard: (c) => setCards((cs) => [...cs, c]), patchCard, openCard: (id) => { setCardId(id); setTab("cards"); } };

  async function replaceEverywhere(q: string, r: string) {
    const hits = search(book, q);
    const n = hits.reduce((t, h) => t + h.count, 0);
    if (!n || !(await confirmAsk(t("d.replace", { n, s: hits.length, r })))) return;
    const [b] = replaceAll(book, q, r);
    setProject((p) => ({ ...snapshot(p, t("snap.beforeReplace"), true), book: b }));
    setRev((v) => v + 1);
    setStatus(t("st.replaced", { n }));
  }

  // El proyecto actual pasa a ser el primer libro de una saga (o la saga, una parte de un universo). Antes se guarda una copia.
  async function convertir() {
    const kind = book.kind === "book" ? "saga" : "universe";
    const name = await ask(kind === "saga" ? t("d.sagaName") : t("d.universeName"), kind === "saga" ? t("d.sagaDef", { t: book.title }) : t("d.universeDef", { t: book.title }));
    if (!name?.trim()) return;
    setProject((p) => ({ ...snapshot(p, kind === "saga" ? t("snap.beforeSaga") : t("snap.beforeUniverse"), true), book: wrapIn(p.book, kind, name.trim()) }));
    setAmbito("libro");
  }

  async function addTemplate() {
    const i = await choose(t("d.addStructure"), structures.map((x) => x.name));
    if (i !== null) setBook((b) => applyTemplate(b, structures[i]));
  }

  async function addSceneTemplate() {
    if (!current || !conTexto(current.kind)) return;
    const i = await choose(t("d.insertTpl"), sceneTpls.map((x) => (x.genre ? `${x.name} · ${x.genre}` : x.name)));
    if (i === null) return;
    setBook((b) => update(b, current.id, (n) => ({ ...n, content: (n.content ?? "") + sceneTpls[i].html })));
    setRev((v) => v + 1);
  }

  const editable = !!current && conTexto(current.kind);
  const sceneCards = editable ? cards.filter((c) => mentions(current!, c.name, c.alias).length) : [];
  const dayWords = writtenOn(project.log, today());

  return (
    <div className={`app ${focus ? "focus" : ""} ${settings.quiet ? "quiet" : ""}`} style={{ "--editor-size": settings.fontSize + "px", "--editor-width": settings.width + "px" } as React.CSSProperties}>
      <DialogHost />
      <Ribbon
        tabs={tabs} tab={tab} onTab={(id) => { setTab(id); if (id === "map") setCardId(null); }}
        book={book} scope={scope} current={current} ambito={ambito} onAmbito={() => setAmbito(ambito === "libro" ? "todo" : "libro")}
        goal={goal} onGoal={(n) => setProject((p) => ({ ...p, goal: n }))} onConvert={convertir}
        onNew={onNew} onOpen={openFile} onSave={saveNow} onSaveAs={saveAs} onClose={cerrar} onImport={(k) => void importDoc(k, host)} onExport={(k: ExportKind) => exportAs(k, scope, bookLang).then((n) => { if (n) setStatus(t("st.exported", { n })); }, () => setWarn(t("w.export")))}
        onStructure={addTemplate} onSceneTpl={sceneTpls.length > 0 ? addSceneTemplate : undefined}
        onAddCard={() => host.addCard({ id: crypto.randomUUID(), type: "character", name: t("card.new"), notes: "" })}
        onScene={(patch) => current && setBook((b) => update(b, current.id, (n) => ({ ...n, ...patch })))}
        tools={tools} host={host}
        focus={focus} onFocus={() => setFocus(!focus)} onSettings={() => setTab("settings")}
        quiet={settings.quiet} onQuiet={() => saveSettings({ quiet: !settings.quiet })}
      />
      <div className="body">
      <aside className="sidebar">
        {tab !== "cards" && tab !== "map" ? (
          <Tree
            book={book}
            selected={selected}
            onSelect={setSelected}
            onAdd={(id, kind) => {
              const [b, child] = addChild(book, id, kind);
              setBook(() => b);
              if (child) setSelected(child.id);
            }}
            onRemove={(id) => {
              // Borrar la raíz la deja en blanco (vacía y sin tipo); el resto se quita del árbol.
              const b: Node = id === book.id ? { id: book.id, kind: "blank", title: book.title, children: [] } : remove(book, id);
              setProject((p) => ({ ...snapshot(p, t("snap.beforeDelete"), true), book: b }));
              if (!find(b, selected)) setSelected(book.id);
            }}
            onRename={(id, title) => setBook((b) => update(b, id, (n) => ({ ...n, title })))}
            onMove={(id, target) => setBook((b) => move(b, id, target))}
            onShift={(id, dir) => setBook((b) => shift(b, id, dir))}
          />
        ) : (
          <div className="tree">
            <button onClick={() => {
              const c: Card = { id: crypto.randomUUID(), type: "character", name: t("card.new"), notes: "" };
              setCards((cs) => [...cs, c]);
              setCardId(c.id);
            }}>{t("ins.card")}</button>
            {CARD_TYPES.map((type) => {
              const group = cards.filter((c) => c.type === type);
              return group.length > 0 && (
                <section key={type}>
                  <h3>{t(`types.${type}`)}</h3>
                  <ul>
                    {group.map((c) => (
                      <li key={c.id}>
                        <div className={`item ${c.id === cardId ? "active" : ""}`} onClick={() => setCardId(c.id)}>
                          <span className="label">{c.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        {goal > 0 && <footer><progress value={Math.min(words, goal)} max={goal} /></footer>}
      </aside>

      <main className="main">
        <header className="toolbar">
          {ToolPanel ? <span className="title">{toolName(tools.find((x) => x.id === tab)!)}</span>
            : tab === "cards" || tab === "map" || !current ? <span className="title">{card?.name ?? (tab === "map" ? t("map.title") : "")}</span>
            : <input className="title" aria-label={t("title.rename")} title={t("title.rename")} value={current.title} onChange={(e) => setBook((b) => update(b, current.id, (n) => ({ ...n, title: e.target.value })))} />}
        </header>

        {ToolPanel ? (
          <ToolPanel host={host} />
        ) : tab === "plugins" ? (
          <PluginsPanel state={plug} onChange={setPlug} onMsg={flash} tools={TOOLS} catalog={catalog} />
        ) : tab === "settings" ? (
          <SettingsPanel update={info} onUpdate={onUpdate} />
        ) : tab === "timeline" ? (
          <Timeline book={scope} onSelect={openScene} onDate={(id, date) => setBook((b) => update(b, id, (n) => ({ ...n, date })))} />
        ) : tab === "cork" ? (
          <Corkboard book={scope} onSelect={openScene} onSummary={(id, summary) => setBook((b) => update(b, id, (n) => ({ ...n, summary })))} />
        ) : tab === "search" ? (
          <SearchPanel book={book} onOpen={openScene} onReplace={replaceEverywhere} />
        ) : tab === "style" ? (
          <Analysis book={scope} current={current} cards={cards} project={project} lang={bookLang}
            onDailyGoal={(n) => setProject((p) => ({ ...p, dailyGoal: n }))} />
        ) : tab === "versions" ? (
          <Versions
            project={project}
            onSave={(label) => setProject((p) => snapshot(p, label))}
            onRestore={(id) => { setProject((p) => restore(p, id)); setSelected(book.id); setRev((r) => r + 1); }}
            onDelete={(id) => setProject((p) => ({ ...p, versions: p.versions.filter((v) => v.id !== id) }))}
          />
        ) : tab === "map" && !card ? (
          <RelationMap cards={cards} onSelect={setCardId} onMove={(id, x, y) => patchCard(id, { x, y })}
            onReorder={async () => { if (await confirmAsk(t("d.reorderMap"))) setCards((cs) => cs.map(({ x, y, ...c }) => c)); }} />
        ) : tab === "cards" || tab === "map" ? (
          card ? (
            <CardForm
              key={card.id}
              card={card}
              cards={cards}
              book={book}
              onPatch={(p) => patchCard(card.id, p)}
              onOpenScene={openScene}
              onBack={tab === "map" ? () => setCardId(null) : undefined}
              onDelete={async () => {
                if (await confirmAsk(t("d.deleteCard", { name: card.name }))) {
                  // copia previa y sin relaciones colgantes hacia la ficha borrada
                  setProject((p) => ({ ...snapshot(p, t("snap.beforeDeleteCard"), true), cards: p.cards.filter((c) => c.id !== card.id).map((c) => (c.links?.some((l) => l.to === card.id) ? { ...c, links: c.links.filter((l) => l.to !== card.id) } : c)) }));
                  setCardId(null);
                }
              }}
            />
          ) : <p className="empty">{t("card.empty")}</p>
        ) : editable ? (
          <>
            {sceneCards.length > 0 && (
              <div className="mentions">
                <span className="muted">{t("scene.in")}</span>
                {sceneCards.map((c) => <button key={c.id} className="chip" onClick={() => { setCardId(c.id); setTab("cards"); }}>{c.name}</button>)}
              </div>
            )}
            <SceneEditor
              key={[current!.id, rev, bookLang, settings.spell, ...tools.map((x) => x.id)].join()} // las extensiones se fijan al crear el editor: otro idioma o plugin = editor nuevo
              html={current!.content ?? ""}
              tools={tools}
              host={host}
              lang={spellLang}
              formato={formatoDe(book, current!.id)}
              onChange={(html) => setBook((b) => update(b, current!.id, (n) => ({ ...n, content: html })))}
            />
          </>
        ) : current && (esObra(current.kind) || esContenedor(current.kind)) ? (
          <BookMeta key={current.id} node={current} onChange={(meta) => setBook((b) => update(b, current.id, (n) => ({ ...n, meta })))} />
        ) : (
          <p className="empty" style={{ whiteSpace: "pre-line" }}>{t("empty.scene")}</p>
        )}
        <div className="statusbar">
          {warn ? <span className={warn.startsWith("⚠") ? "warn" : "ok"}>{warn}</span> : <span>{fileName ? `${fileName} · ${status || t("st.open")}` : status || t("st.browserOnly")}</span>}
          {pending && <button onClick={reconnect}>{t("st.reconnect", { name: pending.name })}</button>}
          <span className="spacer" />
          <select className="langsel" aria-label={t("book.lang")} title={t("book.lang")} value={bookLang} onChange={(e) => setProject((p) => ({ ...p, lang: e.target.value }))}>
            {langs.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
          {tab === "book" && editable && <span>{t("st.words.scene", { n: countWords(current!.content) + (current!.goal ? ` / ${current!.goal}` : "") })}</span>}
          <span>{t("st.today", { n: dayWords + (project.dailyGoal > 0 ? ` / ${project.dailyGoal}` : "") })}</span>
          <span>{t("st.words", { n: words })}{goal > 0 && t("st.pct", { n: Math.round((words / goal) * 100) })}</span>
        </div>
      </main>
      <ToolBar tools={tools} name={toolName} tab={tab} onTab={setTab} host={host} />
      </div>
    </div>
  );
}
