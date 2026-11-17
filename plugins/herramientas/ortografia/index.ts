import nspell from "nspell";
import type { ToolPlugin } from "../types";
import { decorar } from "../_comun/decorar";
import { fallos, palabrasDe } from "./revisar";
import { namesOf } from "../../../src/tree";
import esAff from "../../../node_modules/dictionary-es/index.aff?url";
import esDic from "../../../node_modules/dictionary-es/index.dic?url";
import enAff from "../../../node_modules/dictionary-en/index.aff?url";
import enDic from "../../../node_modules/dictionary-en/index.dic?url";

// Palabras que el usuario ha añadido al diccionario, por idioma (solo en este equipo).
const clave = (lang: string) => "shakes-diccionario-" + lang;
const propias = (lang: string): string[] => { try { return JSON.parse(localStorage.getItem(clave(lang)) ?? "[]"); } catch { return []; } };
const guardar = (lang: string, w: string) => { try { localStorage.setItem(clave(lang), JSON.stringify([...new Set([...propias(lang), w.toLowerCase()])])); } catch { /* sin almacenamiento: solo vale esta sesión */ } };

// Un corrector por idioma: aff+dic Hunspell (paquetes dictionary-*), descargados y compilados la primera vez que se usa.
function corrector(aff: string, dic: string) {
  return Promise.all([fetch(aff).then((r) => r.text()), fetch(dic).then((r) => r.text())]).then(([a, d]) => nspell(a, d));
}

function ortografia(id: string, name: string, lang: string, aff: string, dic: string): ToolPlugin {
  let cargado: Promise<ReturnType<typeof nspell>> | null = null;
  let sp: ReturnType<typeof nspell> | null = null;
  let extra = new Set(propias(lang));
  let fichas: unknown = null, deFichas = new Set<string>(); // se recalcula solo si cambian las fichas
  return {
    id, name,
    extensions: (host) => {
      cargado ??= corrector(aff, dic);
      cargado.then((s) => { sp = s; });
      return [decorar("ortografia-" + lang, (text) => {
        if (!sp) return [];
        const cards = host().cards;
        if (fichas !== cards) { fichas = cards; deFichas = palabrasDe(cards.flatMap((c) => namesOf(c))); }
        const dic = sp;
        const conocidas = new Set([...deFichas, ...extra]);
        return fallos(text, dic, conocidas).map((f) => ({
          from: f.from, to: f.to, class: "ortografia", title: "Posible error de ortografía",
          lazy: () => dic.suggest(f.word).slice(0, 6),
          accion: { label: `＋ Añadir «${f.word}» al diccionario`, run: () => { guardar(lang, f.word); extra = new Set(propias(lang)); } },
        }));
      }, cargado)];
    },
  };
}

export const ortografiaEs = ortografia("ortografia-es", "Ortografía (español)", "es", esAff, esDic);
export const ortografiaEn = ortografia("ortografia-en", "Spelling (English)", "en", enAff, enDic);
