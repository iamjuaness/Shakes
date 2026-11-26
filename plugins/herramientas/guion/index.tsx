// Plugin Guion: los guiones se escriben por escenas con los elementos del formato de cine (encabezado, acción,
// personaje, acotación, diálogo, transición), y lo mismo para teatro, cómic y radio/pódcast con sus elementos.
// Tab cambia el elemento, Intro pasa al siguiente lógico; panel de desglose (escenas, reparto, minutos) y exportación
// a Fountain (cine) y a PDF con formato de industria.
import { Extension, useEditorState, type Editor } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { bookOf, books, formatoDe, scenes, update, type Formato, type Node } from "../../../src/tree";
import { guardar } from "../_comun/guardar";
import { guionPdf } from "./pdf";
import { choose } from "../../../src/dialog";
import type { ToolHost, ToolPlugin } from "../types";
import { MAYUS, ciclo, completar, detectar, elem, elementos, encabezado, encabezadoOk, fg, fountain, nombreElem, paginas, papelPara, personajes, reparto, siguiente, type Elem } from "./guion";

const L = (h: ToolHost, es: string, en: string) => (h.lang === "en" ? en : es);
const enGuion = (h: ToolHost) => !!h.current && bookOf(h.project.book, h.current.id)?.kind === "script";
const guionDe = (h: ToolHost): Node | undefined => books(h.scope).find((b) => b.kind === "script") ?? books(h.project.book).find((b) => b.kind === "script");
const sp = (e: Elem) => (e === "action" ? null : e); // acción = párrafo normal, sin atributo
const fmt = (h: ToolHost): Formato | undefined => (h.current ? formatoDe(h.project.book, h.current.id) : undefined);
// Nombres para autocompletar: los que ya hablan en el guion (otras escenas y esta, menos la línea que se escribe) y las fichas de personaje.
function nombres(h: ToolHost, ed: Editor): string[] {
  const id = h.current?.id;
  const o = id && bookOf(h.project.book, id);
  if (!o) return [];
  const actual = ed.state.selection.$from.parent, aqui: string[] = [];
  ed.state.doc.forEach((n) => { if (n.attrs.sp === "character" && n !== actual) aqui.push(n.textContent.replace(/\s*\(.*\)\s*$/, "")); });
  return personajes(update(o, id, (n) => ({ ...n, content: "" })), [...aqui, ...h.cards.filter((c) => c.type === "character").map((c) => c.name)]);
}

let estilo = false;
function inyectarEstilo() {
  if (estilo || typeof document === "undefined") return;
  estilo = true;
  const el = document.createElement("style");
  el.id = "shakes-guion";
  el.textContent = `
.ProseMirror.sp-guion{font-family:"Courier Prime","Courier New",Courier,monospace;font-size:calc(var(--editor-size,19px) - 2px);line-height:1.2;max-width:60ch;text-align:left}
.sp-guion p{margin:0 0 1.2em}
.sp-guion p[data-sp=heading]{text-transform:uppercase;margin-top:2.4em}
.sp-guion p[data-sp=heading].sp-mal{text-decoration:underline dotted #d9a400;text-underline-offset:4px}
.sp-guion p[data-sp=character]{text-transform:uppercase;margin:1.2em 0 0 23ch}
.sp-guion p[data-sp=paren]{margin:0 0 0 17.5ch;max-width:20ch}
.sp-guion p[data-sp=dialogue]{margin:0 0 1.2em 11ch;max-width:35ch}
.sp-guion p[data-sp=transition]{text-transform:uppercase;text-align:right}
.sp-guion p[data-sp=caption],.sp-guion p[data-sp=music]{font-style:italic;border-left:3px solid var(--line);padding-left:1ch}
.sp-guion p[data-sp=sfx]{text-transform:uppercase;font-weight:700;letter-spacing:.05em}
.sp-theatre p:not([data-sp]){font-style:italic;margin-left:15ch;max-width:45ch}
.sp-theatre p[data-sp=dialogue]{margin-left:8ch;max-width:48ch}
.sp-comic p[data-sp=heading]{border-top:1px dashed var(--line);padding-top:.6em}
.sp-comic p[data-sp=dialogue],.sp-audio p[data-sp=dialogue]{max-width:40ch}
.sp-bar .sp-sug{font-weight:600;color:var(--accent)}
.sp-bar{width:150px;flex:none;display:flex;flex-direction:column;gap:4px;padding:14px 10px;border-left:1px solid var(--line);background:var(--panel);overflow:auto}
.sp-bar button{text-align:left}.sp-bar button.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.sp-bar p{margin:6px 0 0;line-height:1.4}
.sp-tabla{width:100%;border-collapse:collapse}.sp-tabla td,.sp-tabla th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.sp-tabla tbody tr{cursor:pointer}.sp-tabla tbody tr:hover{background:var(--accent-soft)}`;
  document.head.appendChild(el);
}

// Si la escena aún tiene un título por defecto (o uno puesto por aquí, en mayúsculas), toma el del encabezado.
function titular(h: ToolHost, texto: string) {
  const id = h.current?.id;
  const t = texto.trim().toUpperCase();
  if (!id || !t) return;
  h.setProject((p) => ({ ...p, book: update(p.book, id, (n) => (/^(Escena|Scene) \d+$/.test(n.title) || n.title === n.title.toUpperCase() ? { ...n, title: t } : n)) }));
}

const formato = (host: () => ToolHost) =>
  Extension.create({
    name: "guion",
    priority: 1000, // sus teclas van antes que las de StarterKit
    onCreate() { inyectarEstilo(); },
    addKeyboardShortcuts() {
      const ed = () => this.editor;
      const activo = () => enGuion(host()) && ed().isActive("paragraph");
      const tipo = () => elem(ed().getAttributes("paragraph").sp);
      const poner = (e: Elem) => ed().commands.updateAttributes("paragraph", { sp: sp(e) });
      return {
        Tab: () => activo() && poner(ciclo(tipo(), 1, fmt(host()))),
        "Shift-Tab": () => activo() && poner(ciclo(tipo(), -1, fmt(host()))),
        Enter: () => {
          if (!activo()) return false;
          let texto = ed().state.selection.$from.parent.textContent;
          const e = tipo();
          const sug = e === "character" ? completar(texto, nombres(host(), ed())) : null; // «AN» + Intro = ANA
          if (sug) texto = sug;
          if (!texto.trim()) return e !== "action" && poner("action"); // Intro en una línea vacía: vuelve a acción
          const f = fmt(host());
          const real = detectar(texto, e, f);
          if (real !== e) poner(real);
          if (real === "heading" && fg(f) !== "comic") titular(host(), texto); // en el cómic el encabezado es la viñeta, no la página
          if (sug || (MAYUS.includes(real) && texto !== texto.toUpperCase())) {
            const { $from } = ed().state.selection; // en el guion van en mayúsculas (Fountain y el PDF lo esperan)
            ed().view.dispatch(ed().state.tr.insertText(texto.toUpperCase(), $from.start(), $from.end()));
          }
          return ed().chain().splitBlock().updateAttributes("paragraph", { sp: sp(siguiente(real, f)) }).run();
        },
      };
    },
    addProseMirrorPlugins() {
      // Encabezados sin INT./EXT., lugar o momento: subrayado punteado (no bloquea; se revisa en el desglose).
      return [new Plugin({ props: {
        attributes: (): Record<string, string> => (enGuion(host()) ? { class: `sp-guion sp-${fg(fmt(host()))}` } : {}),
        decorations: (state) => {
          if (!enGuion(host()) || fg(fmt(host())) !== "film") return null; // INT./EXT. solo en cine
          const ds: Decoration[] = [];
          state.doc.forEach((n, pos) => { if (n.attrs.sp === "heading" && n.textContent.trim() && !encabezadoOk(n.textContent) && !state.selection.$from.parent.eq(n)) ds.push(Decoration.node(pos, pos + n.nodeSize, { class: "sp-mal", title: L(host(), "Encabezado incompleto: INT./EXT. LUGAR - DÍA/NOCHE", "Incomplete heading: INT./EXT. PLACE - DAY/NIGHT") })); });
          return DecorationSet.create(state.doc, ds);
        },
      } })];
    },
  });

// Columna junto al editor: elemento actual (clic para cambiarlo), teclas y duración aproximada.
function Barra({ editor, host }: { editor: Editor; host: ToolHost }) {
  const tipo = useEditorState({ editor, selector: ({ editor }) => elem(editor.getAttributes("paragraph").sp) });
  const escrito = useEditorState({ editor, selector: ({ editor }) => editor.state.selection.$from.parent.textContent });
  if (!enGuion(host)) return null;
  const sug = tipo === "character" ? completar(escrito, nombres(host, editor)) : null;
  const f = fmt(host), en = host.lang === "en";
  const obra = bookOf(host.project.book, host.current!.id)!;
  const pista = { film: ["«INT.» o «EXT.» = encabezado.", "“INT.” or “EXT.” = heading."], theatre: ["«Escena I» = encabezado.", "“Scene I” = heading."], comic: ["«Viñeta 1» = nueva viñeta.", "“Panel 1” = new panel."], audio: ["«SFX:» = sonido, «Música:» = música.", "“SFX:” = sound, “Music:” = music."] }[fg(f)];
  const total = scenes(obra).reduce((n, s) => n + paginas(s.scene.content), 0);
  return (
    <aside className="sp-bar" aria-label={L(host, "Elementos del guion", "Script elements")}>
      {elementos(f).map((e) => (
        <button key={e} className={e === tipo ? "on" : ""} aria-pressed={e === tipo}
          onMouseDown={(ev) => { ev.preventDefault(); editor.chain().focus().updateAttributes("paragraph", { sp: sp(e) }).run(); }}>{nombreElem(e, f, en)}</button>
      ))}
      {sug && <p className="sp-sug">{L(host, `Intro → ${sug}`, `Enter → ${sug}`)}</p>}
      <p className="muted">{L(host, "Tab / Mayús+Tab: cambiar elemento. Intro: el siguiente. ", "Tab / Shift+Tab: change element. Enter: the next one. ") + pista[en ? 1 : 0]}</p>
      <p className="muted">{L(host, `Escena ≈ ${paginas(host.current?.content).toFixed(1)} pág. · Guion ≈ ${Math.max(1, Math.round(total))} min`, `Scene ≈ ${paginas(host.current?.content).toFixed(1)} p. · Script ≈ ${Math.max(1, Math.round(total))} min`)}</p>
    </aside>
  );
}

// Desglose: escenas con su encabezado, quién habla y páginas; reparto con en cuántas escenas aparece cada uno.
function Panel({ host }: { host: ToolHost }) {
  const obra = guionDe(host);
  if (!obra) return <p className="empty">{L(host, "Este proyecto no tiene guion. Crea uno con Archivo ▾ → Nuevo → Guion.", "This project has no script. Create one with File ▾ → New → Script.")}</p>;
  const ss = scenes(obra);
  const total = ss.reduce((n, s) => n + paginas(s.scene.content), 0);
  const cuenta = new Map<string, number>();
  ss.forEach(({ scene }) => reparto(scene.content).forEach((p) => cuenta.set(p, (cuenta.get(p) ?? 0) + 1)));
  return (
    <div className="panel">
      <h3>{obra.title} · ≈ {Math.max(1, Math.round(total))} min · {ss.length} {L(host, "escenas", "scenes")}</h3>
      <table className="sp-tabla">
        <thead><tr><th>#</th><th>{L(host, "Escena", "Scene")}</th><th>{L(host, "Personajes", "Characters")}</th><th>{L(host, "Pág.", "Pp.")}</th></tr></thead>
        <tbody>
          {ss.map(({ scene, path }, i) => (
            <tr key={scene.id} onClick={() => host.openScene(scene.id)}>
              <td>{i + 1}</td>
              <td>{encabezado(scene.content) ?? scene.title}
                {fg(obra.meta?.formato) === "film" && !encabezadoOk(encabezado(scene.content) ?? "") && <div className="warn">⚠ {L(host, "Falta un encabezado completo: INT./EXT. LUGAR - DÍA/NOCHE", "Missing a full heading: INT./EXT. PLACE - DAY/NIGHT")}</div>}
                {path && <div className="muted">{path}</div>}</td>
              <td>{reparto(scene.content).join(", ") || "—"}</td>
              <td>{paginas(scene.content).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{L(host, "Reparto", "Cast")}</h3>
      <div className="chips">{[...cuenta].sort((a, b) => b[1] - a[1]).map(([p, n]) => <span key={p} className="chip">{p} · {n}</span>)}</div>
    </div>
  );
}

async function exportar(h: ToolHost, pdf: boolean) {
  const obra = guionDe(h);
  if (!obra) return h.notify(L(h, "⚠ Este proyecto no tiene guion.", "⚠ This project has no script."));
  const listo = (n: string | null) => { if (n) h.notify(L(h, `«${n}» guardado`, `“${n}” saved`)); };
  if (!pdf && fg(obra.meta?.formato) !== "film") return h.notify(L(h, "Fountain es el formato del guion de cine; para teatro, cómic o radio usa «Exportar guion (PDF)…».", "Fountain is for screenplays; for stage, comics or radio use “Export script (PDF)…”."));
  if (!pdf) return listo(await guardar(`${obra.title}.fountain`, fountain(obra), "text/plain"));
  // Carta en EE. UU.; A4 en Europa y Latinoamérica. Se propone el del idioma del guion.
  const papeles = papelPara(h.bookLang) === "A4" ? (["A4", "letter"] as const) : (["letter", "A4"] as const);
  const i = await choose(L(h, "Tamaño del papel", "Paper size"), papeles.map((p) => (p === "A4" ? "A4 (Europa, Latinoamérica)" : L(h, "Carta (EE. UU.)", "Letter (US)"))));
  if (i === null) return;
  listo(await guardar(`${obra.title}.pdf`, guionPdf(obra, papeles[i], h.bookLang) as BlobPart, "application/pdf"));
}

export const guion: ToolPlugin = {
  id: "guion",
  name: "Guion",
  extensions: (host) => [formato(host)],
  Overlay: Barra,
  Panel,
  actions: [
    { label: "Exportar guion (Fountain)…", run: (h) => exportar(h, false) },
    { label: "Exportar guion (PDF)…", run: (h) => exportar(h, true) },
  ],
};
