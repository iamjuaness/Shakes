import { scenes } from "../../../src/tree";
import { ask } from "../../../src/dialog";
import type { ToolHost, ToolPlugin } from "../types";

interface Datos { plots: { id: string; name: string; color: string }[]; map: Record<string, string[]> } // map: escena -> ids de tramas
const COLORES = ["#d9534f", "#3b82f6", "#16a34a", "#d97706", "#9333ea", "#0891b2"];

function Panel({ host }: { host: ToolHost }) {
  const d: Datos = host.project.ext?.tramas ?? { plots: [], map: {} };
  const save = (n: Datos) => host.setProject((p) => ({ ...p, ext: { ...p.ext, tramas: n } }));
  const list = scenes(host.project.book);
  const toggle = (sid: string, pid: string) => {
    const cur = d.map[sid] ?? [];
    save({ ...d, map: { ...d.map, [sid]: cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid] } });
  };
  return (
    <div className="panel">
      <div className="row">
        <button onClick={async () => { const name = await ask("Nombre de la trama o subtrama"); if (name) save({ ...d, plots: [...d.plots, { id: crypto.randomUUID(), name, color: COLORES[d.plots.length % COLORES.length] }] }); }}>+ Trama</button>
        {d.plots.map((p) => (
          <span key={p.id} className="chip" style={{ background: p.color, color: "#fff" }}>{p.name}
            <button aria-label={`Quitar ${p.name}`} style={{ border: 0, background: "transparent", color: "inherit" }} onClick={() => save({ plots: d.plots.filter((x) => x.id !== p.id), map: Object.fromEntries(Object.entries(d.map).map(([k, v]) => [k, v.filter((x) => x !== p.id)])) })}>×</button>
          </span>
        ))}
      </div>
      {d.plots.length > 0 && (
        <table className="tramas">
          <thead><tr><th /> {d.plots.map((p) => <th key={p.id} style={{ color: p.color }}>{p.name}</th>)}</tr></thead>
          <tbody>
            {list.map(({ scene }) => (
              <tr key={scene.id}>
                <td><button className="linklike" onClick={() => host.openScene(scene.id)}>{scene.title}</button></td>
                {d.plots.map((p) => <td key={p.id}><input type="checkbox" aria-label={`${scene.title} en ${p.name}`} checked={(d.map[scene.id] ?? []).includes(p.id)} onChange={() => toggle(scene.id, p.id)} style={{ accentColor: p.color }} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!d.plots.length && <p className="empty">Crea tramas y marca en qué escenas avanza cada una.</p>}
    </div>
  );
}

export const tramas: ToolPlugin = { id: "tramas", name: "Tramas", Panel };
