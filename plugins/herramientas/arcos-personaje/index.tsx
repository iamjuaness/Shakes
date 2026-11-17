import { scenes } from "../../../src/tree";
import { findRefs } from "../fichas-auto/detect";
import { plain } from "../_comun/texto";
import type { ToolHost, ToolPlugin } from "../types";

// Matriz personaje × escena: cuántas veces aparece cada uno, en orden narrativo.
function Panel({ host }: { host: ToolHost }) {
  const list = scenes(host.project.book);
  const chars = host.cards.filter((c) => c.type === "Personaje");
  const counts = list.map(({ scene }) => {
    const m = new Map<string, number>();
    for (const r of findRefs(plain(scene.content), chars)) m.set(r.id, (m.get(r.id) ?? 0) + 1);
    return m;
  });
  if (!chars.length || !list.length) return <p className="empty">Necesitas escenas y fichas de personaje.</p>;
  return (
    <div className="panel">
      <p className="muted">Presencia de cada personaje por escena, en orden narrativo. Más oscuro = más menciones. Clic en un cuadro abre la escena.</p>
      {chars.map((c) => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          <button className="linklike" onClick={() => host.openCard(c.id)}>{c.name}</button>
          <div className="tool-grid" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(14px, 1fr))` }}>
            {list.map(({ scene }, i) => {
              const n = counts[i].get(c.id) ?? 0;
              return <div key={scene.id} className={`cell ${n ? "on" : ""}`} style={n ? { opacity: Math.min(1, 0.3 + n * 0.14) } : undefined} title={`${scene.title}: ${n}`} onClick={() => host.openScene(scene.id)} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export const arcosPersonaje: ToolPlugin = { id: "arcos-personaje", name: "Arcos de personaje", Panel };
