import { unzipSync, strFromU8 } from "fflate";
import { Node, newNode, snapshot } from "../../../src/tree";
import { confirmAsk } from "../../../src/dialog";
import { elegir } from "../_comun/guardar";
import type { ToolHost, ToolPlugin } from "../types";
import { Bloque, Est, docxBloques, estructura, mdBloques } from "./importar";

// Reemplaza el libro desde la raíz con la estructura que traiga el documento (partes, capítulos, escenas).
// Título del libro = nombre del archivo. Antes se guarda una copia («Antes de importar»); las fichas se conservan.
const aNodo = (e: Est): Node => ({ ...newNode(e.tipo, 0), title: e.titulo, content: e.tipo === "scene" ? e.html : undefined, children: e.hijos.map(aNodo) });
const primeraEscena = (n: Node): Node | undefined => (n.kind === "scene" ? n : n.children.map(primeraEscena).find(Boolean));

async function anadir(host: ToolHost, nombre: string, bloques: Bloque[]) {
  const titulo = nombre.replace(/\.[^.]+$/, "");
  const lista = estructura(bloques, titulo);
  if (!lista.length) return host.notify("⚠ El archivo no tiene texto.");
  const raiz = host.project.book;
  const enSaga = raiz.kind !== "book"; // en una saga/universo el archivo entra como libro nuevo; no se pisa nada
  if (!(await confirmAsk(enSaga ? `¿Añadir «${nombre}» como libro nuevo de «${raiz.title}»?` : `¿Reemplazar todo el libro por «${nombre}»? Antes se guarda una copia en Versiones.`))) return;
  const children = lista.map(aNodo);
  const libro: Node = { ...newNode("book", 0), title: titulo, children };
  host.setProject((p) => ({ ...snapshot(p, "Antes de importar", true), book: enSaga ? { ...p.book, children: [...p.book.children, libro] } : { ...p.book, title: titulo, children } }));
  const first = children.map(primeraEscena).find(Boolean);
  if (first) host.openScene(first.id);
  host.notify(enSaga ? `Libro «${titulo}» añadido` : `Libro reemplazado con la estructura de ${nombre}`);
}

export const importar: ToolPlugin = {
  id: "importar",
  name: "Importar",
  actions: [
    {
      label: "Importar Markdown / texto…",
      async run(host) {
        const f = await elegir(".md,.markdown,.txt");
        if (f) await anadir(host, f.name, mdBloques(await f.text()));
      },
    },
    {
      label: "Importar Word (.docx)…",
      async run(host) {
        const f = await elegir(".docx");
        if (!f) return;
        try {
          // fflate lo presta Shakes (import estático: un import() dinámico no funciona en plugins externos)
          const xml = unzipSync(new Uint8Array(await f.arrayBuffer()))["word/document.xml"];
          await anadir(host, f.name, docxBloques(strFromU8(xml)));
        } catch { host.notify("⚠ No se pudo leer el .docx."); }
      },
    },
  ],
};
