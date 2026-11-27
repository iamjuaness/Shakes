import { useMemo, useState } from "react";
import type { ToolHost, ToolPlugin } from "../types";
import { BotonesZoom, COLORES, PERSONA, useLienzo } from "../_comun/lienzo";
import { FILA, PASO, colocar, familia } from "./familia";

const R = 24;
const ROJO = "#e5484d"; // paradojas

function Panel({ host }: { host: ToolHost }) {
  // memorizado: con bucles se prueban muchas disposiciones y no debe repetirse al pasar el cursor
  const { f, pos, marcos } = useMemo(() => {
    const f = familia(host.cards.flatMap((c) => (c.links ?? []).filter((l) => host.cards.some((o) => o.id === l.to)).map((l) => ({ from: c.id, to: l.to, label: l.label }))));
    return { f, ...colocar(f) };
  }, [host.cards]);
  const [hover, setHover] = useState<string | null>(null);
  const x1 = Math.min(...marcos.map((m) => m.x)), y1 = Math.min(...marcos.map((m) => m.y)) - 30;
  const x2 = Math.max(...marcos.map((m) => m.x + m.w)), y2 = Math.max(...marcos.map((m) => m.y + m.h));
  const aire = f.paradojas.length ? 320 : 40; // las paradojas se abren hacia los lados
  const w = Math.max(700, x2 - x1 + aire), h = Math.max(500, y2 - y1 + 40);
  const lienzo = useLienzo({ x: (x1 + x2 - w) / 2, y: (y1 + y2 - h) / 2, w, h }, !!marcos.length);
  const es = host.lang === "es";
  if (!marcos.length) return <p className="empty">{es ? "Relaciona fichas con «padre de», «madre de», «hijo de», «hermano de» o «esposa de» para ver el árbol." : "Link cards with “padre de”, “madre de”, “hijo de”, “hermano de” or “esposa de” to see the tree."}</p>;
  const name = (id: string) => host.cards.find((c) => c.id === id)?.name ?? "?";
  const dim = (ids: string[]) => (hover && !ids.includes(hover) ? "dim" : "");

  // una «unión» son los progenitores de un hijo; todos sus hijos salen del mismo punto y con el mismo color
  const uniones = new Map<string, { padres: string[]; hijos: string[] }>();
  for (const id of pos.keys()) {
    const padres = f.padres.filter(([, h]) => h === id).map(([p]) => p).sort();
    if (!padres.length) continue;
    const u = uniones.get(padres.join()) ?? { padres, hijos: [] };
    u.hijos.push(id);
    uniones.set(padres.join(), u);
  }
  const curva = (x: number, y: number, tx: number, ty: number) => `M${x} ${y}C${x} ${(y + ty) / 2} ${tx} ${(y + ty) / 2} ${tx} ${ty}`;
  const sinPadre = f.abuelos.filter(([g, n]) => !f.padres.some(([p, h]) => h === n && f.padres.some(([a, b]) => a === g && b === p)));
  // hermanos con progenitores comunes ya se ven unidos por ellos
  const sueltos = f.parientes.filter((l) => ![...uniones.values()].some((u) => u.hijos.includes(l.a) && u.hijos.includes(l.b)));
  // la paradoja sale por fuera de su familia, del lado en que queda más cerca del borde
  const fuera = (a: string, b: string) => { const m = marcos.find((k) => k.ids.includes(a))!; return (pos.get(a)!.x + pos.get(b)!.x) / 2 < m.x + m.w / 2 ? -1 : 1; };
  const lado = [...f.parejas.map((l) => ({ ...l, pareja: true })), ...sueltos.map((l) => ({ ...l, pareja: false }))];

  return (
    <>
      <div className="row hint">
        <span className="muted">{es ? "Rueda para acercar, arrastra el fondo para desplazarte. Clic en una persona para abrir su ficha." : "Scroll to zoom, drag the background to pan. Click a person to open the card."}</span>
        {f.paradojas.length > 0 && <span style={{ color: ROJO, fontSize: 12.5 }}>{es ? "Rojo punteado: paradoja (bucle de parentesco)" : "Dashed red: paradox (family loop)"}</span>}
        <BotonesZoom lienzo={lienzo} />
      </div>
      <svg
        ref={lienzo.svg}
        className="map"
        aria-label={es ? "Árbol genealógico" : "Family tree"}
        viewBox={lienzo.viewBox}
        onPointerDown={lienzo.panStart}
        onPointerMove={lienzo.panMove}
        onPointerUp={lienzo.panEnd}
        onPointerCancel={lienzo.panEnd}
      >
        <defs>
          <marker id="paradoja" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0L10 5L0 10z" fill={ROJO} />
          </marker>
        </defs>
        {marcos.length > 1 && marcos.map((m, i) => (
          <g key={m.ids[0]}>
            <rect x={m.x} y={m.y} width={m.w} height={m.h} rx={18} fill="var(--panel)" stroke="var(--line)" />
            <text className="name" x={m.x + 16} y={m.y - 10}>{`${es ? "Familia" : "Family"} ${i + 1}`}</text>
          </g>
        ))}
        {[...uniones.values()].map((u, i) => {
          const color = COLORES[i % COLORES.length];
          const sx = u.padres.reduce((s, p) => s + pos.get(p)!.x, 0) / u.padres.length;
          const py = Math.max(...u.padres.map((p) => pos.get(p)!.y));
          const sy = u.padres.length > 1 ? py : py + R + 24; // pareja: desde su línea; uno solo: bajo su nombre
          const juntos = u.padres.every((p) => pos.get(p)!.y === py);
          // en generaciones distintas (paradojas) cada progenitor baja su propia línea
          return u.hijos.flatMap((c) => (juntos ? [{ x: sx, y: sy, de: u.padres }] : u.padres.map((p) => ({ x: pos.get(p)!.x, y: pos.get(p)!.y + R + 24, de: [p] }))).map((o) => (
            <path key={u.padres.join() + c + o.de.join()} className={`link ${dim([...u.padres, c])}`} stroke={color} d={curva(o.x, o.y, pos.get(c)!.x, pos.get(c)!.y - R - 4)}>
              <title>{`${o.de.map(name).join(" + ")} → ${name(c)}`}</title>
            </path>
          )));
        })}
        {sinPadre.map(([g, n]) => (
          <path key={"a" + g + n} className={`link ${dim([g, n])}`} stroke="var(--muted)" strokeDasharray="2 5" d={curva(pos.get(g)!.x, pos.get(g)!.y + R + 24, pos.get(n)!.x, pos.get(n)!.y - R - 4)}>
            <title>{`${name(g)} → ${es ? "abuelo/a de" : "grandparent of"} → ${name(n)}`}</title>
          </path>
        ))}
        {f.paradojas.map(([a, b]) => {
          const p = pos.get(a)!, q = pos.get(b)!, s = fuera(a, b), abre = 110 + Math.abs(p.y - q.y) / 5;
          const px = p.x + s * R, qx = q.x + s * (R + 4);
          return (
            <g key={"x" + a + b} className={dim([a, b])}>
              <path className="link" stroke={ROJO} strokeDasharray="7 5" markerEnd="url(#paradoja)" d={`M${px} ${p.y}C${px + s * abre} ${p.y} ${qx + s * abre} ${q.y} ${qx} ${q.y}`}>
                <title>{`${name(a)} → ${es ? "antepasado de" : "ancestor of"} → ${name(b)}`}</title>
              </path>
              <text className="edge" x={(px + qx) / 2 + s * abre * 0.75} y={(p.y + q.y) / 2} textAnchor="middle" fill={ROJO}>{es ? "paradoja" : "paradox"}</text>
            </g>
          );
        })}
        {/* progenitores que no figuran como pareja también necesitan línea de donde salgan los hijos */}
        {[...uniones.values()].filter((u) => u.padres.length > 1 && u.padres.every((p) => pos.get(p)!.y === pos.get(u.padres[0])!.y)).flatMap((u) => u.padres.slice(1).map((p) => [u.padres[0], p]))
          .filter(([a, b]) => !f.parejas.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)))
          .map(([a, b]) => <path key={"c" + a + b} className={`link ${dim([a, b])}`} stroke="var(--muted)" strokeDasharray="5 4" d={`M${pos.get(a)!.x} ${pos.get(a)!.y}L${pos.get(b)!.x} ${pos.get(b)!.y}`} />)}
        {lado.map((l) => {
          const [a, b] = [pos.get(l.a)!, pos.get(l.b)!].sort((p, q) => p.x - q.x);
          // pareja contigua: línea recta; el resto, arco por encima para no atravesar a nadie
          const recta = l.pareja && a.y === b.y && b.x - a.x <= PASO + 1;
          const alto = Math.min(FILA * 0.7, 50 + (b.x - a.x) / 6);
          const [u, v] = a.y <= b.y ? [a, b] : [b, a]; // arriba y abajo
          const distintas = u.y !== v.y;
          const cima = a.y - R - 4 - alto;
          const d = recta ? `M${a.x + R} ${a.y}L${b.x - R} ${b.y}`
            : distintas ? curva(u.x, u.y + R + 24, v.x, v.y - R - 4)
            : `M${a.x} ${a.y - R - 4}Q${(a.x + b.x) / 2} ${cima} ${b.x} ${b.y - R - 4}`;
          // la etiqueta va sobre la línea; entre generaciones, cerca de arriba (t = ¼) para no pisar otras parejas
          const y0 = u.y + R + 24, y1 = v.y - R - 4;
          const en = distintas ? { x: u.x * 0.84 + v.x * 0.16, y: y0 * 0.42 + ((y0 + y1) / 2) * 0.56 + y1 * 0.02 }
            : { x: (a.x + b.x) / 2, y: recta ? a.y - 8 : a.y - R - 8 - alto / 2 };
          return (
            <g key={l.a + l.b} className={dim([l.a, l.b])}>
              <path className="link" stroke={l.pareja ? "var(--accent)" : "var(--muted)"} strokeDasharray={distintas ? "2 5" : l.pareja ? undefined : "5 4"} d={d} />
              <text className="edge" x={en.x} y={en.y} textAnchor="middle" fill="var(--muted)">{l.label}</text>
            </g>
          );
        })}
        {[...pos].map(([id, p]) => (
          <g key={id} className={`node ${hover && hover !== id && ![...f.padres, ...f.abuelos, ...f.paradojas, ...lado.map((l) => [l.a, l.b])].some((r) => r.includes(id) && r.includes(hover)) ? "dim" : ""}`}
            onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover(null)} onPointerDown={(e) => e.stopPropagation()} onClick={() => host.openCard(id)}>
            <circle cx={p.x} cy={p.y} r={R} fill="transparent" />
            <path d={PERSONA} transform={`translate(${p.x - R} ${p.y - R}) scale(${R / 12})`} fill="var(--accent)" />
            <text className="name" x={p.x} y={p.y + R + 17} textAnchor="middle">{name(id)}</text>
          </g>
        ))}
      </svg>
    </>
  );
}

export const arbolGenealogico: ToolPlugin = { id: "arbol-genealogico", name: "Árbol genealógico", Panel };
