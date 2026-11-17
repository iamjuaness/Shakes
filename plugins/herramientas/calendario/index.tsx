import { useState } from "react";
import { scenes } from "../../../src/tree";
import type { ToolHost, ToolPlugin } from "../types";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function Panel({ host }: { host: ToolHost }) {
  const fechas = scenes(host.project.book).filter(({ scene }) => scene.date);
  const first = fechas.map(({ scene }) => scene.date!).sort()[0];
  const [ym, setYm] = useState(() => (first ?? new Date().toLocaleDateString("sv")).slice(0, 7));
  const [y, m] = ym.split("-").map(Number);
  const go = (d: number) => { const t = new Date(y, m - 1 + d, 1); setYm(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`); };
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // semana desde el lunes
  const days = new Date(y, m, 0).getDate();
  return (
    <div className="panel">
      <div className="row"><button onClick={() => go(-1)}>←</button><b>{MESES[m - 1]} {y}</b><button onClick={() => go(1)}>→</button>
        <span className="muted">{fechas.length} escenas con fecha (se asignan en la cinta, grupo Escena)</span></div>
      <div className="cal">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => <b key={d} className="muted">{d}</b>)}
        {Array.from({ length: lead }, (_, i) => <div key={"e" + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const iso = `${ym}-${String(i + 1).padStart(2, "0")}`;
          return (
            <div key={iso} className="day">
              {i + 1}
              {fechas.filter(({ scene }) => scene.date === iso).map(({ scene }) => <button key={scene.id} className="chip" onClick={() => host.openScene(scene.id)}>{scene.title}</button>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const calendario: ToolPlugin = { id: "calendario", name: "Calendario", Panel };
