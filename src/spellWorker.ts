// Hilo aparte para el corrector: compilar un diccionario Hunspell (y sugerir) tarda y congelaba la interfaz.
// Mensajes: {t:"load", aff, dic} -> {t:"ready"} | {t:"error"}; {t:"check", words} -> {t:"check", words, ok}; {t:"suggest", id, word} -> {t:"suggest", id, sug}.
import nspell from "nspell";

let sp: ReturnType<typeof nspell> | null = null;
self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  try {
    if (m.t === "load") { sp = nspell(m.aff, m.dic); postMessage({ t: "ready" }); }
    else if (m.t === "check") postMessage({ t: "check", words: m.words, ok: m.words.map((w: string) => sp!.correct(w)) });
    else if (m.t === "suggest") postMessage({ t: "suggest", id: m.id, sug: sp!.suggest(m.word).slice(0, 6) });
  } catch (x) { postMessage({ t: "error", id: m.id, e: String(x) }); }
};
