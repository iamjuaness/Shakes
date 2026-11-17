import type { ToolHost, ToolPlugin } from "../types";
import { familia } from "./familia";

function Panel({ host }: { host: ToolHost }) {
  const f = familia(host.cards.flatMap((c) => (c.links ?? []).map((l) => ({ from: c.id, to: l.to, label: l.label }))));
  if (!f.gen.size) return <p className="empty">Relaciona fichas con «padre de», «madre de», «hijo de», «hermano de» o «esposa de» para ver el árbol.</p>;
  const rows = new Map<number, string[]>();
  for (const [id, g] of f.gen) rows.set(g, [...(rows.get(g) ?? []), id]);
  const W = 130, H = 90, pos = new Map<string, { x: number; y: number }>();
  const maxW = Math.max(...[...rows.values()].map((r) => r.length));
  for (const [g, ids] of rows) ids.forEach((id, i) => pos.set(id, { x: 70 + (i + (maxW - ids.length) / 2) * W, y: 40 + g * H }));
  const name = (id: string) => host.cards.find((c) => c.id === id)?.name ?? "?";
  return (
    <div className="panel">
      <svg viewBox={`0 0 ${140 + maxW * W} ${80 + rows.size * H}`} style={{ maxWidth: "100%" }}>
        {f.padres.map(([p, h], i) => <line key={"p" + i} x1={pos.get(p)!.x} y1={pos.get(p)!.y + 16} x2={pos.get(h)!.x} y2={pos.get(h)!.y - 16} stroke="var(--muted)" />)}
        {f.parejas.map(([a, b], i) => <line key={"q" + i} x1={pos.get(a)!.x} y1={pos.get(a)!.y} x2={pos.get(b)!.x} y2={pos.get(b)!.y} stroke="var(--accent)" strokeDasharray="4 3" />)}
        {[...pos].map(([id, p]) => (
          <g key={id} style={{ cursor: "pointer" }} onClick={() => host.openCard(id)}>
            <rect x={p.x - 52} y={p.y - 16} width={104} height={32} rx={8} fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fill="var(--text)">{name(id).slice(0, 16)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export const arbolGenealogico: ToolPlugin = { id: "arbol-genealogico", name: "Árbol genealógico", Panel };
