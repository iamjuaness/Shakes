import { L } from "../_comun/idioma";
import { totalWords } from "../../../src/tree";
import { confirmAsk } from "../../../src/dialog";
import { Campo } from "../_comun/formulario";
import { guardar } from "../_comun/guardar";
import type { ToolHost, ToolPlugin } from "../types";
import { TAREAS, campos, carta, contar, dossierMd, tareaVisible } from "./dossier";
import type { Dossier } from "./dossier";

function Panel({ host }: { host: ToolHost }) {
  const id = host.scope.id;
  const d: Dossier = host.project.ext?.publicacion?.[id] ?? {};
  const set = (x: Partial<Dossier>) => host.setProject((p) => ({ ...p, ext: { ...p.ext, publicacion: { ...p.ext?.publicacion, [id]: { ...p.ext?.publicacion?.[id], ...x } } } }));
  const titulo = host.scope.title, autor = host.scope.meta?.author ?? "";
  return (
    <div className="panel">
      <h3>{L("Dossier de", "Dossier for")} «{titulo}»</h3>
      {campos().map((c) => (
        <div key={c.id}>
          <Campo label={c.nombre} filas={c.filas} placeholder={c.ayuda} value={d[c.id]} onChange={(v) => set({ [c.id]: v })} />
          {c.max && <p className="muted">{contar(d[c.id])} / {c.max} {L("palabras recomendadas", "recommended words")}{contar(d[c.id]) > c.max ? L(" ⚠ te pasas", " ⚠ too long") : ""}</p>}
        </div>
      ))}
      <h3>{L("Carta de presentación", "Query letter")}</h3>
      <button onClick={async () => { if (!d.carta?.trim() || (await confirmAsk(L("¿Reemplazar la carta actual por un borrador nuevo?", "Replace the current letter with a new draft?")))) set({ carta: carta(d, titulo, autor, totalWords(host.scope)) }); }}>{L("Redactar borrador con estos datos", "Draft it from these details")}</button>
      <Campo label={L("Carta", "Letter")} filas={14} value={d.carta} onChange={(v) => set({ carta: v })} />
      <h3>{L("Antes de publicar", "Before publishing")}</h3>
      {TAREAS.map((t) => (
        <label className="check" key={t}><input type="checkbox" checked={d.hechos?.includes(t) ?? false} onChange={(e) => set({ hechos: e.target.checked ? [...(d.hechos ?? []), t] : (d.hechos ?? []).filter((x) => x !== t) })} />{tareaVisible(t)}</label>
      ))}
      <p><button className="on" onClick={async () => { const n = await guardar(`${titulo} - dossier.md`, dossierMd(d, titulo, autor), "text/markdown"); if (n) host.notify(L(`Dossier guardado: ${n}`, `Dossier saved: ${n}`)); }}>{L("Guardar dossier (.md)", "Save dossier (.md)")}</button></p>
    </div>
  );
}

export const kitPublicacion: ToolPlugin = { id: "kit-publicacion", name: "Kit de publicación", Panel };
