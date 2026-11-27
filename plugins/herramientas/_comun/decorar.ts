// Extensión TipTap que subraya tramos de texto calculados por una función pura (linter, repeticiones...).
// Si un tramo trae `sug` (sustitutos), al hacer clic en él se abre un menú: elegir uno reemplaza el tramo.
// Un sustituto vacío ("") significa quitar el tramo (con su coma/espacio sobrante).
import { L } from "../_comun/idioma.ts";
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ask } from "../../../src/dialog";
import { aprender, propiosDe } from "./sinonimos";

// `learn`: palabra a la que el usuario puede enseñar sinónimos desde el menú (también cuando no hay ninguno).
// `lazy`: sustitutos que se calculan solo al abrir el menú (caro de hacer para todos los tramos; puede ser asíncrono). `accion`: botón extra del menú (ej. añadir al diccionario).
export interface Span { from: number; to: number; class: string; title?: string; sug?: string[]; learn?: string; lazy?: () => string[] | Promise<string[]>; accion?: { label: string; run: () => void } }

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

async function menu(view: EditorView, d: Decoration, key: PluginKey) {
  cerrar();
  const { sug: fijos, msg, learn, lazy, accion } = d.spec as { sug: string[]; msg?: string; learn?: string; lazy?: Span["lazy"]; accion?: Span["accion"] };
  const sug = lazy ? await lazy() : fijos;
  if (view.isDestroyed) return;
  const el = document.createElement("div");
  el.className = "sug-menu";
  el.setAttribute("role", "menu");
  if (msg) { const p = document.createElement("p"); p.textContent = msg; el.appendChild(p); }
  for (const s of sug) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.textContent = s || L("Quitar", "Remove");
    if (!s) b.className = "quitar";
    b.onclick = () => { cerrar(); reemplazar(view, d.from, d.to, s); };
    el.appendChild(b);
  }
  if (accion) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "quitar";
    b.textContent = accion.label;
    b.onclick = () => { cerrar(); accion.run(); view.dispatch(view.state.tr.setMeta(key, true)); view.focus(); };
    el.appendChild(b);
  }
  if (learn) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "quitar";
    b.textContent = L("＋ Añadir sinónimos…", "＋ Add synonyms…");
    b.onclick = async () => {
      cerrar();
      const t = await ask(L(`Sinónimos de «${learn}» (separados por coma; vacío = borrar los tuyos)`, `Synonyms of “${learn}” (comma separated; empty = delete yours)`), propiosDe(learn).join(", "));
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

// `listo`: promesa (ej. carga de un diccionario) tras la cual hay que recalcular los subrayados.
// `suscribir`: para fuentes asíncronas que van sabiendo más (corrector en un worker): llaman a `refrescar` y se redibuja; devuelve cómo darse de baja.
export const decorar = (name: string, spans: (text: string, previo: string) => Span[], listo?: Promise<unknown>, suscribir?: (refrescar: () => void) => () => void) =>
  Extension.create({
    name,
    addProseMirrorPlugins() {
      const key = new PluginKey<DecorationSet>(name);
      // Recalcula los párrafos que tocan [from, to] y el siguiente a cada uno (depende de `previo`); el resto se reaprovecha.
      // Sin rango, todo el documento. Así escribir en un capítulo largo no recalcula el capítulo entero en cada tecla.
      const build = (doc: PMNode, old?: DecorationSet, from = -Infinity, to = Infinity) => {
        const add: Decoration[] = [], quitar: Decoration[] = [];
        let previo = ""; // texto del párrafo anterior: permite detectar repeticiones entre párrafos
        let anterior = false; // el párrafo anterior se recalculó
        doc.descendants((node, pos) => {
          if (!node.isTextblock) return true;
          const text = node.textBetween(0, node.content.size, undefined, "￼");
          const end = pos + node.nodeSize;
          const toca = (pos <= to && end >= from) || anterior;
          anterior = pos <= to && end >= from;
          if (toca) {
            if (old) quitar.push(...old.find(pos + 1, end - 1));
            for (const s of spans(text, previo)) {
              const act = !!(s.sug?.length || s.learn || s.lazy || s.accion);
              add.push(Decoration.inline(pos + 1 + s.from, pos + 1 + s.to, { class: s.class + (act ? " sug" : ""), ...(s.title ? { title: s.title } : {}) }, act ? { sug: s.sug ?? [], msg: s.title, learn: s.learn, lazy: s.lazy, accion: s.accion } : {}));
            }
          }
          previo = text;
          return false;
        });
        return old ? old.remove(quitar).add(doc, add) : DecorationSet.create(doc, add);
      };
      return [new Plugin({
        key,
        state: {
          init: (_, s) => build(s.doc),
          apply: (tr, old) => {
            if (tr.getMeta(key)) return build(tr.doc);
            if (!tr.docChanged) return old;
            let from = Infinity, to = -Infinity; // zona cambiada, en posiciones del documento nuevo
            tr.mapping.maps.forEach((m, i) => m.forEach((_a, _b, ini, fin) => {
              const resto = tr.mapping.slice(i + 1);
              from = Math.min(from, resto.map(ini, -1));
              to = Math.max(to, resto.map(fin, 1));
            }));
            return from > to ? build(tr.doc) : build(tr.doc, old.map(tr.mapping, tr.doc), from, to);
          },
        },
        view: (v) => {
          const refrescar = () => { if (!v.isDestroyed) v.dispatch(v.state.tr.setMeta(key, true)); };
          listo?.then(refrescar, () => {});
          return { destroy: suscribir?.(refrescar) };
        },
        props: {
          decorations: (s) => key.getState(s),
          handleClick(view, pos) {
            const d = key.getState(view.state)?.find(pos, pos).find((x) => (x.spec as any).sug && x.from < pos + 1 && x.to >= pos);
            if (d) void menu(view, d, key);
            else cerrar();
            return false;
          },
        },
      })];
    },
  });
