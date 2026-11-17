// Utilidades puras de texto sobre el HTML de las escenas (sin dependencias).
const dec = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Párrafos de texto plano (p, h1-6, li, blockquote).
export const paras = (html = ""): string[] =>
  [...html.matchAll(/<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => dec(m[2].replace(/<[^>]+>/g, "")).trim()).filter(Boolean);
export const plain = (html = "") => paras(html).join(" ");
