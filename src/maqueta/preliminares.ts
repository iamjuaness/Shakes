// Preliminares y finales de un libro (anteportada, portada, créditos, dedicatoria, epígrafe, agradecimientos y
// biografía). Una sola fuente para el PDF, Word y EPUB: los tres sacan lo mismo.
import type { Node } from "../tree.ts";
import type { Ajustes } from "./ajustes.ts";

export const rotulos = (lang: string) => /^en/i.test(lang)
  ? { cap: "Chapter", indice: "Contents", gracias: "Acknowledgements", autor: "About the author", por: "by", palabras: "words", derechos: "All rights reserved. No part of this publication may be reproduced without the author's permission.", isbn: "ISBN", portada: "Title page", creditos: "Copyright", dedicatoria: "Dedication", epigrafe: "Epigraph", notas: "Notes" }
  : { cap: "Capítulo", indice: "Índice", gracias: "Agradecimientos", autor: "Sobre el autor", por: "por", palabras: "palabras", derechos: "Todos los derechos reservados. Queda prohibida la reproducción total o parcial de esta obra sin permiso del autor.", isbn: "ISBN", portada: "Portada", creditos: "Créditos", dedicatoria: "Dedicatoria", epigrafe: "Epígrafe", notas: "Notas" };

// Líneas de la página de créditos; las vacías separan bloques.
export function creditos(obra: Node, a: Ajustes, lang: string): string[] {
  const L = rotulos(lang);
  const t = a.textoCreditos.trim() || [`© ${[obra.meta?.year, obra.meta?.author].filter(Boolean).join(" ")}`, "", L.derechos].join("\n");
  return (a.isbn ? `${t}\n\n${L.isbn}: ${a.isbn}` : t).split("\n");
}

// Secciones finales con texto, en párrafos.
export function finales(a: Ajustes, lang: string): { titulo: string; parrafos: string[] }[] {
  const L = rotulos(lang);
  return [[L.gracias, a.agradecimientos], [L.autor, a.sobreAutor]]
    .filter(([, t]) => t.trim())
    .map(([titulo, t]) => ({ titulo, parrafos: t.split(/\n+/).map((p) => p.trim()).filter(Boolean) }));
}

export interface Preliminar { id: "anteportada" | "portada" | "creditos" | "dedicatoria" | "epigrafe"; titulo: string; lineas: { s: string; como?: "titulo" | "subtitulo" | "autor" | "sello" | "cursiva" | "pequeno" }[] }
// Lo que va antes del texto en Word y EPUB (el PDF coloca estas mismas piezas en sus páginas).
export function preliminares(obra: Node, a: Ajustes, lang: string): Preliminar[] {
  const L = rotulos(lang), autor = obra.meta?.author ?? "";
  const out: Preliminar[] = [];
  if (a.anteportada) out.push({ id: "anteportada", titulo: obra.title, lineas: [{ s: obra.title, como: "subtitulo" }] });
  if (a.portada) out.push({ id: "portada", titulo: L.portada, lineas: [
    { s: obra.title, como: "titulo" },
    ...(a.subtitulo ? [{ s: a.subtitulo, como: "subtitulo" as const }] : []),
    ...(autor ? [{ s: autor, como: "autor" as const }] : []),
    ...(a.editorial ? [{ s: a.editorial, como: "sello" as const }] : []),
  ] });
  if (a.creditos) out.push({ id: "creditos", titulo: L.creditos, lineas: creditos(obra, a, lang).map((s) => ({ s, como: "pequeno" })) });
  if (a.dedicatoria.trim()) out.push({ id: "dedicatoria", titulo: L.dedicatoria, lineas: a.dedicatoria.trim().split("\n").map((s) => ({ s, como: "cursiva" })) });
  if (a.epigrafe.trim()) out.push({ id: "epigrafe", titulo: L.epigrafe, lineas: a.epigrafe.trim().split("\n").map((s) => ({ s, como: "cursiva" })) });
  return out;
}
