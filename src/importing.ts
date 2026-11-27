// Archivo › Importar desde: Markdown, texto o Word. La lectura del documento (pura) está en importar.ts.
import { strFromU8, unzipSync } from "fflate";
import { Node, Project, firstScene, newNode, snapshot } from "./tree";
import { confirmAsk } from "./dialog";
import { t } from "./i18n";
import { Bloque, Est, docxBloques, docxComentarios, estructura, mdBloques } from "./importar";
import { normalize } from "./tree";
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

function leerDocx(datos: Uint8Array) {
  const z = unzipSync(datos), leer = (n: string) => (z[n] ? strFromU8(z[n]) : undefined);
  const doc = leer("word/document.xml")!;
  return { bloques: docxBloques(doc, leer("word/footnotes.xml")), comentarios: docxComentarios(doc, leer("word/comments.xml")) };
}

// Lo que devuelve un lector (.shks, .docx, .md o .txt) como árbol de capítulos, para revisarlo cambio a cambio.
export async function leerParaRevisar() {
  const f = await elegir(".shks,.shakes,.docx,.md,.markdown,.txt");
  if (!f) return null;
  const nombre = f.name;
  if (/\.(shks|shakes)$/i.test(nombre)) return { nombre, libro: normalize(JSON.parse(await f.text())).book, comentarios: [], sinTablas: false };
  const docx = /\.docx$/i.test(nombre) ? leerDocx(new Uint8Array(await f.arrayBuffer())) : null;
  const hijos = estructura(docx ? docx.bloques : mdBloques(await f.text()), nombre.replace(/\.[^.]+$/, "")).map(aNodo);
  if (!hijos.length) throw new Error("vacío");
  return { nombre, libro: { ...newNode("book", 0), children: hijos } as Node, comentarios: docx?.comentarios ?? [], sinTablas: true };
}

export async function importDoc(kind: ImportKind, host: Destino) {
  const f = await elegir(kind === "md" ? ".md,.markdown,.txt" : ".docx");
  if (!f) return;
  let bloques: Bloque[];
  try {
    bloques = kind === "md" ? mdBloques(await f.text()) : leerDocx(new Uint8Array(await f.arrayBuffer())).bloques;
  } catch { return host.notify(t("imp.bad")); }
  await anadir(host, f.name, bloques);
}
