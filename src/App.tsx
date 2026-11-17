import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Card, Node, Project, TEMPLATES, addChild, esContenedor, applyTemplate, bookOf, countWords, find, firstScene, logWords, mentions, move, normalize, remove, replaceAll, restore, search, shift, snapshot, toMarkdown, today, totalWords, update, wrapIn, writtenOn } from "./tree";
import { Analysis, CardForm, Corkboard, RelationMap, SearchPanel, Timeline, Versions } from "./Views";
import Tree from "./TreeView";
import { BookMeta } from "./BookMeta";
import { DialogHost, ask, choose, confirmAsk } from "./dialog";
import { idbGet, idbSet, recentAdd } from "./store";
import { PluginState, activeTheme, allSceneTemplates, allStructures, themeCss } from "./plugins";
import { PluginsPanel } from "./PluginsPanel";
import { ESSENTIAL, TOOLS, catalog } from "../plugins/index";
import type { ToolHost, ToolPlugin } from "../plugins/herramientas/types";
import "./App.css";

type Tab = string; // pestaña fija o id de una herramienta con Panel
const TABS: [Tab, string][] = [["book", "Manuscrito"], ["cork", "Corcho"], ["cards", "Fichas"], ["timeline", "Línea"], ["map", "Mapa"], ["style", "Estilo"], ["search", "Buscar"], ["versions", "Versiones"], ["plugins", "Plugins"]];

// File System Access API (Chromium/WebView2): sin plugin Rust.
const w = window as any;
const PICKER = { types: [{ description: "Proyecto Shakes", accept: { "application/json": [".shks"] } }] };

function saveBlob(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SceneEditor({ html, onChange, tools, host }: { html: string; onChange: (html: string) => void; tools: ToolPlugin[]; host: ToolHost }) {
  const hostRef = useRef(host);
  hostRef.current = host;
  const editor = useEditor({
    extensions: [StarterKit, ...tools.flatMap((t) => t.extensions?.(() => hostRef.current) ?? [])],
    content: html,
    autofocus: "end",
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
          {btn("B", "Negrita", editor.isActive("bold"), () => c().toggleBold().run())}
          {btn("I", "Cursiva", editor.isActive("italic"), () => c().toggleItalic().run())}
          <span className="sep" />
          {btn("H1", "Título", editor.isActive("heading", { level: 1 }), () => c().toggleHeading({ level: 1 }).run())}
          {btn("H2", "Subtítulo", editor.isActive("heading", { level: 2 }), () => c().toggleHeading({ level: 2 }).run())}
          <span className="sep" />
          {btn("•", "Lista", editor.isActive("bulletList"), () => c().toggleBulletList().run())}
          {btn("❝", "Cita", editor.isActive("blockquote"), () => c().toggleBlockquote().run())}
          <span className="sep" />
          {btn("↶", "Deshacer", false, () => c().undo().run())}
          {btn("↷", "Rehacer", false, () => c().redo().run())}
        </div>
      )}
      <div className="editor-row">
        <EditorContent editor={editor} className="editor" />
        {editor && tools.map((t) => t.Overlay && <t.Overlay key={t.id} editor={editor} host={host} />)}
      </div>
    </>
  );
}

export default function App({ initial, handle: savedHandle, granted, onNew, onClose }: { initial: Project; handle: any; granted: boolean; onNew: () => void; onClose: () => void }) {
  const [project, setProject] = useState<Project>(initial);
  const { book, cards, goal } = project;
  const setBook = (f: (b: Node) => Node) => setProject((p) => ({ ...p, book: f(p.book) }));
  const setCards = (f: (c: Card[]) => Card[]) => setProject((p) => ({ ...p, cards: f(p.cards) }));
  const [selected, setSelected] = useState<string>(() => firstScene(book)?.id ?? book.id);
  const [ambito, setAmbito] = useState<"libro" | "todo">("libro"); // en una saga/universo: vistas y exportación del libro actual o de todo
  const [cardId, setCardId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("book");
  const [rev, setRev] = useState(0); // fuerza recrear el editor cuando el texto cambia desde fuera (reemplazar, restaurar)
  const [dark, setDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
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
    const t = setTimeout(async () => {
      try { await idbSet("project", project); setWarn(""); }
      catch { setWarn("⚠ No se pudo guardar en el navegador (¿almacenamiento lleno?). Usa Guardar como… para no perder datos."); }
      if (!handle.current) return;
      try {
        const f = await handle.current.createWritable();
        await f.write(JSON.stringify(project));
        await f.close();
        setStatus("Guardado " + new Date().toLocaleTimeString());
      } catch { setWarn("⚠ No se pudo escribir el archivo. Reconéctalo con Abrir o Guardar como…"); }
    }, 600);
    return () => clearTimeout(t);
  }, [project]);

  // Copia automática cada 10 min si hubo cambios (el libro es inmutable: basta comparar referencias).
  useEffect(() => {
    const t = setInterval(() => setProject((p) => (p.versions[0]?.book === p.book ? p : snapshot(p, "Copia automática", true))), 600_000);
    return () => clearInterval(t);
  }, []);

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
    const seed = (s: PluginState): PluginState => s.seeded ? s : { ...s, seeded: true, plugins: [...s.plugins, ...catalog.filter((c) => ESSENTIAL.includes(c.id) && !s.plugins.some((p) => p.id === c.id))] };
    idbGet<PluginState>("plugins").then((s) => { plugLoaded.current = true; setPlug(seed(s ?? { plugins: [], theme: null })); })
      .catch(() => setPlug(seed({ plugins: [], theme: null }))); // no se pudo leer: esenciales en memoria, sin sobrescribir lo guardado
  }, []);
  useEffect(() => {
    if (plugLoaded.current) idbSet("plugins", plug).catch(() => setWarn("⚠ No se pudieron guardar los plugins."));
    let el = document.getElementById("shakes-plugin-theme");
    if (!el) { el = document.createElement("style"); el.id = "shakes-plugin-theme"; document.head.appendChild(el); }
    el.textContent = themeCss(activeTheme(plug));
  }, [plug]);
  const structures = [...TEMPLATES, ...allStructures(plug)];
  const sceneTpls = allSceneTemplates(plug);
  const tools = TOOLS.filter((t) => plug.plugins.some((p) => p.tool === t.id)); // herramientas instaladas
  const tabs: [Tab, string][] = [...TABS.filter(([k]) => k !== "plugins"), ...tools.filter((t) => t.Panel).map((t): [Tab, string] => [t.id, t.name]), ["plugins", "Plugins"]]; // Plugins siempre al final
  const ToolPanel = tools.find((t) => t.id === tab)?.Panel;

  function load(p: Project, name: string) {
    setFileName(name);
    setProject(p);
    setSelected(p.book.id);
    setCardId(null);
    setRev((r) => r + 1);
  }

  async function openFile() {
    if (w.showOpenFilePicker) {
      try {
        const [h] = await w.showOpenFilePicker({ types: [{ description: "Proyecto Shakes", accept: { "application/json": [".shks", ".shakes"] } }] });
        handle.current = h;
        setPending(null);
        idbSet("handle", h).catch(() => {});
        recentAdd(h);
        load(normalize(JSON.parse(await (await h.getFile()).text())), h.name);
      } catch {}
      return;
    }
    // Respaldo sin File System Access API: se carga una copia; el guardado es por descarga.
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".shks,.shakes,.json"; // .shakes: extensión antigua, aún se abre
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try { handle.current = null; idbSet("handle", null).catch(() => {}); load(normalize(JSON.parse(await f.text())), f.name); } catch { setWarn("⚠ Archivo no válido."); }
    };
    input.click();
  }

  // Guarda ya (sin esperar al autoguardado de 600 ms) y vuelve a la pantalla de inicio.
  async function cerrar() {
    try {
      if (handle.current) { const f = await handle.current.createWritable(); await f.write(JSON.stringify(project)); await f.close(); recentAdd(handle.current); }
    } catch { if (!(await confirmAsk("No se pudo guardar el archivo. ¿Cerrar de todos modos?"))) return; }
    onClose();
  }

  async function saveAs() {
    if (!w.showSaveFilePicker) {
      saveBlob(`${book.title}.shks`, new Blob([JSON.stringify(project)], { type: "application/json" }));
      return setStatus("Descargado " + new Date().toLocaleTimeString());
    }
    try {
      handle.current = await w.showSaveFilePicker({ ...PICKER, suggestedName: `${book.title}.shks` });
      setFileName(handle.current.name);
      setPending(null);
      idbSet("handle", handle.current).catch(() => {});
      recentAdd(handle.current);
      setProject({ ...project }); // dispara el autoguardado
    } catch {}
  }

  // Progreso diario: se anotan las palabras totales del día (la 1ª vez como inicio).
  useEffect(() => {
    setProject((p) => { const l = logWords(p.log, today(), totalWords(p.book)); return l === p.log ? p : { ...p, log: l }; });
  }, [book]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); setTab("search"); } };
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
  const host: ToolHost = { project, scope, setProject, openScene, notify: setStatus, cards, addCard: (c) => setCards((cs) => [...cs, c]), patchCard, openCard: (id) => { setCardId(id); setTab("cards"); } };

  async function exportAs(kind: "md" | "docx" | "epub" | "pdf", el: HTMLElement) {
    el.closest("details")?.removeAttribute("open");
    if (kind === "md") return saveBlob(`${scope.title}.md`, new Blob([toMarkdown(scope)], { type: "text/markdown" }));
    const x = await import("./export"); // carga bajo demanda (fflate)
    if (kind === "pdf") {
      const f = document.createElement("iframe");
      f.style.cssText = "position:fixed;width:0;height:0;border:0";
      f.srcdoc = x.printHtml(scope);
      f.onload = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 60_000); };
      return void document.body.appendChild(f);
    }
    const docx = kind === "docx";
    const data = await x.zip(docx ? x.toDocxFiles(scope) : x.toEpubFiles(scope));
    saveBlob(`${scope.title}.${kind}`, new Blob([data as BlobPart], { type: docx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/epub+zip" }));
  }

  async function replaceEverywhere(q: string, r: string) {
    const hits = search(book, q);
    const n = hits.reduce((t, h) => t + h.count, 0);
    if (!n || !(await confirmAsk(`¿Reemplazar ${n} coincidencias en ${hits.length} escenas por «${r}»? Antes se guarda una copia.`))) return;
    const [b] = replaceAll(book, q, r);
    setProject((p) => ({ ...snapshot(p, "Antes de reemplazar", true), book: b }));
    setRev((v) => v + 1);
    setStatus(`${n} reemplazos`);
  }

  // El proyecto actual pasa a ser el primer libro de una saga (o la saga, una parte de un universo). Antes se guarda una copia.
  async function convertir() {
    const kind = book.kind === "book" ? "saga" : "universe";
    const t = await ask(kind === "saga" ? "Nombre de la saga" : "Nombre del universo", kind === "saga" ? `Saga de ${book.title}` : `Universo de ${book.title}`);
    if (!t?.trim()) return;
    setProject((p) => ({ ...snapshot(p, kind === "saga" ? "Antes de crear la saga" : "Antes de crear el universo", true), book: wrapIn(p.book, kind, t.trim()) }));
    setAmbito("libro");
  }

  async function addTemplate() {
    const i = await choose("Añadir estructura al libro:", structures.map((t) => t.name));
    if (i !== null) setBook((b) => applyTemplate(b, structures[i]));
  }

  async function addSceneTemplate() {
    if (current?.kind !== "scene") return;
    const i = await choose("Insertar plantilla en la escena:", sceneTpls.map((t) => (t.genre ? `${t.name} · ${t.genre}` : t.name)));
    if (i === null) return;
    setBook((b) => update(b, current.id, (n) => ({ ...n, content: (n.content ?? "") + sceneTpls[i].html })));
    setRev((v) => v + 1);
  }

  const sceneCards = current?.kind === "scene" ? cards.filter((c) => mentions(current, c.name, c.alias).length) : [];
  const dayWords = writtenOn(project.log, today());

  return (
    <div className={`app ${focus ? "focus" : ""}`}>
      <DialogHost />
      <nav className="topbar">
        <div className="tabs" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); if (k === "map") setCardId(null); }}>{l}</button>
          ))}
        </div>
        <div className="ribbon">
          <div className="rgroup">
            <div className="rbtns">
              <button onClick={onNew}>Nuevo</button>
              <button title="Guardar y volver a la pantalla de inicio" onClick={cerrar}>Cerrar proyecto</button>
              <button onClick={openFile}>Abrir</button>
              <button onClick={saveAs}>Guardar como…</button>
              <details className="menu">
                <summary>Exportar ▾</summary>
                <div>
                  {esContenedor(book.kind) && <span className="muted">Se exporta: {scope.kind === "book" ? `«${scope.title}»` : "todo"}</span>}
                  {([["md", "Markdown (.md)"], ["docx", "Word (.docx)"], ["epub", "EPUB (.epub)"], ["pdf", "PDF (imprimir)"]] as const).map(([k, l]) => (
                    <button key={k} onClick={(e) => exportAs(k, e.currentTarget)}>{l}</button>
                  ))}
                </div>
              </details>
            </div>
            <span className="rlabel">Archivo</span>
          </div>
          <div className="rgroup">
            <div className="rbtns">
              {tab !== "cards" && tab !== "map" && <button onClick={addTemplate}>Estructura…</button>}
              {tab === "book" && current?.kind === "scene" && sceneTpls.length > 0 && <button onClick={addSceneTemplate}>Plantilla de escena…</button>}
              {(tab === "cards" || tab === "map") && <button onClick={() => host.addCard({ id: crypto.randomUUID(), type: "Personaje", name: "Nueva ficha", notes: "" })}>+ Ficha</button>}
            </div>
            <span className="rlabel">Insertar</span>
          </div>
          {tab === "book" && current?.kind === "scene" && (
            <div className="rgroup">
              <div className="rbtns">
                <input type="date" className="date" aria-label="Fecha de la escena" value={current.date ?? ""}
                  onChange={(e) => setBook((b) => update(b, current.id, (n) => ({ ...n, date: e.target.value })))} />
                <input type="number" min={0} className="goal" aria-label="Meta de palabras de la escena" placeholder="Meta" value={current.goal || ""}
                  onChange={(e) => setBook((b) => update(b, current.id, (n) => ({ ...n, goal: Math.max(0, Math.floor(Number(e.target.value))) || undefined })))} />
              </div>
              <span className="rlabel">Escena</span>
            </div>
          )}
          <div className="rgroup">
            <div className="rbtns">
              {esContenedor(book.kind) && <button title="Qué usan Corcho, Línea, Estilo y Exportar" onClick={() => setAmbito(ambito === "libro" ? "todo" : "libro")}>Ámbito: {ambito === "libro" ? "libro actual" : "todo"}</button>}
              {(book.kind === "book" || book.kind === "saga") && <button onClick={convertir}>{book.kind === "book" ? "Convertir en saga" : "Convertir en universo"}</button>}
              <button onClick={async () => {
                const g = Number(await ask("Meta de palabras del libro (0 = sin meta)", String(goal)));
                if (Number.isFinite(g) && g >= 0) setProject((p) => ({ ...p, goal: Math.floor(g) }));
              }}>{goal > 0 ? `Meta: ${goal} palabras` : "Fijar meta"}</button>
            </div>
            <span className="rlabel">Proyecto</span>
          </div>
          {tools.some((t) => t.actions?.length) && (
            <div className="rgroup">
              <div className="rbtns">
                <details className="menu">
                  <summary>Herramientas ▾</summary>
                  <div>
                    {tools.flatMap((t) => (t.actions ?? []).map((a) => (
                      <button key={t.id + a.label} onClick={async (e) => { e.currentTarget.closest("details")?.removeAttribute("open"); await a.run(host); }}>{a.label}</button>
                    )))}
                  </div>
                </details>
              </div>
              <span className="rlabel">Plugins</span>
            </div>
          )}
          <div className="rgroup">
            <div className="rbtns">
              <button onClick={() => setFocus(!focus)}>{focus ? "Salir" : "Concentración"}</button>
              <button onClick={() => setDark(!dark)}>{dark ? "Claro" : "Oscuro"}</button>
            </div>
            <span className="rlabel">Vista</span>
          </div>
        </div>
      </nav>
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
              setProject((p) => ({ ...snapshot(p, "Antes de eliminar", true), book: b }));
              if (!find(b, selected)) setSelected(book.id);
            }}
            onRename={(id, title) => setBook((b) => update(b, id, (n) => ({ ...n, title })))}
            onMove={(id, target) => setBook((b) => move(b, id, target))}
            onShift={(id, dir) => setBook((b) => shift(b, id, dir))}
          />
        ) : (
          <div className="tree">
            <button onClick={() => {
              const c: Card = { id: crypto.randomUUID(), type: "Personaje", name: "Nueva ficha", notes: "" };
              setCards((cs) => [...cs, c]);
              setCardId(c.id);
            }}>+ Ficha</button>
            <ul>
              {cards.map((c) => (
                <li key={c.id}>
                  <div className={`item ${c.id === cardId ? "active" : ""}`} onClick={() => setCardId(c.id)}>
                    <span className="label">{c.name}</span><span className="muted">{c.type}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {goal > 0 && <footer><progress value={Math.min(words, goal)} max={goal} /></footer>}
      </aside>

      <main className="main">
        <header className="toolbar">
          <span className="title">{tab === "cards" || tab === "map" ? card?.name : current?.title}</span>
        </header>

        {ToolPanel ? (
          <ToolPanel host={host} />
        ) : tab === "plugins" ? (
          <PluginsPanel state={plug} onChange={setPlug} onMsg={flash} tools={TOOLS} catalog={catalog} />
        ) : tab === "timeline" ? (
          <Timeline book={scope} onSelect={openScene} onDate={(id, date) => setBook((b) => update(b, id, (n) => ({ ...n, date })))} />
        ) : tab === "cork" ? (
          <Corkboard book={scope} onSelect={openScene} onSummary={(id, summary) => setBook((b) => update(b, id, (n) => ({ ...n, summary })))} />
        ) : tab === "search" ? (
          <SearchPanel book={book} onOpen={openScene} onReplace={replaceEverywhere} />
        ) : tab === "style" ? (
          <Analysis book={scope} current={current} cards={cards} project={project}
            onDailyGoal={async () => {
              const g = Number(await ask("Meta diaria de palabras (0 = sin meta)", String(project.dailyGoal)));
              if (Number.isFinite(g) && g >= 0) setProject((p) => ({ ...p, dailyGoal: Math.floor(g) }));
            }} />
        ) : tab === "versions" ? (
          <Versions
            project={project}
            onSave={(label) => setProject((p) => snapshot(p, label))}
            onRestore={(id) => { setProject((p) => restore(p, id)); setSelected(book.id); setRev((r) => r + 1); }}
            onDelete={(id) => setProject((p) => ({ ...p, versions: p.versions.filter((v) => v.id !== id) }))}
          />
        ) : tab === "map" && !card ? (
          <RelationMap cards={cards} onSelect={setCardId} onMove={(id, x, y) => patchCard(id, { x, y })} />
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
                if (await confirmAsk(`¿Eliminar la ficha "${card.name}"?`)) { setCards((cs) => cs.filter((c) => c.id !== card.id)); setCardId(null); }
              }}
            />
          ) : <p className="empty">Crea o selecciona una ficha.</p>
        ) : current?.kind === "scene" ? (
          <>
            {sceneCards.length > 0 && (
              <div className="mentions">
                <span className="muted">En esta escena:</span>
                {sceneCards.map((c) => <button key={c.id} className="chip" onClick={() => { setCardId(c.id); setTab("cards"); }}>{c.name}</button>)}
              </div>
            )}
            <SceneEditor
              key={current.id + rev}
              html={current.content ?? ""}
              tools={tools}
              host={host}
              onChange={(html) => setBook((b) => update(b, current.id, (n) => ({ ...n, content: html })))}
            />
          </>
        ) : current && (current.kind === "book" || current.kind === "saga" || current.kind === "universe") ? (
          <BookMeta key={current.id} node={current} onChange={(meta) => setBook((b) => update(b, current.id, (n) => ({ ...n, meta })))} />
        ) : (
          <p className="empty">Selecciona o crea una escena para escribir.<br />Doble clic o F2 renombra. Arrastra, o usa Alt+↑↓, para reordenar. Ctrl+F busca en todo el libro.</p>
        )}
        <div className="statusbar">
          {warn ? <span className={warn.startsWith("⚠") ? "warn" : "ok"}>{warn}</span> : <span>{fileName ? `${fileName} · ${status || "abierto"}` : status || "Solo en este navegador"}</span>}
          {pending && <button onClick={reconnect}>Reconectar «{pending.name}»</button>}
          <span className="spacer" />
          {tab === "book" && current?.kind === "scene" && <span>{countWords(current.content)}{current.goal ? ` / ${current.goal}` : ""} palabras en la escena</span>}
          <span>Hoy +{dayWords}{project.dailyGoal > 0 && ` / ${project.dailyGoal}`}</span>
          <span>{words} palabras{goal > 0 && ` · ${Math.round((words / goal) * 100)}% de la meta`}</span>
        </div>
      </main>
      </div>
    </div>
  );
}
