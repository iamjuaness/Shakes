import { useMemo, useState } from "react";
import { CARD_TYPES, CHAR_LONG, CHAR_SHORT, Card, CardType, Node, Project, Style, analyze, chronological, countWords, dialogueShare, diffVersions, esObra, mentions, plainText, scenes, search, today, writtenOn } from "./tree";
import { ask, confirmAsk } from "./dialog";
import { t } from "./i18n";
import { curve, layout } from "./mapLayout";
import { BotonesZoom, COLORES, PERSONA, useLienzo } from "../plugins/herramientas/_comun/lienzo";

// ---------- Línea de tiempo ----------
export function Timeline({ book, onSelect, onDate }: { book: Node; onSelect: (id: string) => void; onDate: (id: string, date: string) => void }) {
  const [chrono, setChrono] = useState(false);
  const list = scenes(book);
  const shown = chrono ? chronological(list) : list;
  return (
    <div className="panel">
      <div className="row">
        <button className={!chrono ? "on" : ""} onClick={() => setChrono(false)}>{t("tl.narr")}</button>
        <button className={chrono ? "on" : ""} onClick={() => setChrono(true)}>{t("tl.chrono")}</button>
        <span className="muted">{t("tl.hint")}</span>
      </div>
      <ol className="timeline">
        {shown.map(({ scene, path }) => (
          <li key={scene.id} onClick={() => onSelect(scene.id)}>
            <div className="tl-row">
              <b>{scene.title}</b>
              <input type="date" aria-label={t("tl.dateOf", { t: scene.title })} value={scene.date ?? ""} onClick={(e) => e.stopPropagation()} onChange={(e) => onDate(scene.id, e.target.value)} />
            </div>
            <span className="muted">{path} · {t("words.n", { n: countWords(scene.content) })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------- Mapa de conexiones entre fichas (orden automático, zoom, nodos arrastrables, relaciones curvas con flecha) ----------
interface Drag { id: string; ox: number; oy: number; px: number; py: number; x: number; y: number }
// icono de cada tipo de ficha, dibujado en una caja de 24×24
const ICONS: Record<CardType, string> = {
  character: PERSONA,
  place: "M12 2 1 12h3v10h6v-6h4v6h6V12h3z",
  object: "M12 2l9 4.500-9 4.500-9-4.500zM2 8.500l9 4.500v9l-9-4.500zM22 8.500l-9 4.500v9l9-4.500z",
  faction: "M12 1 3 5v6c0 6 4 10 9 12 5-2 9-6 9-12V5z",
};

export function RelationMap({ cards, onSelect, onMove, onReorder }: { cards: Card[]; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void; onReorder: () => void }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const auto = useMemo(() => layout(cards.map((c) => c.id), cards.flatMap((c) => (c.links ?? []).map((l): [string, string] => [c.id, l.to]))), [cards]);
  const placed = new Map(cards.map((c) => [c.id, c.x !== undefined && c.y !== undefined ? { x: c.x, y: c.y } : auto.get(c.id)!]));
  const pos = drag ? new Map(placed).set(drag.id, { x: drag.x, y: drag.y }) : placed;
  const links = cards.flatMap((c) => (c.links ?? []).filter((l) => l.to !== c.id && placed.has(l.to)).map((l) => ({ from: c, to: l.to, text: l.label, pair: [c.id, l.to].sort().join() })));
  // cuantas más conexiones, más grande el nodo
  const degree = new Map<string, number>();
  for (const l of links) for (const id of [l.from.id, l.to]) degree.set(id, (degree.get(id) ?? 0) + 1);
  const most = Math.max(1, ...degree.values());
  const radius = (id: string) => 20 + (16 * (degree.get(id) ?? 0)) / most;
  // misma relación, mismo color: así se distinguen las de una misma pareja
  const kinds = [...new Set(links.map((l) => l.text.trim().toLowerCase()))];
  const edges = links.flatMap((l, k) => {
    const same = links.filter((o) => o.pair === l.pair);
    const g = curve(pos.get(l.from.id)!, pos.get(l.to)!, same.indexOf(l), same.length, l.from.id > l.to, Math.max(...same.map((o) => o.text.length)) * 7 + 12, radius(l.from.id), radius(l.to));
    const color = kinds.indexOf(l.text.trim().toLowerCase()) % COLORES.length;
    return g ? [{ ...l, ...g, color, key: k, dim: !!hover && hover !== l.from.id && hover !== l.to }] : [];
  });
  const near = new Set(links.flatMap((l) => (l.from.id === hover ? [l.to] : l.to === hover ? [l.from.id] : [])).concat(hover ?? []));
  // el encuadre se calcula sin el arrastre en curso, para que no se mueva bajo el cursor
  const xs = [...placed.values()].map((p) => p.x), ys = [...placed.values()].map((p) => p.y);
  const w = Math.max(600, Math.max(...xs) - Math.min(...xs) + 200), h = Math.max(450, Math.max(...ys) - Math.min(...ys) + 200);
  const fit = { x: (Math.max(...xs) + Math.min(...xs) - w) / 2, y: (Math.max(...ys) + Math.min(...ys) - h) / 2, w, h };
  const lienzo = useLienzo(fit, !!cards.length);
  const pt = lienzo.point, svg = lienzo.svg;
  if (!cards.length) return <p className="empty">{t("map.empty")}</p>;
  return (
    <>
      <div className="row hint">
        <span className="muted">{t("map.hint")}</span>
        <BotonesZoom lienzo={lienzo} />
        {cards.some((c) => c.x !== undefined) && <button onClick={onReorder}>{t("map.reorder")}</button>}
      </div>
      <svg
        ref={svg}
        className="map"
        aria-label={t("map.title")}
        viewBox={lienzo.viewBox}
        onPointerDown={lienzo.panStart} // arrastrar el fondo desplaza el mapa
        onPointerMove={(e) => {
          if (drag) { const p = pt(e); setDrag({ ...drag, x: p.x + drag.ox, y: p.y + drag.oy }); }
          lienzo.panMove(e);
        }}
        onPointerCancel={() => { lienzo.panEnd(); setDrag(null); }}
        onPointerUp={() => {
          lienzo.panEnd();
          if (!drag) return;
          if (Math.hypot(drag.x - (drag.px + drag.ox), drag.y - (drag.py + drag.oy)) > 4) onMove(drag.id, Math.round(drag.x), Math.round(drag.y));
          else onSelect(drag.id);
          setDrag(null);
        }}
      >
        <defs>
          {COLORES.map((color, i) => (
            <marker key={color} id={`arrow${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" fill={color} />
            </marker>
          ))}
        </defs>
        {edges.map((e) => (
          <path key={e.key} className={`link ${e.dim ? "dim" : ""}`} d={e.path} stroke={COLORES[e.color]} markerEnd={`url(#arrow${e.color})`}>
            <title>{`${e.from.name} → ${e.text} → ${cards.find((c) => c.id === e.to)!.name}`}</title>
          </path>
        ))}
        {cards.map((c) => {
          const p = pos.get(c.id)!, r = radius(c.id);
          return (
            <g
              key={c.id}
              className={`node ${hover && !near.has(c.id) ? "dim" : ""}`}
              onPointerEnter={() => setHover(c.id)}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
                const s = pt(e);
                setDrag({ id: c.id, ox: p.x - s.x, oy: p.y - s.y, px: s.x, py: s.y, x: p.x, y: p.y });
                try { svg.current!.setPointerCapture(e.pointerId); } catch {} // sigue el arrastre fuera del nodo
              }}
            >
              <circle cx={p.x} cy={p.y} r={r} fill="var(--bg)" />
              <path d={ICONS[c.type]} transform={`translate(${p.x - r} ${p.y - r}) scale(${r / 12})`} fill="var(--accent)">
                <title>{t(`type.${c.type}`)}</title>
              </path>
              <text className="name" x={p.x} y={p.y + r + 17} textAnchor="middle">{c.name}</text>
            </g>
          );
        })}
        {edges.map((e) => (
          <text key={e.key} className={`edge ${e.dim ? "dim" : ""}`} x={e.label.x} y={e.label.y + 4} textAnchor="middle" fill={COLORES[e.color]}>
            {e.text}
          </text>
        ))}
      </svg>
    </>
  );
}

// ---------- Estilo y progreso ----------
const level = (n: number) => t(`lv.${n < 40 ? 1 : n < 55 ? 2 : n < 65 ? 3 : n < 80 ? 4 : 5}` as "lv.1");

// `es`: adverbios en -mente y legibilidad INFLESZ solo tienen sentido en español.
function Stats({ s, dialogue, es }: { s: Style; dialogue: number; es: boolean }) {
  const m: [string, string | number][] = [
    [t("stat.words"), s.words], [t("stat.sentences"), s.sentences], [t("stat.avg"), s.avgSentence], [t("stat.longest"), s.longest],
    ...(es ? [[t("stat.adverbs"), s.adverbs] as [string, number]] : []), [t("stat.dialogue"), dialogue + " %"], ...(es ? [[t("stat.read", { l: level(s.readability) }), s.readability] as [string, number]] : []),
  ];
  return (
    <>
      <div className="stats">{m.map(([l, v]) => <div className="stat" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      <p className="muted">{t("stat.top")}</p>
      <div className="chips">{s.top.map(([w, n]) => <span className="chip" key={w}>{w} · {n}</span>) || null}</div>
      {s.near.length > 0 && (
        <>
          <p className="muted">{t("stat.near")}</p>
          <div className="chips">{s.near.map(([w, n]) => <span className="chip warnchip" key={w}>{w} · {n}</span>)}</div>
        </>
      )}
    </>
  );
}

export function Analysis({ book, current, cards, project, onDailyGoal, lang }: { book: Node; current?: Node; cards: Card[]; project: Project; onDailyGoal: (n: number) => void; lang: string }) {
  const es = /^es(-|$)/i.test(lang);
  const names = cards.map((c) => c.name);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toLocaleDateString("sv"); });
  const max = Math.max(project.dailyGoal, 1, ...days.map((d) => writtenOn(project.log, d)));
  return (
    <div className="panel">
      <div className="row"><h3 style={{ margin: 0 }}>{t("prog.title")}</h3><span className="spacer" /><label className="fld">{t("prog.goal.label")}<input type="number" min={0} className="goal" placeholder="0" value={project.dailyGoal || ""} onChange={(e) => onDailyGoal(Math.max(0, Math.floor(Number(e.target.value))) || 0)} /></label></div>
      <div className="days">
        {days.filter((d) => d === today() || project.log[d]).map((d) => {
          const n = writtenOn(project.log, d);
          return (
            <div className="day" key={d}>
              <span className="muted">{d === today() ? t("prog.today") : d}</span>
              <div className="bar"><i style={{ width: `${(n / max) * 100}%` }} className={project.dailyGoal && n >= project.dailyGoal ? "done" : ""} /></div>
              <span>{n}</span>
            </div>
          );
        })}
      </div>
      <h3>{t("prog.book")}</h3>
      <Stats es={es} s={analyze(plainText(book), names)} dialogue={dialogueShare(book)} />
      {current && current.id !== book.id && !esObra(current.kind) && (
        <>
          <h3>{current.title}</h3>
          <Stats es={es} s={analyze(plainText(current), names)} dialogue={dialogueShare(current)} />
        </>
      )}
    </div>
  );
}

// ---------- Versiones (con comparación contra el texto actual) ----------
export function Versions({ project, onSave, onRestore, onDelete }: {
  project: Project;
  onSave: (label: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="panel">
      <button onClick={async () => { const l = await ask(t("ver.name"), new Date().toLocaleString()); if (l !== null) onSave(l); }}>{t("ver.save")}</button>
      <ul className="versions">
        {project.versions.map((v) => {
          const d = open === v.id ? diffVersions(v.book, project.book) : null;
          return (
            <li key={v.id}>
              <div className="v-head">
                <span>{v.label || t("ver.noName")}{v.auto && <em className="muted">{t("ver.auto")}</em>}<span className="muted">{new Date(v.at).toLocaleString()}</span></span>
                <button onClick={() => setOpen(open === v.id ? null : v.id)}>{d ? t("ver.hide") : t("ver.compare")}</button>
                <button onClick={async () => (await confirmAsk(t("ver.restoreAsk"))) && onRestore(v.id)}>{t("ver.restore")}</button>
                <button aria-label={t("ver.delete")} onClick={async () => (await confirmAsk(t("ver.deleteAsk"))) && onDelete(v.id)}>×</button>
              </div>
              {d && (
                <div className="diff">
                  <p>{t("ver.vs", { d: (d.wordDelta >= 0 ? "+" : "") + d.wordDelta })}</p>
                  {([[t("ver.changed"), d.changed], [t("ver.added"), d.added], [t("ver.removed"), d.removed]] as const).map(([l, list]) =>
                    list.length > 0 && <p key={l}><b>{l}:</b> {list.map((s) => s.scene.title).join(", ")}</p>)}
                  {!d.changed.length && !d.added.length && !d.removed.length && <p className="muted">{t("ver.same")}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!project.versions.length && <p className="muted">{t("ver.none")}</p>}
    </div>
  );
}

// ---------- Corcho ----------
export function Corkboard({ book, onSelect, onSummary }: { book: Node; onSelect: (id: string) => void; onSummary: (id: string, text: string) => void }) {
  const list = scenes(book);
  if (!list.length) return <p className="empty">{t("cork.empty")}</p>;
  return (
    <div className="cork">
      {list.map(({ scene, path }) => (
        <div className="note" key={scene.id}>
          <button className="linklike" onClick={() => onSelect(scene.id)}>{scene.title}</button>
          <span className="muted">{path}{scene.status && <span className={`chip st-${scene.status}`}>{t(`status.${scene.status}`)}</span>}</span>
          <textarea aria-label={t("cork.synopsisOf", { t: scene.title })} placeholder={t("cork.synopsis")} value={scene.summary ?? ""} onChange={(e) => onSummary(scene.id, e.target.value)} />
          <span className="muted">{countWords(scene.content)}{scene.goal ? ` / ${scene.goal}` : ""} {t("stat.words")}{scene.date ? ` · ${scene.date}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Búsqueda global ----------
export function SearchPanel({ book, onOpen, onReplace }: { book: Node; onOpen: (id: string) => void; onReplace: (q: string, r: string) => void }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const hits = search(book, q);
  const total = hits.reduce((t, h) => t + h.count, 0);
  return (
    <div className="panel">
      <div className="row">
        <input type="text" autoFocus placeholder={t("se.find")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <input type="text" placeholder={t("se.replaceWith")} value={r} onChange={(e) => setR(e.target.value)} style={{ flex: 1 }} />
        <button disabled={!total} onClick={() => onReplace(q, r)}>{t("se.replaceAll")}</button>
      </div>
      {q && <p className="muted">{t("se.hits", { n: total, s: hits.length })}</p>}
      <ul className="hits">
        {hits.map((h) => (
          <li key={h.scene.id} onClick={() => onOpen(h.scene.id)}>
            <b>{h.scene.title}</b> <span className="chip">{h.count}</span>
            <div className="muted">{h.path}</div>
            <div>{h.snippet}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Ficha ----------
export function CardForm({ card, cards, book, onPatch, onDelete, onOpenScene, onBack }: {
  card: Card;
  cards: Card[];
  book: Node;
  onPatch: (p: Partial<Card>) => void;
  onDelete: () => void;
  onOpenScene: (id: string) => void;
  onBack?: () => void;
}) {
  const where = mentions(book, card.name, card.alias);
  return (
    <div className="card-form">
      <input aria-label={t("card.name")} value={card.name} onChange={(e) => onPatch({ name: e.target.value })} />
      <select aria-label={t("card.type")} value={card.type} onChange={(e) => onPatch({ type: e.target.value as CardType })}>
        {CARD_TYPES.map((k) => <option key={k} value={k}>{t(`type.${k}`)}</option>)}
      </select>
      {card.type === "character" ? (
        <>
          <label className="cf">{t("card.alias")}<input placeholder={t("card.alias.ph")} value={card.alias ?? ""} onChange={(e) => onPatch({ alias: e.target.value })} /></label>
          {CHAR_SHORT.map((f) => <label className="cf" key={f}>{t(`card.${f}`)}<input value={card[f] ?? ""} onChange={(e) => onPatch({ [f]: e.target.value })} /></label>)}
          {CHAR_LONG.map((f) => <label className="cf" key={f}><h4>{t(`card.${f}`)}</h4><textarea rows={3} value={card[f] ?? ""} onChange={(e) => onPatch({ [f]: e.target.value })} /></label>)}
          {card.notes && <label className="cf"><h4>{t("card.notes.extra")}</h4><textarea rows={3} value={card.notes} onChange={(e) => onPatch({ notes: e.target.value })} /></label>}
        </>
      ) : <textarea placeholder={t("card.notes")} value={card.notes} onChange={(e) => onPatch({ notes: e.target.value })} />}
      <div className="links">
        <b>{t("card.links")}</b>
        {(card.links ?? []).map((l, i) => (
          <div key={i} className="row">
            {cards.find((c) => c.id === l.to)?.name ?? t("card.deleted")} — {l.label}
            <button aria-label={t("card.unlink")} onClick={() => onPatch({ links: (card.links ?? []).filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <select value="" aria-label={t("card.relateWith")} onChange={async (e) => {
          const to = e.target.value;
          const label = to ? await ask(t("card.relType")) : null;
          if (to && label) onPatch({ links: [...(card.links ?? []), { to, label }] });
        }}>
          <option value="">{t("card.relate")}</option>
          {cards.filter((c) => c.id !== card.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="links">
        <b>{t("card.appears")}</b>
        {where.length ? (
          <div className="chips">{where.map(({ scene }) => <button key={scene.id} className="chip" onClick={() => onOpenScene(scene.id)}>{scene.title}</button>)}</div>
        ) : <span className="muted">{t("card.noScenes", { name: card.name })}</span>}
      </div>
      {onBack && <button onClick={onBack}>{t("card.back")}</button>}
      <button onClick={onDelete}>{t("card.delete")}</button>
    </div>
  );
}
