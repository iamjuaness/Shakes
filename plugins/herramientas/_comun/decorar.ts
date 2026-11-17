// Extensión TipTap que subraya tramos de texto calculados por una función pura (linter, repeticiones...).
// Si un tramo trae `sug` (sustitutos), al hacer clic en él se abre un menú: elegir uno reemplaza el tramo.
// Un sustituto vacío ("") significa quitar el tramo (con su coma/espacio sobrante).
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ask } from "../../../src/dialog";
import { aprender, propiosDe } from "./sinonimos";

// `learn`: palabra a la que el usuario puede enseñar sinónimos desde el menú (también cuando no hay ninguno).
export interface Span { from: number; to: number; class: string; title?: string; sug?: string[]; learn?: string }

const mayus = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Cambia el tramo [from,to] por `rep`. Al quitar, también se va la coma o el espacio que sobre y la frase sigue con mayúscula si hacía falta.
export function reemplazar(view: EditorView, from: number, to: number, rep: string) {
  const doc = view.state.doc;
  const $from = doc.resolve(from);
  const ini = $from.start(), fin = $from.end();
  const txt = (a: number, b: number) => doc.textBetween(Math.max(ini, a), Math.min(fin, b), undefined, "￼");
  const orig = txt(from, to);
  const tr = view.state.tr;
  if (rep) {
    const r = orig && orig[0] !== orig[0].toLowerCase() && !/^\p{Lu}/u.test(rep) ? mayus(rep) : rep;
    tr.insertText(r, from, to);
  } else {
    let a = from, b = to, sigue = "";
    if (txt(b, b + 1) === ",") b++; // «Digamos, fui» -> «fui»
    if (txt(b, b + 1) === " " && (a === ini || txt(a - 1, a) === " ")) b++;
    else if (txt(a - 1, a) === " " && /^[.,;:!?)»”…]|^$/.test(txt(b, b + 1))) a--;
    if (orig && orig[0] !== orig[0].toLowerCase() && (a === ini || /[.!?…]\s*$/.test(txt(ini, a)))) sigue = txt(b, b + 1);
    if (sigue) { tr.insertText(mayus(sigue), a, b + 1); } else tr.delete(a, b);
  }
  view.dispatch(tr);
  view.focus();
}

// Menú flotante de sustitutos (DOM simple, un solo menú a la vez).
let abierto: HTMLElement | null = null;
const cerrar = () => { abierto?.remove(); abierto = null; document.removeEventListener("mousedown", fuera, true); document.removeEventListener("keydown", tecla, true); };
const fuera = (e: Event) => { if (abierto && !abierto.contains(e.target as Node)) cerrar(); };
const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };

function menu(view: EditorView, d: Decoration, key: PluginKey) {
  cerrar();
  const { sug, msg, learn } = d.spec as { sug: string[]; msg?: string; learn?: string };
  const el = document.createElement("div");
  el.className = "sug-menu";
  el.setAttribute("role", "menu");
  if (msg) { const p = document.createElement("p"); p.textContent = msg; el.appendChild(p); }
  for (const s of sug) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.textContent = s || "Quitar";
    if (!s) b.className = "quitar";
    b.onclick = () => { cerrar(); reemplazar(view, d.from, d.to, s); };
    el.appendChild(b);
  }
  if (learn) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "quitar";
    b.textContent = "＋ Añadir sinónimos…";
    b.onclick = async () => {
      cerrar();
      const t = await ask(`Sinónimos de «${learn}» (separados por coma; vacío = borrar los tuyos)`, propiosDe(learn).join(", "));
      if (t === null || t === undefined) return;
      aprender(learn, t.split(","));
      view.dispatch(view.state.tr.setMeta(key, true)); // recalcula los subrayados
    };
    el.appendChild(b);
  }
  const c = view.coordsAtPos(d.from);
  el.style.left = Math.min(c.left, window.innerWidth - 260) + "px";
  el.style.top = c.bottom + 4 + "px";
  document.body.appendChild(el);
  abierto = el;
  setTimeout(() => { document.addEventListener("mousedown", fuera, true); document.addEventListener("keydown", tecla, true); }, 0);
}

export const decorar = (name: string, spans: (text: string, previo: string) => Span[]) =>
  Extension.create({
    name,
    addProseMirrorPlugins() {
      const key = new PluginKey<DecorationSet>(name);
      const build = (doc: PMNode) => {
        const decos: Decoration[] = [];
        let previo = ""; // texto del párrafo anterior: permite detectar repeticiones entre párrafos
        doc.descendants((node, pos) => {
          if (!node.isTextblock) return true;
          const text = node.textBetween(0, node.content.size, undefined, "￼");
          for (const s of spans(text, previo)) {
            const act = !!(s.sug?.length || s.learn);
            decos.push(Decoration.inline(pos + 1 + s.from, pos + 1 + s.to, { class: s.class + (act ? " sug" : ""), ...(s.title ? { title: s.title } : {}) }, act ? { sug: s.sug ?? [], msg: s.title, learn: s.learn } : {}));
          }
          previo = text;
          return false;
        });
        return DecorationSet.create(doc, decos);
      };
      return [new Plugin({
        key,
        state: { init: (_, s) => build(s.doc), apply: (tr, old) => (tr.docChanged || tr.getMeta(key) ? build(tr.doc) : old) },
        props: {
          decorations: (s) => key.getState(s),
          handleClick(view, pos) {
            const d = key.getState(view.state)?.find(pos, pos).find((x) => (x.spec as any).sug && x.from < pos + 1 && x.to >= pos);
            if (d) menu(view, d, key);
            else cerrar();
            return false;
          },
        },
      })];
    },
  });
