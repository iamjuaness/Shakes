import { L } from "../_comun/idioma";
import { useReducer } from "react";
import type { ReactNode } from "react";
import { elegir } from "../_comun/guardar";
import type { ToolHost, ToolPlugin } from "../types";

// Estado a nivel de módulo: el panel y el texto siguen al cambiar de escena. Se recuerda el último archivo.
const KEY = "shakes.notas-laterales";
const S = { abierto: false, nombre: "", texto: "", handle: null as any };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) ?? "{}"), { handle: null }); } catch { /* sin almacenamiento */ }
const recordar = () => { try { localStorage.setItem(KEY, JSON.stringify({ abierto: S.abierto, nombre: S.nombre, texto: S.texto })); } catch { /* sin almacenamiento */ } };

async function abrir() {
  const w = window as any;
  if (w.showOpenFilePicker) { // con handle se puede recargar el archivo sin volver a elegirlo
    try {
      const [h] = await w.showOpenFilePicker({ types: [{ description: L("Notas", "Notes"), accept: { "text/plain": [".md", ".txt"] } }] });
      S.handle = h; S.nombre = h.name; S.texto = await (await h.getFile()).text();
    } catch { return false; } // cancelado
  } else {
    const f = await elegir(".md,.txt,text/plain,text/markdown");
    if (!f) return false;
    S.handle = null; S.nombre = f.name; S.texto = await f.text();
  }
  recordar();
  return true;
}

async function recargar(host: ToolHost) {
  if (!S.handle) return host.notify(L("Reabre el archivo para actualizarlo", "Reopen the file to refresh it"));
  try { S.texto = await (await S.handle.getFile()).text(); recordar(); } catch { host.notify(L("No se pudo leer el archivo", "Could not read the file")); }
}

// Markdown mínimo a elementos React (sin innerHTML, sin dependencias): títulos, listas, tareas, citas, código, ---, **negrita**, *cursiva*, `código`, [enlaces](url).
// shortcut: sin tablas ni listas anidadas, cuando haga falta más usar una librería.
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\[\[[^\]]+\]\])/g;
function inline(s: string): ReactNode[] {
  return s.split(INLINE).map((t, i) => {
    if (/^\*\*.+\*\*$/.test(t)) return <b key={i}>{t.slice(2, -2)}</b>;
    if (/^(\*.+\*|_.+_)$/.test(t)) return <i key={i}>{t.slice(1, -1)}</i>;
    if (/^`.+`$/.test(t)) return <code key={i}>{t.slice(1, -1)}</code>;
    if (/^\[\[.+\]\]$/.test(t)) return <i key={i}>{t.slice(2, -2).split("|").pop()}</i>;
    const l = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t);
    if (l) return /^(https?:|mailto:)/i.test(l[2]) ? <a key={i} href={l[2]} target="_blank" rel="noreferrer">{l[1]}</a> : <span key={i}>{l[1]}</span>;
    return t;
  });
}
function md(src: string): ReactNode[] {
  const lines = src.replace(/\r\n?/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").split("\n"); // quita el frontmatter YAML
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i], k = out.length;
    let m: RegExpExecArray | null;
    if (/^```/.test(l)) {
      const code: string[] = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
      i++; out.push(<pre key={k}>{code.join("\n")}</pre>);
    } else if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { i++; out.push(<p key={k} className={`h h${m[1].length}`}>{inline(m[2])}</p>); }
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { i++; out.push(<hr key={k} />); }
    else if (/^>/.test(l)) {
      const q: string[] = [];
      for (; i < lines.length && /^>/.test(lines[i]); i++) q.push(lines[i].replace(/^>\s?/, ""));
      out.push(<blockquote key={k}>{inline(q.join(" "))}</blockquote>);
    } else if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
      const ord = /^\s*\d/.test(l), items: ReactNode[] = [];
      for (; i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i]); i++) {
        const t = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ""), c = /^\[([ xX])\]\s+(.*)$/.exec(t);
        items.push(<li key={i}>{c ? <><input type="checkbox" checked={c[1] !== " "} disabled readOnly /> {inline(c[2])}</> : inline(t)}</li>);
      }
      out.push(ord ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>);
    } else if (!l.trim()) i++;
    else {
      const p: string[] = [];
      for (; i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]); i++) p.push(lines[i]);
      out.push(<p key={k}>{inline(p.join(" "))}</p>);
    }
  }
  return out;
}

function Overlay({ host }: { host: ToolHost }) {
  const [, force] = useReducer((x) => x + 1, 0);
  const cambia = (f: () => void | Promise<unknown>) => async () => { await f(); recordar(); force(); };
  if (!S.abierto) {
    return <button className="notas-lat-tab" title={L("Mostrar notas de la historia", "Show story notes")} onClick={cambia(() => { S.abierto = true; })}>📝 {L("Notas", "Notes")}</button>;
  }
  return (
    <aside className="fa-panel notas-lat" aria-label={L("Notas de la historia", "Story notes")} style={{ width: 340 }}>
      <div className="notas-lat-head">
        <b title={S.nombre}>{S.nombre || L("Notas de la historia", "Story notes")}</b>
        <button onClick={cambia(abrir)}>{S.nombre ? L("Cambiar", "Change") : L("Abrir .md / .txt", "Open .md / .txt")}</button>
        {S.nombre && <button title={L("Volver a leer el archivo", "Read the file again")} onClick={cambia(() => recargar(host))}>↻</button>}
        <button title={L("Ocultar", "Hide")} onClick={cambia(() => { S.abierto = false; })}>✕</button>
      </div>
      {S.texto
        ? <div className="notas-lat-texto" tabIndex={0}>{/\.txt$/i.test(S.nombre) ? S.texto : md(S.texto)}</div>
        : <p className="muted">{L("Abre un archivo con tus notas previas para verlo junto al texto.", "Open a file with your earlier notes to see it next to the text.")}</p>}
    </aside>
  );
}

export const notasLaterales: ToolPlugin = { id: "notas-laterales", name: "Notas laterales", Overlay };
