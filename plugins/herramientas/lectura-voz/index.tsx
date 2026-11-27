// Lectura en voz alta con las voces del sistema: lee desde el cursor y va seleccionando cada frase.
import { L } from "../_comun/idioma";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { ToolHost, ToolPlugin } from "../types";
import { frases } from "./frases";

function Overlay({ editor, host }: { editor: Editor; host: ToolHost }) {
  const [estado, setEstado] = useState<"parado" | "leyendo" | "pausa">("parado");
  const [vel, setVel] = useState(1);
  const turno = useRef(0); // al parar o reiniciar, las frases pendientes se descartan
  const voz = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
  const parar = () => { turno.current++; voz?.cancel(); setEstado("parado"); };
  useEffect(() => () => { turno.current++; voz?.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!voz) return null;

  function leer() {
    if (estado === "pausa") { voz!.resume(); return setEstado("leyendo"); }
    const todas: { from: number; to: number; t: string }[] = [];
    editor.state.doc.descendants((n, pos) => {
      if (!n.isTextblock) return true;
      const texto = n.textBetween(0, n.content.size, undefined, "\n");
      for (const f of frases(texto)) todas.push({ from: pos + 1 + f.from, to: pos + 1 + f.to, t: f.t });
      return false;
    });
    const desde = editor.state.selection.from;
    const resto = todas.filter((f) => f.to > desde);
    const cola = resto.length ? resto : todas; // cursor al final: desde el principio
    const mio = ++turno.current;
    voz!.cancel();
    const idioma = host.bookLang.slice(0, 2).toLowerCase();
    const elegida = voz!.getVoices().find((v) => v.lang.toLowerCase().startsWith(idioma));
    const siguiente = (i: number) => {
      if (mio !== turno.current || editor.isDestroyed) return;
      const f = cola[i];
      if (!f) return setEstado("parado");
      const max = editor.state.doc.content.size;
      editor.chain().setTextSelection({ from: Math.min(f.from, max), to: Math.min(f.to, max) }).scrollIntoView().run();
      const u = new SpeechSynthesisUtterance(f.t);
      u.lang = host.bookLang;
      if (elegida) u.voice = elegida;
      u.rate = vel;
      u.onend = () => siguiente(i + 1);
      u.onerror = () => { if (mio === turno.current) { setEstado("parado"); host.notify(L("No se pudo leer: revisa las voces instaladas en el sistema.", "Could not read: check the voices installed on your system.")); } };
      voz!.speak(u);
    };
    setEstado("leyendo");
    siguiente(0);
  }

  return (
    <div className="voz" role="toolbar" aria-label={L("Lectura en voz alta", "Read aloud")}>
      {estado === "leyendo"
        ? <button title={L("Pausar", "Pause")} aria-label={L("Pausar", "Pause")} onClick={() => { voz.pause(); setEstado("pausa"); }}>❚❚</button>
        : <button title={L("Leer en voz alta desde el cursor", "Read aloud from the cursor")} onClick={leer}>▶ {estado === "pausa" ? L("Seguir", "Resume") : L("Escuchar", "Listen")}</button>}
      {estado !== "parado" && <button title={L("Detener", "Stop")} aria-label={L("Detener", "Stop")} onClick={parar}>■</button>}
      <select aria-label={L("Velocidad de lectura", "Reading speed")} title={L("Velocidad (al empezar)", "Speed (when starting)")} value={vel} onChange={(e) => setVel(Number(e.target.value))}>{[0.8, 1, 1.2, 1.5].map((v) => <option key={v} value={v}>{v}×</option>)}</select>
    </div>
  );
}

export const lecturaVoz: ToolPlugin = { id: "lectura-voz", name: "Lectura en voz alta", Overlay };
