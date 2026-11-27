import { useState } from "react";
import { scenes } from "../../../src/tree";
import { ask, confirmAsk } from "../../../src/dialog";
import { BotonesZoom, COLORES, useLienzo } from "../_comun/lienzo";
import type { ToolHost, ToolPlugin } from "../types";
import { Datos, FASES, Fase, Nota, Trama, alternar, borrar, clave, marcas, revisar } from "./logica";

const NOMBRE_FASE: Record<Fase, [string, string]> = { planteamiento: ["Planteamiento", "Setup"], giro: ["Giro", "Turn"], climax: ["Clímax", "Climax"], resolucion: ["Resolución", "Resolution"] };
const COL = 110, FILA = 74, MARGEN = 190; // ancho por capítulo, alto por trama, sitio para los nombres
const corto = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function Panel({ host }: { host: ToolHost }) {
  const es = host.lang === "es";
  const L = (a: string, b: string) => (es ? a : b);
  const [sel, setSel] = useState<{ plot: string; scene?: string } | null>(null);
  const d: Datos = host.project.ext?.tramas ?? { plots: [], map: {} };
  const guardar = (n: Datos) => host.setProject((p) => ({ ...p, ext: { ...p.ext, tramas: n } }));
  const list = scenes(host.project.book);
  const orden = list.map((s) => s.scene.id);
  const plots = [...d.plots].sort((a, b) => Number(a.tipo === "subtrama") - Number(b.tipo === "subtrama"));
  const w = Math.max(700, MARGEN + list.length * COL + 40), h = Math.max(260, 110 + plots.length * FILA);
  const lienzo = useLienzo({ x: 0, y: 0, w, h }, !!plots.length && !!list.length);
  const trama = plots.find((p) => p.id === sel?.plot) ?? plots[0];
  const cap = list.findIndex((s) => s.scene.id === sel?.scene);
  const cambiar = (patch: Partial<Trama>) => guardar({ ...d, plots: d.plots.map((p) => (p.id === trama.id ? { ...p, ...patch } : p)) });

  const nueva = async () => {
    const name = await ask(L("Nombre de la trama o subtrama", "Plot or subplot name"));
    if (!name) return;
    const id = crypto.randomUUID();
    guardar({ ...d, plots: [...d.plots, { id, name, color: COLORES[d.plots.length % COLORES.length], tipo: d.plots.length ? "subtrama" : "principal" }] });
    setSel({ plot: id });
  };

  const barra = (
    <div className="row hint">
      <button onClick={nueva}>{L("+ Trama", "+ Plot")}</button>
      <span className="muted">{L("Haz clic en un círculo para marcar que la trama avanza en ese capítulo.", "Click a circle to mark that the plot advances in that chapter.")}</span>
      <BotonesZoom lienzo={lienzo} />
    </div>
  );
  if (!plots.length || !list.length) return <>{barra}<p className="empty">{list.length ? L("Crea una trama para ver su línea de tiempo.", "Create a plot to see its timeline.") : L("Necesitas capítulos o escenas.", "You need chapters or scenes.")}</p></>;

  const titulo = (i: number) => list[i].scene.title;
  const texto = (a: ReturnType<typeof revisar>[number]) =>
    a.tipo === "vacia" ? L("No avanza en ningún capítulo.", "It advances in no chapter.")
    : a.tipo === "sinResolver" ? L("Sin resolver: ningún punto está marcado como resolución.", "Unresolved: no point is marked as resolution.")
    : a.tipo === "tras" ? L("Sigue avanzando después de su resolución.", "It keeps advancing after its resolution.")
    : a.tipo === "hueco" ? L(`${a.a - a.de + 1} capítulos sin avanzar: de «${titulo(a.de)}» a «${titulo(a.a)}».`, `${a.a - a.de + 1} chapters without progress: “${titulo(a.de)}” to “${titulo(a.a)}”.`)
    : L(`Parece abandonada desde «${titulo(a.de)}».`, `Looks abandoned since “${titulo(a.de)}”.`);
  const avisos = revisar(marcas(d, trama.id, orden), list.length);
  const marcada = cap >= 0 && !!d.map[orden[cap]]?.includes(trama.id);
  const nota: Nota = cap >= 0 ? d.notas?.[clave(orden[cap], trama.id)] ?? {} : {};
  const anotar = (n: Nota) => guardar({ ...d, notas: { ...d.notas, [clave(orden[cap], trama.id)]: { ...nota, ...n } } });
  const x = (i: number) => MARGEN + i * COL + COL / 2, y = (k: number) => 90 + k * FILA;

  return (
    <>
      {barra}
      <svg ref={lienzo.svg} className="map" aria-label={L("Línea de tiempo de las tramas", "Plot timeline")} viewBox={lienzo.viewBox} preserveAspectRatio="xMinYMin meet"
        onPointerDown={lienzo.panStart} onPointerMove={lienzo.panMove} onPointerUp={lienzo.panEnd} onPointerCancel={lienzo.panEnd}>
        {list.map(({ scene }, i) => (
          <g key={scene.id}>
            <line x1={x(i)} x2={x(i)} y1={48} y2={y(plots.length - 1) + 30} stroke="var(--line)" />
            <text className="edge" x={x(i)} y={34} textAnchor="middle" fill="var(--muted)"><title>{scene.title}</title>{corto(scene.title, 15)}</text>
          </g>
        ))}
        {plots.map((p, k) => {
          const m = marcas(d, p.id, orden);
          return (
            <g key={p.id} className={p.id === trama.id ? "" : "carril"}>
              <g className="node" onPointerDown={(e) => e.stopPropagation()} onClick={() => setSel({ plot: p.id })}>
                <text className="name" x={16} y={y(k) + 5} fill={p.color} style={{ fill: p.color }}>{corto(p.name, 20)}</text>
              </g>
              {m.length > 1 && <line x1={x(m[0].i)} x2={x(m[m.length - 1].i)} y1={y(k)} y2={y(k)} stroke={p.color} strokeWidth={4} strokeLinecap="round" />}
              {list.map(({ scene }, i) => {
                const hit = m.find((z) => z.i === i);
                const on = trama.id === p.id && sel?.scene === scene.id;
                return (
                  <g key={scene.id} className={`punto-trama ${hit ? "" : "vacio"}`} role="button" aria-label={`${p.name} · ${scene.title}`} aria-pressed={!!hit}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => { if (!hit) guardar(alternar(d, scene.id, p.id)); setSel({ plot: p.id, scene: scene.id }); }}>
                    <title>{`${p.name} · ${scene.title}${hit?.fase ? " · " + NOMBRE_FASE[hit.fase][es ? 0 : 1] : ""}${hit?.texto ? "\n" + hit.texto : ""}`}</title>
                    <circle cx={x(i)} cy={y(k)} r={hit ? 13 : 9} fill={hit ? p.color : "var(--bg)"} stroke={on ? "var(--text)" : hit ? p.color : "var(--line)"} strokeWidth={on ? 3 : 1.5} />
                    {hit?.fase && <text x={x(i)} y={y(k) + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{NOMBRE_FASE[hit.fase][es ? 0 : 1][0]}</text>}
                    {hit?.texto && <text className="edge" x={x(i)} y={y(k) + 29} textAnchor="middle" fill="var(--muted)">{corto(hit.texto, 16)}</text>}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className="relato detalle">
        <section>
          <div className="row">
            <input aria-label={L("Nombre de la trama", "Plot name")} style={{ borderColor: trama.color }} value={trama.name} onChange={(e) => cambiar({ name: e.target.value })} />
            <select aria-label={L("Tipo", "Type")} value={trama.tipo ?? "principal"} onChange={(e) => cambiar({ tipo: e.target.value as Trama["tipo"] })}>
              <option value="principal">{L("Principal", "Main")}</option>
              <option value="subtrama">{L("Subtrama", "Subplot")}</option>
            </select>
            <button onClick={async () => { if (await confirmAsk(L(`¿Borrar la trama «${trama.name}» y sus notas?`, `Delete plot “${trama.name}” and its notes?`))) { guardar(borrar(d, trama.id)); setSel(null); } }}>{L("Borrar", "Delete")}</button>
          </div>
          <textarea rows={2} aria-label={L("Descripción", "Description")} placeholder={L("¿De qué va esta trama y qué está en juego?", "What is this plot about and what is at stake?")} value={trama.desc ?? ""} onChange={(e) => cambiar({ desc: e.target.value })} />
          <div className="chips">
            {host.cards.filter((c) => c.type === "character").map((c) => {
              const on = !!trama.chars?.includes(c.id);
              return <button key={c.id} className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => cambiar({ chars: on ? trama.chars!.filter((i) => i !== c.id) : [...(trama.chars ?? []), c.id] })}>{c.name}</button>;
            })}
          </div>
          {avisos.length > 0 && <ul className="avisos">{avisos.map((a) => <li key={texto(a)}>{texto(a)}</li>)}</ul>}
        </section>
        <section>
          {cap < 0 ? <p className="muted">{L("Elige un punto de la línea de tiempo para anotar qué pasa.", "Pick a point on the timeline to note what happens.")}</p>
          : !marcada ? <button onClick={() => guardar(alternar(d, orden[cap], trama.id))}>{L(`Marcar que avanza en «${titulo(cap)}»`, `Mark progress in “${titulo(cap)}”`)}</button>
          : (
            <>
              <div className="row">
                <button className="linklike" onClick={() => host.openScene(orden[cap])}>{titulo(cap)}</button>
                <select aria-label={L("Fase", "Stage")} value={nota.fase ?? ""} onChange={(e) => anotar({ fase: (e.target.value || undefined) as Fase | undefined })}>
                  <option value="">{L("— Sin fase —", "— No stage —")}</option>
                  {FASES.map((f) => <option key={f} value={f}>{NOMBRE_FASE[f][es ? 0 : 1]}</option>)}
                </select>
                <button onClick={() => guardar(alternar(d, orden[cap], trama.id))}>{L("Quitar punto", "Remove point")}</button>
              </div>
              <textarea rows={3} aria-label={L("Qué pasa", "What happens")} placeholder={L("¿Qué pasa con esta trama aquí?", "What happens to this plot here?")} value={nota.texto ?? ""} onChange={(e) => anotar({ texto: e.target.value })} />
            </>
          )}
        </section>
      </div>
    </>
  );
}

export const tramas: ToolPlugin = { id: "tramas", name: "Tramas", Panel };
