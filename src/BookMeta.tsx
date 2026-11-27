import { FORMATOS, esObra } from "./tree";
import type { Formato, Meta, Node } from "./tree";
import { t } from "./i18n";
import { elegirImagen } from "./imagen";

// Datos editoriales de un libro, saga o universo: salen en la portada de Word, EPUB, PDF, Markdown, LaTeX y Fountain.
export function BookMeta({ node, onChange }: { node: Node; onChange: (m: Meta) => void }) {
  const m = node.meta ?? {};
  const set = (p: Partial<Meta>) => onChange({ ...m, ...p });
  const kind = t(`kind.${node.kind}`);
  // ≤900 px: el .shks guarda la portada dentro (la de imprenta, en alta, se elige en Maquetar › Cubierta).
  const pick = () => elegirImagen(900).then((r) => r && set({ cover: r.url, cw: r.w, ch: r.h }), () => { /* imagen ilegible: no se cambia nada */ });
  return (
    <div className="panel bookmeta">
      <h3>{t("bm.title", { k: kind, t: node.title })}</h3>
      {esObra(node.kind) && (
        <label>{t("bm.formato")}
          <select value={m.formato ?? (node.kind === "script" ? "film" : "novel")} onChange={(e) => set({ formato: e.target.value as Formato })}>
            {(Object.keys(FORMATOS) as Formato[]).filter((f) => FORMATOS[f].base === node.kind).map((f) => <option key={f} value={f}>{t(`pl.${f === "novel" ? "book" : f === "film" ? "script" : f}` as "pl.book")}</option>)}
          </select>
        </label>
      )}
      <label>{t("bm.author")}<input value={m.author ?? ""} onChange={(e) => set({ author: e.target.value })} /></label>
      <label>{t("bm.year")}<input value={m.year ?? ""} inputMode="numeric" onChange={(e) => set({ year: e.target.value })} /></label>
      <label>{t("bm.blurb")}<textarea rows={5} value={m.blurb ?? ""} onChange={(e) => set({ blurb: e.target.value })} /></label>
      <div className="row">
        {m.cover ? <img className="cover" src={m.cover} alt={t("bm.coverOf", { t: node.title })} /> : <span className="muted">{t("bm.noCover")}</span>}
        <button onClick={pick}>{m.cover ? t("bm.change") : t("bm.pick")}</button>
        {m.cover && <button onClick={() => set({ cover: undefined, cw: undefined, ch: undefined })}>{t("bm.remove")}</button>}
      </div>
      <p className="muted">{t("bm.hint")}</p>
    </div>
  );
}
