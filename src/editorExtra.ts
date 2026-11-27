// Notas al pie, imágenes y tablas dentro del texto. El HTML que guardan es el que leen los exportadores (export.ts).
import { Extension, Node, mergeAttributes } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { addColumnAfter, addRowAfter, deleteColumn, deleteRow, deleteTable, goToNextCell, tableEditing } from "@tiptap/pm/tables";
import { ask, choose } from "./dialog";
import { elegirImagen } from "./imagen";
import { textoNota } from "./tree";
import { t } from "./i18n";

// Clic (o Intro con el elemento seleccionado) abre sus opciones.
const alAbrir = (nombre: string, abrir: (editor: Editor, pos: number) => void) => ({
  plugin: (editor: Editor) => new Plugin({ props: { handleClickOn: (_v, _p, nodo, pos, _e, directo) => { if (directo && nodo.type.name === nombre) { abrir(editor, pos); return true; } return false; } } }),
  intro: (editor: Editor) => {
    const s = editor.state.selection;
    if (!(s instanceof NodeSelection) || s.node.type.name !== nombre) return false;
    abrir(editor, s.from);
    return true;
  },
});
const cambiar = (editor: Editor, pos: number, attrs: object) => editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...editor.state.doc.nodeAt(pos)!.attrs, ...attrs }));
const quitar = (editor: Editor, pos: number) => editor.view.dispatch(editor.state.tr.delete(pos, pos + editor.state.doc.nodeAt(pos)!.nodeSize));

const nota = alAbrir("pie", async (editor, pos) => {
  const x = await ask(t("nota.editar"), editor.state.doc.nodeAt(pos)?.attrs.texto ?? "");
  if (x === null || editor.isDestroyed) return;
  if (x.trim()) cambiar(editor, pos, { texto: x.trim() });
  else quitar(editor, pos);
  editor.commands.focus();
});
export const Nota = Node.create({
  name: "pie", group: "inline", inline: true, atom: true, // «nota» ya es la marca de las notas al margen
  addAttributes: () => ({ texto: { default: "", parseHTML: (el) => textoNota(el.getAttribute("data-pie") ?? ""), renderHTML: (a) => ({ "data-pie": encodeURIComponent(a.texto) }) } }),
  parseHTML: () => [{ tag: "span[data-pie]" }],
  renderHTML: ({ node, HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { title: node.attrs.texto })],
  addProseMirrorPlugins() { return [nota.plugin(this.editor)]; },
  addKeyboardShortcuts() { return { Enter: () => nota.intro(this.editor) }; },
});

const limpio = (s: string) => s.replace(/[<>]/g, ""); // la descripción va en un atributo HTML

const imagen = alAbrir("imagen", async (editor, pos) => {
  const anchos = [100, 75, 50, 33];
  const i = await choose(t("img.opciones"), [...anchos.map((n) => t("img.ancho", { n })), t("img.alt"), t("img.quitar")]);
  if (i === null || editor.isDestroyed) return;
  if (i < anchos.length) cambiar(editor, pos, { ancho: anchos[i] });
  else if (i === anchos.length) { const alt = await ask(t("img.altAsk"), editor.state.doc.nodeAt(pos)?.attrs.alt ?? ""); if (alt !== null) cambiar(editor, pos, { alt: limpio(alt) }); }
  else quitar(editor, pos);
  editor.commands.focus();
});
const dato = (nombre: string, html: string, def: number) => ({ default: def, parseHTML: (el: HTMLElement) => Number(el.getAttribute(html)) || def, renderHTML: (a: Record<string, any>) => ({ [html]: a[nombre] }) });
export const Imagen = Node.create({
  name: "imagen", group: "block", atom: true, draggable: true,
  addAttributes: () => ({ src: { default: "" }, alt: { default: "" }, w: dato("w", "data-w", 600), h: dato("h", "data-h", 400), ancho: dato("ancho", "data-ancho", 100) }),
  parseHTML: () => [{ tag: 'img[src^="data:image/jpeg"]' }], // solo las que guarda Shakes (nada remoto)
  renderHTML: ({ node, HTMLAttributes }) => ["img", mergeAttributes(HTMLAttributes, { style: `width:${node.attrs.ancho}%` })],
  addProseMirrorPlugins() { return [imagen.plugin(this.editor)]; },
  addKeyboardShortcuts() { return { Enter: () => imagen.intro(this.editor) }; },
});

const celda = (name: string, tag: "td" | "th") => Node.create({
  name, content: "paragraph+", isolating: true,
  addAttributes: () => ({ colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null, rendered: false } }),
  parseHTML: () => [{ tag }],
  renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0],
});
const Fila = Node.create({ name: "tableRow", content: "(tableCell | tableHeader)*", parseHTML: () => [{ tag: "tr" }], renderHTML: () => ["tr", 0] });
const Tabla = Node.create({
  name: "table", group: "block", content: "tableRow+", isolating: true,
  parseHTML: () => [{ tag: "table" }],
  renderHTML: () => ["table", ["tbody", 0]],
  addProseMirrorPlugins: () => [tableEditing()],
  addKeyboardShortcuts() {
    const ir = (d: 1 | -1) => goToNextCell(d)(this.editor.state, this.editor.view.dispatch);
    return {
      Tab: () => ir(1) || (this.editor.isActive("table") && filaTabla(this.editor, "mas") && ir(1)),
      "Shift-Tab": () => ir(-1),
    };
  },
});
const Papeles = Extension.create({
  name: "papelesDeTabla",
  extendNodeSchema: (ext) => {
    const tableRole = ({ table: "table", tableRow: "row", tableCell: "cell", tableHeader: "header_cell" } as Record<string, string>)[ext.name];
    return tableRole ? { tableRole } : {};
  },
});

export const EXTRAS = [Nota, Imagen, Tabla, Fila, celda("tableCell", "td"), celda("tableHeader", "th"), Papeles];

// Subraya en el texto lo que tiene comentarios pendientes.
export const comentariosEnTexto = (lista: () => { cita: string; texto: string; autor: string }[]) => Extension.create({
  name: "comentarios",
  addProseMirrorPlugins: () => [new Plugin({ props: { decorations: (s) => {
    const pendientes = lista();
    if (!pendientes.length) return null;
    const marcas: Decoration[] = [];
    s.doc.descendants((n, pos) => {
      if (!n.isTextblock) return true;
      const texto = n.textBetween(0, n.content.size, undefined, "\ufffc");
      for (const c of pendientes) {
        const i = c.cita ? texto.indexOf(c.cita) : -1;
        if (i >= 0) marcas.push(Decoration.inline(pos + 1 + i, pos + 1 + i + c.cita.length, { class: "comentario", title: `${c.autor ? c.autor + ": " : ""}${c.texto}` }));
      }
      return false;
    });
    return DecorationSet.create(s.doc, marcas);
  } } })],
});
// Comentario sobre lo seleccionado (lo que quede dentro del primer párrafo).
export async function comentarSeleccion(editor: Editor, anadir: (cita: string, texto: string) => void, aviso: (m: string) => void) {
  const { $from, from, to } = editor.state.selection;
  const cita = editor.state.doc.textBetween(from, Math.min(to, $from.end()), undefined, "\ufffc").trim();
  if (!cita) return aviso(t("com.selecciona"));
  const texto = await ask(t("com.ask", { c: cita.slice(0, 60) }));
  if (texto?.trim()) anadir(cita, texto.trim());
}

// ---------- Acciones de la barra de formato ----------
export async function insertarNota(editor: Editor) {
  const x = await ask(t("nota.ask"));
  // la llamada va detrás de lo seleccionado, sin reemplazarlo
  if (x?.trim() && !editor.isDestroyed) editor.chain().focus().insertContentAt(editor.state.selection.to, { type: "pie", attrs: { texto: x.trim() } }).run();
}
export async function insertarImagen(editor: Editor, error: (m: string) => void) {
  try {
    const r = await elegirImagen(1600);
    if (!r || editor.isDestroyed) return;
    const alt = await ask(t("img.altAsk"), r.nombre);
    editor.chain().focus().insertContent({ type: "imagen", attrs: { src: r.url, alt: limpio(alt ?? r.nombre), w: r.w, h: r.h, ancho: 100 } }).run();
  } catch { error(t("img.bad")); }
}
export function insertarTabla(editor: Editor) {
  const fila = (tipo: string) => ({ type: "tableRow", content: Array.from({ length: 3 }, () => ({ type: tipo, content: [{ type: "paragraph" }] })) });
  editor.chain().focus().insertContent({ type: "table", content: [fila("tableHeader"), fila("tableCell"), fila("tableCell")] }).run();
}
const ORDENES = { mas: addRowAfter, menos: deleteRow, masCol: addColumnAfter, menosCol: deleteColumn, quitar: deleteTable };
export function filaTabla(editor: Editor, que: keyof typeof ORDENES) {
  const ok = ORDENES[que](editor.state, editor.view.dispatch);
  editor.view.focus();
  return ok;
}
