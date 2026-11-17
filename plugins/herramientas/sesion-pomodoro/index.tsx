import { useEffect, useReducer } from "react";
import { totalWords } from "../../../src/tree";
import type { ToolHost, ToolPlugin } from "../types";

// Estado a nivel de módulo: el temporizador sigue corriendo al cambiar de pestaña.
const TRABAJO = 25 * 60, DESCANSO = 5 * 60;
const S = { modo: "trabajo" as "trabajo" | "descanso", fin: null as number | null, resto: TRABAJO, base: null as number | null, meta: 0 };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const quedan = () => (S.fin ? Math.max(0, Math.round((S.fin - Date.now()) / 1000)) : S.resto);

function Overlay({ host }: { host: ToolHost }) {
  const [, tick] = useReducer((x) => x + 1, 0);
  useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t); }, []);
  const words = totalWords(host.project.book);
  if (S.base === null) S.base = words;
  if (S.fin && quedan() === 0) { // fin de ciclo: cambia de modo y avisa
    S.modo = S.modo === "trabajo" ? "descanso" : "trabajo";
    S.resto = S.modo === "trabajo" ? TRABAJO : DESCANSO;
    S.fin = null;
    host.notify(S.modo === "descanso" ? "☕ Pausa de 5 minutos" : "✍ A escribir");
  }
  const escritas = Math.max(0, words - S.base);
  return (
    <div className="pomodoro" role="timer" aria-label="Sesión de escritura">
      <b>{S.modo === "trabajo" ? "✍" : "☕"} {fmt(quedan())}</b>
      <button onClick={() => { if (S.fin) { S.resto = quedan(); S.fin = null; } else S.fin = Date.now() + S.resto * 1000; tick(); }}>{S.fin ? "Pausa" : "Iniciar"}</button>
      <button onClick={() => { S.fin = null; S.modo = "trabajo"; S.resto = TRABAJO; S.base = words; tick(); }}>Reiniciar</button>
      <span className="muted">+{escritas}{S.meta ? ` / ${S.meta}` : ""} palabras</span>
      <input type="number" min={0} aria-label="Meta de la sesión" placeholder="Meta" value={S.meta || ""} onChange={(e) => { S.meta = Math.max(0, Math.floor(Number(e.target.value))); tick(); }} />
    </div>
  );
}

export const sesionPomodoro: ToolPlugin = { id: "sesion-pomodoro", name: "Sesión y pomodoro", Overlay };
