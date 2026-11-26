// Utilidades puras de texto sobre el HTML de las escenas (sin dependencias).
// Las reglas de estilo, repeticiones y diálogo son de español: con un libro en otro idioma no se activan.
export const enEspanol = (h: { bookLang?: string }) => /^es(-|$)/i.test(h.bookLang ?? "es");
const dec = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Párrafos de texto plano (p, h1-6, li, blockquote). Con `sep`, cada <hr> (cambio de escena dentro de un capítulo) sale como ese texto.
export const paras = (html = "", sep?: string): string[] =>
  [...html.matchAll(/<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<hr\b[^>]*>/gi)].map((m) => (m[1] ? dec(m[2].replace(/<[^>]+>/g, "")).trim() : sep ?? "")).filter(Boolean);
export const plain = (html = "") => paras(html).join(" ");
