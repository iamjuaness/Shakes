import { useMemo, useState } from "react";
import { scenes } from "../../../src/tree";
import { findRefs } from "../fichas-auto/detect";
import { plain } from "../_comun/texto";
import type { ToolHost, ToolPlugin } from "../types";
import { Arco, HITOS, Hito, HitoId, TipoArco, VALOR, revisar } from "./logica";

const NOMBRES: Record<HitoId, [string, string, string, string]> = { // es, en, pregunta es, pregunta en
  inicio: ["Inicio", "Start", "¿Cómo es antes de que pase nada?", "Who are they before anything happens?"],
  detonante: ["Detonante", "Inciting incident", "¿Qué le saca de su rutina?", "What pulls them out of routine?"],
  medio: ["Punto medio", "Midpoint", "¿Qué descubre o decide?", "What do they discover or decide?"],
  crisis: ["Crisis", "Crisis", "¿Cuál es su peor momento?", "What is their worst moment?"],
  climax: ["Clímax", "Climax", "¿Qué elige cuando todo está en juego?", "What do they choose when all is at stake?"],
  final: ["Final", "End", "¿En quién se ha convertido?", "Who have they become?"],
};
const TIPOS: Record<TipoArco, [string, string]> = {
  positivo: ["Positivo: supera su mentira", "Positive: overcomes the lie"],
  negativo: ["Negativo: se hunde en ella", "Negative: sinks into it"],
  plano: ["Plano: no cambia, cambia al mundo", "Flat: stays, changes the world"],
};
const corto = (s: string) => (s.length > 14 ? s.slice(0, 13) + "…" : s);

function Panel({ host }: { host: ToolHost }) {
  const es = host.lang === "es";
  const L = (a: string, b: string) => (es ? a : b);
  const [sel, setSel] = useState<string | null>(null);
  const list = scenes(host.project.book);
  const chars = host.cards.filter((c) => c.type === "character");
  const c = chars.find((x) => x.id === sel) ?? chars[0];
  const presencia = useMemo(() => list.map(({ scene }) => findRefs(plain(scene.content), chars).filter((r) => r.id === c?.id).length), [host.project.book, host.cards, c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || !list.length) return <p className="empty">{L("Necesitas capítulos o escenas y fichas de personaje.", "You need chapters or scenes and character cards.")}</p>;

  const arco: Arco = host.project.ext?.arcos?.[c.id] ?? { tipo: "positivo", hitos: {} };
  const guardar = (a: Arco) => host.setProject((p) => ({ ...p, ext: { ...p.ext, arcos: { ...p.ext?.arcos, [c.id]: a } } }));
  const poner = (id: HitoId, h: Partial<Hito>) => guardar({ ...arco, hitos: { ...arco.hitos, [id]: { ...arco.hitos[id], ...h } } });
  const r = revisar(arco, list.map((s) => s.scene.id), presencia);
  const nombre = (id: HitoId) => NOMBRES[id][es ? 0 : 1];
  const titulo = (i: number) => list[i].scene.title;

  const avisos = [
    ...(r.nunca ? [L("No aparece por su nombre en ningún capítulo.", "Their name appears in no chapter.")] : []),
    ...(r.faltan.length ? [L("Faltan momentos por situar: ", "Beats not placed yet: ") + r.faltan.map(nombre).join(", ") + "."] : []),
    ...r.desorden.map(([a, b]) => L(`«${nombre(b)}» está en un capítulo anterior a «${nombre(a)}».`, `“${nombre(b)}” sits in an earlier chapter than “${nombre(a)}”.`)),
    ...r.ausencias.map(([a, b]) => L(`Desaparece ${b - a + 1} capítulos: de «${titulo(a)}» a «${titulo(b)}».`, `Missing for ${b - a + 1} chapters: “${titulo(a)}” to “${titulo(b)}”.`)),
  ];

  // curva: x = capítulo, y = estado; si dos momentos caen en el mismo capítulo se reparten dentro de él
  const paso = 90, W = list.length * paso + 60, y = (v: number) => 110 - v * 40;
  const puntos = [...r.puestos].sort((a, b) => a.i - b.i).map((p, _, all) => {
    const juntos = all.filter((q) => q.i === p.i);
    return { ...p, x: 60 + paso * (p.i + (juntos.indexOf(p) + 1) / (juntos.length + 1)), y: y(p.valor) };
  });
  const curva = puntos.map((p, k) => (k ? `C${(puntos[k - 1].x + p.x) / 2} ${puntos[k - 1].y} ${(puntos[k - 1].x + p.x) / 2} ${p.y} ${p.x} ${p.y}` : `M${p.x} ${p.y}`)).join("");
  const mas = Math.max(1, ...presencia);

  return (
    <div className="panel relato">
      <div className="chips">
        {chars.map((x) => <button key={x.id} className={`chip ${x.id === c.id ? "on" : ""}`} aria-pressed={x.id === c.id} onClick={() => setSel(x.id)}>{x.name}</button>)}
      </div>
      <div className="row">
        <h3>{c.name}</h3>
        <label className="fld">{L("Tipo de arco", "Arc type")}
          <select value={arco.tipo} onChange={(e) => guardar({ ...arco, tipo: e.target.value as TipoArco })}>
            {(Object.keys(TIPOS) as TipoArco[]).map((k) => <option key={k} value={k}>{TIPOS[k][es ? 0 : 1]}</option>)}
          </select>
        </label>
        <span className="spacer" />
        <button onClick={() => host.openCard(c.id)}>{L("Abrir ficha", "Open card")}</button>
      </div>
      {/* los tres campos son los de la ficha: se editan en un sitio u otro */}
      <div className="columnas">
        <label className="campo">{host.t("card.lie")}<textarea rows={2} value={c.lie ?? ""} onChange={(e) => host.patchCard(c.id, { lie: e.target.value })} /></label>
        <label className="campo">{host.t("card.flaw")}<textarea rows={2} value={c.flaw ?? ""} onChange={(e) => host.patchCard(c.id, { flaw: e.target.value })} /></label>
        <label className="campo">{host.t("card.arc")}<textarea rows={2} value={c.arc ?? ""} onChange={(e) => host.patchCard(c.id, { arc: e.target.value })} /></label>
      </div>

      <div className="grafica">
        <svg viewBox={`0 0 ${W} 250`} width={W} height={250} role="img" aria-label={L(`Arco de ${c.name}`, `${c.name}'s arc`)}>
          {[2, 0, -2].map((v) => (
            <g key={v}>
              <line x1={52} x2={W} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v ? "3 5" : undefined} />
              <text className="eje" x={46} y={y(v) + 4} textAnchor="end">{v > 0 ? L("Pleno", "High") : v < 0 ? L("Hundido", "Low") : L("Neutro", "Even")}</text>
            </g>
          ))}
          {curva && <path d={curva} fill="none" stroke="var(--accent)" strokeWidth={2.5} />}
          {puntos.map((p) => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={6} fill="var(--accent)"><title>{`${nombre(p.id)} · ${titulo(p.i)}${p.nota ? "\n" + p.nota : ""}`}</title></circle>
              <text className="eje punto" x={p.x} y={p.y - 11} textAnchor="middle">{nombre(p.id)}</text>
            </g>
          ))}
          {list.map(({ scene }, i) => (
            <g key={scene.id} className="cap" onClick={() => host.openScene(scene.id)}>
              <title>{`${scene.title}: ${presencia[i]} ${L("menciones", "mentions")}`}</title>
              <rect x={62 + i * paso} y={210} width={paso - 4} height={16} rx={4} fill={presencia[i] ? "var(--accent)" : "var(--line)"} opacity={presencia[i] ? 0.3 + (0.7 * presencia[i]) / mas : 0.6} />
              <text className="eje" x={60 + i * paso + paso / 2} y={242} textAnchor="middle">{corto(scene.title)}</text>
            </g>
          ))}
          <text className="eje" x={46} y={222} textAnchor="end">{L("Presencia", "Presence")}</text>
        </svg>
      </div>

      {avisos.length > 0 && <ul className="avisos">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>}

      <div className="columnas">
        {HITOS.map((id, k) => {
          const h = arco.hitos[id] ?? {};
          return (
            <fieldset key={id} className="tarjeta-hito">
              <legend>{nombre(id)}</legend>
              <select aria-label={`${nombre(id)}: ${L("capítulo", "chapter")}`} value={h.scene ?? ""} onChange={(e) => poner(id, { scene: e.target.value || undefined })}>
                <option value="">{L("— Sin capítulo —", "— No chapter —")}</option>
                {list.map(({ scene, path }) => <option key={scene.id} value={scene.id}>{path ? `${path} · ${scene.title}` : scene.title}</option>)}
              </select>
              <textarea rows={3} aria-label={nombre(id)} placeholder={NOMBRES[id][es ? 2 : 3]} value={h.nota ?? ""} onChange={(e) => poner(id, { nota: e.target.value })} />
              <label className="fld">{L("Estado", "State")}
                <input type="range" min={-2} max={2} step={1} value={h.valor ?? VALOR[arco.tipo][k]} onChange={(e) => poner(id, { valor: Number(e.target.value) })} />
              </label>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

export const arcosPersonaje: ToolPlugin = { id: "arcos-personaje", name: "Arcos de personaje", Panel };
