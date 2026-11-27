import { L } from "../_comun/idioma";
import { useState } from "react";
import { elegir } from "../_comun/guardar";
import type { ToolHost, ToolPlugin } from "../types";

interface Datos { img?: string; pins: Record<string, { x: number; y: number }> } // x, y: fracción 0-1 de la imagen
const MAX = 4_000_000; // la imagen va dentro del .shks

function Panel({ host }: { host: ToolHost }) {
  const d: Datos = host.project.ext?.["mapa-lugares"] ?? { pins: {} };
  const save = (n: Datos) => host.setProject((p) => ({ ...p, ext: { ...p.ext, "mapa-lugares": n } }));
  const [sel, setSel] = useState<string | null>(null);
  const places = host.cards.filter((c) => c.type === "place");
  async function pick() {
    const f = await elegir("image/*");
    if (!f) return;
    if (f.size > MAX) return host.notify(L("⚠ Imagen demasiado grande (máx. 4 MB).", "⚠ Image too large (max. 4 MB)."));
    const img = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
    save({ ...d, img });
  }
  return (
    <div className="panel">
      <div className="row"><button onClick={pick}>{d.img ? L("Cambiar imagen…", "Change image…") : L("Elegir imagen del mapa…", "Choose map image…")}</button></div>
      {!places.length && <p className="muted">{L("Crea fichas de tipo Lugar para colocarlas en el mapa.", "Create Place cards to put them on the map.")}</p>}
      <div className="chips" style={{ margin: "8px 0" }}>
        {places.map((c) => (
          <button key={c.id} className={`chip ${sel === c.id ? "on" : ""}`} onClick={() => setSel(sel === c.id ? null : c.id)}>
            {c.name}{d.pins[c.id] ? " ✓" : ""}
          </button>
        ))}
      </div>
      {sel && <p className="muted">{L("Haz clic en el mapa para colocar o mover", "Click the map to place or move")} «{host.cards.find((c) => c.id === sel)?.name}».
        {d.pins[sel] && <button onClick={() => { const { [sel]: _, ...rest } = d.pins; save({ ...d, pins: rest }); }}>{L("Quitar marca", "Remove pin")}</button>}</p>}
      {d.img ? (
        <div className="lugares" style={{ cursor: sel ? "crosshair" : "default" }} onClick={(e) => {
          if (!sel) return;
          const r = e.currentTarget.getBoundingClientRect();
          save({ ...d, pins: { ...d.pins, [sel]: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height } } });
        }}>
          <img src={d.img} alt={L("Mapa", "Map")} draggable={false} />
          {Object.entries(d.pins).map(([id, p]) => {
            const c = host.cards.find((x) => x.id === id);
            return c && <button key={id} className="pin" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} onClick={(e) => { if (!sel) { e.stopPropagation(); host.openCard(id); } }}>{c.name}</button>;
          })}
        </div>
      ) : <p className="empty">{L("Elige una imagen para tu mapa.", "Choose an image for your map.")}</p>}
    </div>
  );
}

export const mapaLugares: ToolPlugin = { id: "mapa-lugares", name: "Mapa de lugares", Panel };
