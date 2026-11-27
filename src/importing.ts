// Archivo › Importar desde: Markdown, texto o Word. La lectura del documento (pura) está en importar.ts.
import { strFromU8, unzipSync } from "fflate";
import { Node, Project, firstScene, newNode, snapshot } from "./tree";
import { confirmAsk } from "./dialog";
import { t } from "./i18n";
import { Bloque, Est, docxBloques, estructura, mdBloques } from "./importar";
import { elegir } from "../plugins/herramientas/_comun/guardar";

export type ImportKind = "md" | "docx";
interface Destino { project: Project; setProject: (f: (p: Project) => Project) => void; openScene: (id: string) => void; notify: (msg: string) => void }

const aNodo = (e: Est): Node => ({ ...newNode(e.tipo, 0), title: e.titulo, content: e.tipo === "chapter" ? e.html : undefined, children: e.hijos.map(aNodo) });

// Reemplaza el libro desde la raíz con la estructura que traiga el documento (partes y capítulos con su texto).
// Título del libro = nombre del archivo. Antes se guarda una copia; las fichas se conservan.
async function anadir(host: Destino, nombre: string, bloques: Bloque[]) {
  const titulo = nombre.replace(/\.[^.]+$/, "");
  const lista = estructura(bloques, titulo);
  if (!lista.length) return host.notify(t("imp.empty"));
  const raiz = host.project.book;
  if (raiz.kind === "script") return host.notify(t("imp.script"));
  const enSaga = raiz.kind !== "book"; // en una saga/universo el archivo entra como libro nuevo; no se pisa nada
  if (!(await confirmAsk(enSaga ? t("imp.askAdd", { n: nombre, r: raiz.title }) : t("imp.askReplace", { n: nombre })))) return;
  const children = lista.map(aNodo);
  const libro: Node = { ...newNode("book", 0), title: titulo, children };
  host.setProject((p) => ({ ...snapshot(p, t("snap.beforeImport"), true), book: enSaga ? { ...p.book, children: [...p.book.children, libro] } : { ...p.book, title: titulo, children } }));
  const first = children.map(firstScene).find(Boolean);
  if (first) host.openScene(first.id);
  host.notify(enSaga ? t("imp.added", { n: titulo }) : t("imp.replaced", { n: nombre }));
}

export async function importDoc(kind: ImportKind, host: Destino) {
  const f = await elegir(kind === "md" ? ".md,.markdown,.txt" : ".docx");
  if (!f) return;
  let bloques: Bloque[];
  try {
    bloques = kind === "md" ? mdBloques(await f.text()) : docxBloques(strFromU8(unzipSync(new Uint8Array(await f.arrayBuffer()))["word/document.xml"]));
  } catch { return host.notify(t("imp.bad")); }
  await anadir(host, f.name, bloques);
}
