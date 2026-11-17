import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { CARD_TYPES, CHAR_LONG, CHAR_SHORT, Card, CardType, Node, Project, Style, analyze, chronological, countWords, dialogueShare, diffVersions, mentions, plainText, scenes, search, today, writtenOn } from "./tree";
import { ask, confirmAsk } from "./dialog";
import { t } from "./i18n";

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

// ---------- Mapa de relaciones (nodos arrastrables, relaciones con flecha) ----------
interface Drag { id: string; ox: number; oy: number; px: number; py: number; x: number; y: number }

export function RelationMap({ cards, onSelect, onMove }: { cards: Card[]; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const R = 190, C = 250, r = 24;
  const base = (c: Card, i: number) => {
    if (c.x !== undefined && c.y !== undefined) return { x: c.x, y: c.y };
    const a = (2 * Math.PI * i) / cards.length - Math.PI / 2;
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  const pos = new Map(cards.map((c, i) => [c.id, drag?.id === c.id ? { x: drag.x, y: drag.y } : base(c, i)]));
  const pt = (e: PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const clamp = (v: number) => Math.min(475, Math.max(25, v));
  if (!cards.length) return <p className="empty">{t("map.empty")}</p>;
  return (
    <>
      <p className="muted hint">{t("map.hint")}</p>
      <svg
        ref={svg}
        className="map"
        viewBox="0 0 500 500"
        onPointerMove={(e) => { if (drag) { const p = pt(e); setDrag({ ...drag, x: clamp(p.x + drag.ox), y: clamp(p.y + drag.oy) }); } }}
        onPointerUp={() => {
          if (!drag) return;
          if (Math.hypot(drag.x - (drag.px + drag.ox), drag.y - (drag.py + drag.oy)) > 4) onMove(drag.id, Math.round(drag.x), Math.round(drag.y));
          else onSelect(drag.id);
          setDrag(null);
        }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
          </marker>
        </defs>
        {cards.flatMap((c) => (c.links ?? []).map((l, i) => {
          const a = pos.get(c.id)!, b = pos.get(l.to);
          if (!b) return null;
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (len < 2 * r) return null;
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          return (
            <g key={c.id + l.to + i}>
              <line x1={a.x + ux * r} y1={a.y + uy * r} x2={b.x - ux * (r + 2)} y2={b.y - uy * (r + 2)} stroke="var(--muted)" markerEnd="url(#arrow)" />
              <text className="edge" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle">{l.label}</text>
            </g>
          );
        }))}
        {cards.map((c) => {
          const p = pos.get(c.id)!;
          return (
            <g
              key={c.id}
              className="node"
              onPointerDown={(e) => {
                const s = pt(e);
                setDrag({ id: c.id, ox: p.x - s.x, oy: p.y - s.y, px: s.x, py: s.y, x: p.x, y: p.y });
                try { svg.current!.setPointerCapture(e.pointerId); } catch {} // sigue el arrastre fuera del nodo
              }}
            >
              <circle cx={p.x} cy={p.y} r={r} fill="var(--accent)" />
              <text className="name" x={p.x} y={p.y + r + 14} textAnchor="middle">{c.name}</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

// ---------- Estilo y progreso ----------
const level = (n: number) => t(`lv.${n < 40 ? 1 : n < 55 ? 2 : n < 65 ? 3 : n < 80 ? 4 : 5}` as "lv.1");

function Stats({ s, dialogue }: { s: Style; dialogue: number }) {
  const m: [string, string | number][] = [
    [t("stat.words"), s.words], [t("stat.sentences"), s.sentences], [t("stat.avg"), s.avgSentence], [t("stat.longest"), s.longest],
    [t("stat.adverbs"), s.adverbs], [t("stat.dialogue"), dialogue + " %"], [t("stat.read", { l: level(s.readability) }), s.readability],
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

export function Analysis({ book, current, cards, project, onDailyGoal }: { book: Node; current?: Node; cards: Card[]; project: Project; onDailyGoal: (n: number) => void }) {
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
      <Stats s={analyze(plainText(book), names)} dialogue={dialogueShare(book)} />
      {current && current.kind !== "book" && (
        <>
          <h3>{current.title}</h3>
          <Stats s={analyze(plainText(current), names)} dialogue={dialogueShare(current)} />
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
