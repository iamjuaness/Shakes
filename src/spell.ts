// Corrector ortográfico del núcleo, en el idioma de la obra (Project.lang), no en el de la interfaz.
// Diccionarios Hunspell de los paquetes dictionary-<código> (wooorm/dictionaries): español e inglés van dentro de la app;
// los demás se bajan de jsDelivr la primera vez y se guardan en IndexedDB (después funciona sin conexión).
// El diccionario se compila y consulta en un Web Worker (spellWorker.ts): la interfaz no se congela.
import { decorar } from "../plugins/herramientas/_comun/decorar";
import { fallos, palabrasDe } from "../plugins/herramientas/ortografia/revisar";
import { idbGet, idbSet } from "./store";
import { namesOf, type Card } from "./tree";
import { getLang, t } from "./i18n";
import esAff from "../node_modules/dictionary-es/index.aff?url";
import esDic from "../node_modules/dictionary-es/index.dic?url";
import enAff from "../node_modules/dictionary-en/index.aff?url";
import enDic from "../node_modules/dictionary-en/index.dic?url";

export const SPELL_LANGS = ("bg br ca ca-valencia cs cy da de de-AT de-CH el el-polyton en en-AU en-CA en-GB en-ZA eo es es-AR es-BO es-CL es-CO es-CR es-CU es-DO es-EC es-GT es-HN es-MX es-NI es-PA es-PE es-PH es-PR es-PY es-SV es-US es-UY es-VE et eu fa fo fr fur fy ga gd gl he hr hu hy hyw ia ie is it ka ko la lb lt ltg lv mk mn nb nds ne nl nn oc pl pt pt-PT ro ru rw sk sl sr sr-Latn sv sv-FI tk tr uk vi").split(" ");

// Nombre del idioma en el idioma de la interfaz («francés», «French»). Intl no conoce bien estos: [es, en].
const NOMBRES: Record<string, [string, string]> = { "ca-valencia": ["Valenciano", "Valencian"], "el-polyton": ["Griego politónico", "Polytonic Greek"], fur: ["Friulano", "Friulian"], hyw: ["Armenio occidental", "Western Armenian"], ie: ["Interlingue", "Interlingue"], ltg: ["Latgaliano", "Latgalian"], nds: ["Bajo alemán", "Low German"] };
export function langName(code: string): string {
  if (NOMBRES[code]) return NOMBRES[code][getLang() === "en" ? 1 : 0];
  try { const n = new Intl.DisplayNames([getLang()], { type: "language" }).of(code); return n ? n[0].toUpperCase() + n.slice(1) : code; } catch { return code; }
}

const LOCAL: Record<string, string[]> = { es: [esAff, esDic], en: [enAff, enDic] };
const texto = (u: string) => fetch(u).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
async function diccionario(code: string): Promise<string[]> {
  if (LOCAL[code]) return Promise.all(LOCAL[code].map(texto));
  const key = "dic:" + code;
  const hit = await idbGet<string[]>(key).catch(() => undefined);
  if (hit) return hit;
  const base = `https://cdn.jsdelivr.net/npm/dictionary-${code.toLowerCase()}/index.`;
  const r = await Promise.all([texto(base + "aff"), texto(base + "dic")]);
  idbSet(key, r).catch(() => {}); // sin almacenamiento: se vuelve a bajar la próxima vez
  return r;
}

// Corrector de un idioma en su worker. `correct` es síncrono (lo exige el subrayado): responde con lo que ya sabe y
// pregunta al worker las palabras nuevas en lote; cuando hay respuestas con errores avisa a `oyentes` para redibujar.
class Remoto {
  private w = new Worker(new URL("./spellWorker.ts", import.meta.url), { type: "module" });
  private cache = new Map<string, boolean>();
  private pend = new Set<string>();
  private sugs = new Map<number, (s: string[]) => void>();
  private n = 0;
  private timer = 0;
  oyentes = new Set<() => void>();
  listo: Promise<void>;
  constructor(aff: string, dic: string) {
    this.listo = new Promise((ok, mal) => {
      this.w.onmessage = (e) => {
        const m = e.data;
        if (m.t === "ready") ok();
        else if (m.t === "error") { if (m.id !== undefined) this.sugs.get(m.id)?.([]); else mal(new Error(m.e)); }
        else if (m.t === "check") {
          let malas = false;
          m.words.forEach((w: string, i: number) => { this.cache.set(w, m.ok[i]); if (!m.ok[i]) malas = true; });
          if (malas) this.oyentes.forEach((f) => f());
        } else if (m.t === "suggest") { this.sugs.get(m.id)?.(m.sug); this.sugs.delete(m.id); }
      };
      this.w.onerror = (e) => mal(e);
    });
    this.w.postMessage({ t: "load", aff, dic });
  }
  correct(w: string): boolean {
    const c = this.cache.get(w);
    if (c !== undefined) return c;
    this.pend.add(w);
    this.timer ||= setTimeout(() => { this.timer = 0; this.w.postMessage({ t: "check", words: [...this.pend] }); this.pend.clear(); }) as unknown as number;
    return true; // mientras no se sabe, no se marca
  }
  suggest(word: string): Promise<string[]> {
    const id = ++this.n;
    return new Promise((r) => { this.sugs.set(id, r); this.w.postMessage({ t: "suggest", id, word }); });
  }
}

const cargados = new Map<string, Promise<Remoto>>();
// Un worker por idioma, compartido por todos los editores. Si falla, se reintenta al reabrir.
export function corrector(code: string): Promise<Remoto> {
  let p = cargados.get(code);
  if (!p) {
    p = diccionario(code).then(([a, d]) => { const r = new Remoto(a, d); return r.listo.then(() => r); });
    p.catch(() => cargados.delete(code));
    cargados.set(code, p);
  }
  return p;
}

// Palabras que el usuario añade al diccionario, por idioma (solo en este equipo).
const clave = (lang: string) => "shakes-diccionario-" + lang;
const propias = (lang: string): string[] => { try { return JSON.parse(localStorage.getItem(clave(lang)) ?? "[]"); } catch { return []; } };
const aprender = (lang: string, w: string) => { try { localStorage.setItem(clave(lang), JSON.stringify([...new Set([...propias(lang), w.toLowerCase()])])); } catch { /* sin almacenamiento: solo vale esta sesión */ } };

// Extensión del editor: subraya en rojo lo que el diccionario de `lang` no conoce (nombres y apodos de fichas nunca).
export function ortografia(lang: string, cards: () => Card[], onError: (msg: string) => void) {
  let sp: Remoto | null = null;
  let extra = new Set(propias(lang));
  let fichas: unknown = null, deFichas = new Set<string>(); // se recalcula solo si cambian las fichas
  const listo = corrector(lang).then((s) => { sp = s; }, () => onError(t("sp.fail", { l: langName(lang) })));
  // Cuando el worker contesta con errores nuevos, se redibuja el editor.
  const suscribir = (f: () => void) => { let off = false; listo.then(() => { if (!off) sp?.oyentes.add(f); }); return () => { off = true; sp?.oyentes.delete(f); }; };
  return decorar("ortografia", (text) => {
    if (!sp) return [];
    const cs = cards();
    if (fichas !== cs) { fichas = cs; deFichas = palabrasDe(cs.flatMap((c) => namesOf(c))); }
    const dic = sp;
    const conocidas = deFichas.size ? new Set([...deFichas, ...extra]) : extra;
    return fallos(text, dic, conocidas).map((f) => ({
      from: f.from, to: f.to, class: "ortografia", title: t("sp.title"),
      lazy: () => dic.suggest(f.word),
      accion: { label: t("sp.add", { w: f.word }), run: () => { aprender(lang, f.word); extra = new Set(propias(lang)); } },
    }));
  }, listo, suscribir);
}
