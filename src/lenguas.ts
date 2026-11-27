// Idiomas en los que se puede escribir una obra y su nombre. Aparte del corrector para que la pantalla de inicio
// no cargue el editor.
import { getLang } from "./i18n";

export const SPELL_LANGS = ("bg br ca ca-valencia cs cy da de de-AT de-CH el el-polyton en en-AU en-CA en-GB en-ZA eo es es-AR es-BO es-CL es-CO es-CR es-CU es-DO es-EC es-GT es-HN es-MX es-NI es-PA es-PE es-PH es-PR es-PY es-SV es-US es-UY es-VE et eu fa fo fr fur fy ga gd gl he hr hu hy hyw ia ie is it ka ko la lb lt ltg lv mk mn nb nds ne nl nn oc pl pt pt-PT ro ru rw sk sl sr sr-Latn sv sv-FI tk tr uk vi").split(" ");

// Nombre del idioma en el idioma de la interfaz («francés», «French»). Intl no conoce bien estos: [es, en].
const NOMBRES: Record<string, [string, string]> = { "ca-valencia": ["Valenciano", "Valencian"], "el-polyton": ["Griego politónico", "Polytonic Greek"], fur: ["Friulano", "Friulian"], hyw: ["Armenio occidental", "Western Armenian"], ie: ["Interlingue", "Interlingue"], ltg: ["Latgaliano", "Latgalian"], nds: ["Bajo alemán", "Low German"] };
export function langName(code: string): string {
  if (NOMBRES[code]) return NOMBRES[code][getLang() === "en" ? 1 : 0];
  try { const n = new Intl.DisplayNames([getLang()], { type: "language" }).of(code); return n ? n[0].toUpperCase() + n.slice(1) : code; } catch { return code; }
}
