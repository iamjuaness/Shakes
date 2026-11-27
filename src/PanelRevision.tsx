// Pestaña «Cambios»: revisar una versión anterior o lo que devuelve un lector, cambio a cambio, y los comentarios.
import { useState } from "react";
import { abrirRevision, cambios, decidir, piezasDe } from "./revision";
import type { Comentario, Revision } from "./revision";
import { leerParaRevisar } from "./importing";
import { newNode, scenes, snapshot, update } from "./tree";
import type { Node, Project } from "./tree";
import { getLang, t } from "./i18n";

const MAX = 150; // cambios a la vista por capítulo: los siguientes salen al resolver estos

export function RevisionPanel({ project, setProject, onOpen, onTexto }: { project: Project; setProject: (f: (p: Project) => Project) => void; onOpen: (id: string) => void; onTexto: () => void }) {
  const r: Revision | undefined = project.ext?.revision;
  const comentarios: Comentario[] = project.ext?.comentarios ?? [];
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  const [hechos, setHechos] = useState(false);
  const capitulos = scenes(project.book).map((s) => ({ ...s.scene, nombre: s.path ? `${s.path} › ${s.scene.title}` : s.scene.title }));
  const ext = (p: Project, patch: Record<string, unknown>) => ({ ...p, ext: { ...p.ext, ...patch } });

  // Antes de empezar se guarda una versión: siempre se puede volver.
  const empezar = (sesion: Revision, mas: Comentario[] = []) => setProject((p) => ext(snapshot(p, t("rev.snap"), true), { revision: sesion, comentarios: [...(p.ext?.comentarios ?? []), ...mas] }));
  function conVersion() {
    const v = project.versions.find((x) => x.id === version) ?? project.versions[0];
    if (v) empezar(abrirRevision(project.book, v.book, v.label, false));
  }
  async function conArchivo() {
    setError("");
    try {
      const f = await leerParaRevisar();
      if (!f) return;
      const sesion = abrirRevision(project.book, f.libro, f.nombre, true, f.sinTablas);
      const por = (titulo: string) => capitulos.find((c) => c.title.trim().toLowerCase() === titulo.trim().toLowerCase()) ?? capitulos.find((c) => (c.content ?? "").includes(titulo));
      const nuevos = f.comentarios.map((c): Comentario => ({ id: crypto.randomUUID(), cap: (por(c.capitulo) ?? capitulos.find((x) => (x.content ?? "").includes(c.cita)) ?? capitulos[0])?.id ?? "", cita: c.cita, texto: c.texto, autor: c.autor, fecha: new Date().toISOString() }));
      empezar(sesion, nuevos);
    } catch { setError(t("imp.bad")); }
  }

  function resolver(cap: Node, acepta: boolean, id?: number) {
    setProject((p) => {
      const sesion: Revision = p.ext!.revision;
      const actual = scenes(p.book).find((s) => s.scene.id === cap.id)?.scene;
      if (!actual) return p;
      const x = decidir(sesion, piezasDe(sesion, cap.id, actual.content ?? ""), acepta, id);
      return ext({ ...p, book: update(p.book, cap.id, (n) => ({ ...n, content: x.mio })) }, { revision: { ...sesion, otro: { ...sesion.otro, [cap.id]: x.otro } } });
    });
    onTexto();
  }
  const quitarNuevo = (i: number, anadir: boolean) => setProject((p) => {
    const sesion: Revision = p.ext!.revision, n = sesion.nuevos[i];
    const cap = { ...newNode("chapter", 0), title: n.titulo, content: n.html };
    const libro = !anadir ? p.book : p.book.kind === "book" ? { ...p.book, children: [...p.book.children, cap] } : { ...p.book, children: p.book.children.map((b, k, a) => (k === a.length - 1 ? { ...b, children: [...b.children, cap] } : b)) };
    return ext({ ...p, book: libro }, { revision: { ...sesion, nuevos: sesion.nuevos.filter((_, k) => k !== i) } });
  });

  const pendientes = r ? capitulos.map((c) => ({ c, lista: cambios(piezasDe(r, c.id, c.content ?? "")) })).filter((x) => x.lista.length) : [];
  const total = pendientes.reduce((n, x) => n + x.lista.length, 0);
  const visibles = comentarios.filter((c) => hechos || !c.hecho);
  const comentario = (id: string, f: (c: Comentario) => Comentario | null) => setProject((p) => ext(p, { comentarios: (p.ext?.comentarios ?? []).flatMap((c: Comentario) => (c.id === id ? f(c) ?? [] : c)) }));

  return (
    <div className="panel revision">
      <h3>{t("rev.titulo")}</h3>
      {!r ? (
        <>
          <p className="muted">{t("rev.ayuda")}</p>
          <div className="row">
            <button className="on" onClick={conArchivo}>{t("rev.archivo")}</button>
          </div>
          {project.versions.length > 0 && (
            <div className="row">
              <label>{t("rev.version")} <select value={version} onChange={(e) => setVersion(e.target.value)}>
                {project.versions.map((v) => <option key={v.id} value={v.id}>{v.label} · {new Date(v.at).toLocaleString(getLang())}</option>)}
              </select></label>
              <button onClick={conVersion}>{t("rev.comparar")}</button>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
        </>
      ) : (
        <>
          <div className="row">
            <strong>{t(r.entrante ? "rev.de" : "rev.desde", { n: r.nombre })}</strong>
            <span className="muted">{t("rev.pendientes", { n: total })}</span>
            <span className="spacer" />
            <button onClick={() => setProject((p) => { const { revision: _, ...resto } = p.ext ?? {}; return { ...p, ext: resto }; })}>{t("rev.terminar")}</button>
          </div>
          {!total && !r.nuevos.length && <p className="mq-ok">✓ {t("rev.nada")}</p>}
          {r.nuevos.map((n, i) => (
            <div key={i} className="cambio">
              <p>{t("rev.capNuevo", { n: n.titulo })}</p>
              <div className="row"><button className="on" onClick={() => quitarNuevo(i, true)}>{t("rev.anadir")}</button><button onClick={() => quitarNuevo(i, false)}>{t("rev.descartar")}</button></div>
            </div>
          ))}
          {pendientes.map(({ c, lista }, k) => (
            <details key={c.id} open={k === 0}>
              <summary>{c.nombre} · {lista.length}</summary>
              <div className="row">
                <button onClick={() => resolver(c, true)}>{t("rev.todoSi")}</button>
                <button onClick={() => resolver(c, false)}>{t("rev.todoNo")}</button>
                <button onClick={() => onOpen(c.id)}>{t("rev.abrir")}</button>
              </div>
              {lista.slice(0, MAX).map((x) => (
                <div key={x.id} className="cambio">
                  <p>…{x.previo}{x.antes && <del>{x.antes}</del>}{x.antes && x.despues ? " " : ""}{x.despues && <ins>{x.despues}</ins>}{x.siguiente}…</p>
                  <div className="row">
                    <button onClick={() => resolver(c, true, x.id)}>✓ {t("rev.aceptar")}</button>
                    <button onClick={() => resolver(c, false, x.id)}>✕ {t("rev.rechazar")}</button>
                  </div>
                </div>
              ))}
              {lista.length > MAX && <p className="muted">{t("rev.mas", { n: lista.length - MAX })}</p>}
            </details>
          ))}
        </>
      )}

      <h3>{t("com.titulo")}</h3>
      <label className="check"><input type="checkbox" checked={hechos} onChange={(e) => setHechos(e.target.checked)} />{t("com.verHechos")}</label>
      {!visibles.length && <p className="muted">{t("com.vacio")}</p>}
      {visibles.map((c) => (
        <div key={c.id} className={`cambio ${c.hecho ? "hecho" : ""}`}>
          <p className="muted">{capitulos.find((x) => x.id === c.cap)?.nombre ?? "—"}{c.autor && ` · ${c.autor}`}</p>
          {c.cita && <blockquote>{c.cita}</blockquote>}
          <p>{c.texto}</p>
          <div className="row">
            <button onClick={() => comentario(c.id, (x) => ({ ...x, hecho: !x.hecho }))}>{c.hecho ? t("com.reabrir") : t("com.hecho")}</button>
            {capitulos.some((x) => x.id === c.cap) && <button onClick={() => onOpen(c.cap)}>{t("rev.abrir")}</button>}
            <button onClick={() => comentario(c.id, () => null)}>{t("com.borrar")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
