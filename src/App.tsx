import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Card, Node, Project, TEMPLATES, addChild, applyTemplate, countWords, find, logWords, mentions, move, normalize, remove, replaceAll, restore, search, shift, snapshot, toMarkdown, today, totalWords, update, writtenOn } from "./tree";
import { Analysis, CardForm, Corkboard, RelationMap, SearchPanel, Timeline, Versions } from "./Views";
import Tree from "./TreeView";
import { DialogHost, ask, choose, confirmAsk } from "./dialog";
import { idbGet, idbSet } from "./store";
import { PluginState, activeTheme, allSceneTemplates, allStructures, themeCss } from "./plugins";
import { PluginsPanel } from "./PluginsPanel";
import "./App.css";

type Tab = "book" | "cork" | "cards" | "timeline" | "map" | "style" | "search" | "versions" | "plugins";
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

function SceneEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    autofocus: "end",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
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
      <EditorContent editor={editor} className="editor" />
    </>
  );
}

export default function App({ initial, handle: savedHandle, granted }: { initial: Project; handle: any; granted: boolean }) {
  const [project, setProject] = useState<Project>(initial);
  const { book, cards, goal } = project;
  const setBook = (f: (b: Node) => Node) => setProject((p) => ({ ...p, book: f(p.book) }));
  const setCards = (f: (c: Card[]) => Card[]) => setProject((p) => ({ ...p, cards: f(p.cards) }));
  const [selected, setSelected] = useState<string>(() => book.children[0]?.children[0]?.children[0]?.id ?? book.id);
  const [cardId, setCardId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("book");
  const [rev, setRev] = useState(0); // fuerza recrear el editor cuando el texto cambia desde fuera (reemplazar, restaurar)
  const [dark, setDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  const [focus, setFocus] = useState(false);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [warn, setWarn] = useState("");
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
  useEffect(() => { idbGet<PluginState>("plugins").then((s) => { if (s) setPlug(s); }).catch(() => {}).finally(() => { plugLoaded.current = true; }); }, []);
  useEffect(() => {
    if (plugLoaded.current) idbSet("plugins", plug).catch(() => setWarn("⚠ No se pudieron guardar los plugins."));
    let el = document.getElementById("shakes-plugin-theme");
    if (!el) { el = document.createElement("style"); el.id = "shakes-plugin-theme"; document.head.appendChild(el); }
    el.textContent = themeCss(activeTheme(plug));
  }, [plug]);
  const structures = [...TEMPLATES, ...allStructures(plug)];
  const sceneTpls = allSceneTemplates(plug);

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
  const card = cards.find((c) => c.id === cardId);
  const words = totalWords(book);
  const patchCard = (id: string, patch: Partial<Card>) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const openScene = (id: string) => { setSelected(id); setTab("book"); };

  async function exportAs(kind: "md" | "docx" | "epub" | "pdf", el: HTMLElement) {
    el.closest("details")?.removeAttribute("open");
    if (kind === "md") return saveBlob(`${book.title}.md`, new Blob([toMarkdown(book)], { type: "text/markdown" }));
    const x = await import("./export"); // carga bajo demanda (fflate)
    if (kind === "pdf") {
      const f = document.createElement("iframe");
      f.style.cssText = "position:fixed;width:0;height:0;border:0";
      f.srcdoc = x.printHtml(book);
      f.onload = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 60_000); };
      return void document.body.appendChild(f);
    }
    const docx = kind === "docx";
    const data = await x.zip(docx ? x.toDocxFiles(book) : x.toEpubFiles(book));
    saveBlob(`${book.title}.${kind}`, new Blob([data as BlobPart], { type: docx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/epub+zip" }));
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

  const sceneCards = current?.kind === "scene" ? cards.filter((c) => mentions(current, c.name).length) : [];
  const dayWords = writtenOn(project.log, today());

  return (
    <div className={`app ${focus ? "focus" : ""}`}>
      <DialogHost />
      <aside className="sidebar">
        <div className="tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); if (k === "map") setCardId(null); }}>{l}</button>
          ))}
        </div>
        {tab !== "cards" && tab !== "map" ? (
          <Tree
            book={book}
            selected={selected}
            onSelect={setSelected}
            onAdd={(id) => {
              const [b, child] = addChild(book, id);
              setBook(() => b);
              if (child) setSelected(child.id);
            }}
            onRemove={(id) => {
              const b = remove(book, id);
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
        <footer>
          {goal > 0 && <progress value={Math.min(words, goal)} max={goal} />}
          <button onClick={async () => {
            const g = Number(await ask("Meta de palabras del libro (0 = sin meta)", String(goal)));
            if (Number.isFinite(g) && g >= 0) setProject((p) => ({ ...p, goal: Math.floor(g) }));
          }}>{goal > 0 ? `Meta: ${goal} palabras` : "Fijar meta de palabras"}</button>
          {tab !== "cards" && tab !== "map" && <button onClick={addTemplate}>Añadir plantilla…</button>}
          {tab === "book" && current?.kind === "scene" && sceneTpls.length > 0 && <button onClick={addSceneTemplate}>Plantilla de escena…</button>}
        </footer>
      </aside>

      <main className="main">
        <header className="toolbar">
          <span className="title">{tab === "cards" || tab === "map" ? card?.name : current?.title}</span>
          {tab === "book" && current?.kind === "scene" && (
            <>
              <input type="date" className="date" aria-label="Fecha de la escena" value={current.date ?? ""}
                onChange={(e) => setBook((b) => update(b, current.id, (n) => ({ ...n, date: e.target.value })))} />
              <input type="number" min={0} className="goal" aria-label="Meta de palabras de la escena" placeholder="Meta" value={current.goal || ""}
                onChange={(e) => setBook((b) => update(b, current.id, (n) => ({ ...n, goal: Math.max(0, Math.floor(Number(e.target.value))) || undefined })))} />
            </>
          )}
          <span className="spacer" />
          <div className="group">
            <button onClick={openFile}>Abrir</button>
            <button onClick={saveAs}>Guardar como…</button>
          </div>
          <details className="menu">
            <summary>Exportar ▾</summary>
            <div>
              {([["md", "Markdown (.md)"], ["docx", "Word (.docx)"], ["epub", "EPUB (.epub)"], ["pdf", "PDF (imprimir)"]] as const).map(([k, l]) => (
                <button key={k} onClick={(e) => exportAs(k, e.currentTarget)}>{l}</button>
              ))}
            </div>
          </details>
          <div className="group">
            <button onClick={() => setFocus(!focus)}>{focus ? "Salir" : "Concentración"}</button>
            <button onClick={() => setDark(!dark)}>{dark ? "Claro" : "Oscuro"}</button>
          </div>
        </header>

        {tab === "plugins" ? (
          <PluginsPanel state={plug} onChange={setPlug} onMsg={setWarn} />
        ) : tab === "timeline" ? (
          <Timeline book={book} onSelect={openScene} onDate={(id, date) => setBook((b) => update(b, id, (n) => ({ ...n, date })))} />
        ) : tab === "cork" ? (
          <Corkboard book={book} onSelect={openScene} onSummary={(id, summary) => setBook((b) => update(b, id, (n) => ({ ...n, summary })))} />
        ) : tab === "search" ? (
          <SearchPanel book={book} onOpen={openScene} onReplace={replaceEverywhere} />
        ) : tab === "style" ? (
          <Analysis book={book} current={current} cards={cards} project={project}
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
              onChange={(html) => setBook((b) => update(b, current.id, (n) => ({ ...n, content: html })))}
            />
          </>
        ) : (
          <p className="empty">Selecciona o crea una escena para escribir.<br />Doble clic o F2 renombra. Arrastra, o usa Alt+↑↓, para reordenar. Ctrl+F busca en todo el libro.</p>
        )}
        <div className="statusbar">
          {warn ? <span className="warn">{warn}</span> : <span>{fileName ? `${fileName} · ${status || "abierto"}` : status || "Solo en este navegador"}</span>}
          {pending && <button onClick={reconnect}>Reconectar «{pending.name}»</button>}
          <span className="spacer" />
          {tab === "book" && current?.kind === "scene" && <span>{countWords(current.content)}{current.goal ? ` / ${current.goal}` : ""} palabras en la escena</span>}
          <span>Hoy +{dayWords}{project.dailyGoal > 0 && ` / ${project.dailyGoal}`}</span>
          <span>{words} palabras{goal > 0 && ` · ${Math.round((words / goal) * 100)}% de la meta`}</span>
        </div>
      </main>
    </div>
  );
}
