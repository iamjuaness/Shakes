// Pestaña «Maquetar»: ajustes a la izquierda y vista previa a la derecha. Interior (páginas enfrentadas) o cubierta
// completa (contraportada, lomo y portada), cada una con su PDF.
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FUENTES, PREAJUSTES, ajustesDe, preajuste } from "./maqueta/ajustes";
import type { Ajustes, NombreFuente } from "./maqueta/ajustes";
import { componer, revisar } from "./maqueta/componer";
import type { Maqueta, Pagina } from "./maqueta/componer";
import { cubierta } from "./maqueta/cubierta";
import { maquetaPdf } from "./maqueta/pdf";
import { anadirFuentes, cargarFamilia, fuentesPropias, pilaCss } from "./maqueta/cargar";
import { cargarGuiones, hayGuiones } from "./maqueta/guiones";
import type { Cortar } from "./maqueta/guiones";
import type { Familia } from "./maqueta/fuentes";
import type { Node } from "./tree";
import { elegirImagen } from "./imagen";
import { saveBlob } from "./fileio";
import { getLang, t } from "./i18n";
import type { Key } from "./i18n";

function Hoja({ p, m, fuente, familia, numero, guias }: { p?: Pagina; m: Maqueta; fuente: NombreFuente; familia: Familia; numero: number; guias?: { x: number; y: number; w: number; h: number }[] }) {
  if (!p) return <div className="hoja vacia" style={{ aspectRatio: `${m.w} / ${m.h}` }} />;
  const rects = (encima: boolean) => (p.rects ?? []).filter((r) => !!r.encima === encima).map((r, i) => <rect key={`${encima}${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} />);
  return (
    <svg className="hoja" viewBox={`0 0 ${m.w} ${m.h}`} role="img" aria-label={`${t("mq.page")} ${numero}: ${p.textos.map((x) => x.s).join(" ")}`}>
      {rects(false)}
      {(p.imagenes ?? []).map((i, k) => (
        <g key={k}>
          {i.marco && <clipPath id={`mq-marco-${numero}-${k}`}><rect x={i.marco.x} y={i.marco.y} width={i.marco.w} height={i.marco.h} /></clipPath>}
          <image href={i.src} x={i.x} y={i.y} width={i.w} height={i.h} preserveAspectRatio="none" clipPath={i.marco ? `url(#mq-marco-${numero}-${k})` : undefined} />
        </g>
      ))}
      {rects(true)}
      {p.textos.map((x, i) => (
        <text key={i} x={x.x} y={x.y} fontSize={x.size} xmlSpace="preserve" transform={x.giro ? `rotate(90 ${x.x} ${x.y})` : undefined}
          style={{ ...(x.color ? { fill: x.color } : {}), ...(fuente === "courier"
            ? { fontFamily: "'Courier New', Courier, monospace", fontWeight: x.f.startsWith("b") ? 700 : 400, fontStyle: x.f.endsWith("i") ? "italic" : "normal" }
            : { fontFamily: pilaCss(fuente, x.f, familia[x.f].partes.length) }) }}
          {...(fuente === "courier" ? { textLength: [...x.s].length * x.size * 0.6, lengthAdjust: "spacingAndGlyphs" } : {})}>{x.s}</text>
      ))}
      {guias?.map((g, i) => <rect key={`g${i}`} className="mq-guia" x={g.x} y={g.y} width={g.w} height={g.h} />)}
    </svg>
  );
}

export function MaquetaPanel({ obra, lang, guardado, onChange, onPdf, onMeta }: { obra: Node; lang: string; guardado?: Partial<Ajustes>; onChange: (a: Ajustes) => void; onPdf: () => void; onMeta: () => void }) {
  const a = ajustesDe(guardado);
  const set = (p: Partial<Ajustes>) => onChange({ ...a, ...p });
  const [fam, setFam] = useState<{ nombre: string; f: Familia; cortar?: Cortar } | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [propias, setPropias] = useState<string[]>([]);
  const [modo, setModo] = useState<"interior" | "cubierta">("interior");
  const [guias, setGuias] = useState(true);
  const [pliego, setPliego] = useState(0); // pliego 0: solo la página 1; pliego n: páginas 2n y 2n+1
  const releer = () => fuentesPropias().then((f) => setPropias(Object.keys(f)));
  useEffect(() => { releer(); }, []);
  useEffect(() => {
    let vivo = true;
    setError("");
    Promise.all([cargarFamilia(a.fuente), cargarGuiones(lang)]).then(
      ([f, cortar]) => vivo && setFam({ nombre: a.fuente, f, cortar }),
      () => vivo && setError(t("mq.error")));
    return () => { vivo = false; };
  }, [a.fuente, lang, propias.length]);

  const clave = useDeferredValue(JSON.stringify(a)); // no recomponer en cada tecla
  const m = useMemo(() => {
    const x: Ajustes = JSON.parse(clave);
    return fam && fam.nombre === x.fuente ? { m: componer(obra, x, fam.f, lang, fam.cortar), a: x } : null;
  }, [obra, clave, fam, lang]);
  const cub = useMemo(() => {
    if (modo !== "cubierta" || !m || !fam) return null;
    const portada = obra.meta?.cover?.startsWith("data:image/jpeg") ? { src: obra.meta.cover, w: obra.meta.cw || 600, h: obra.meta.ch || 900 } : undefined;
    const [src, w, h] = m.a.cubImagen.split("|");
    return cubierta(obra, m.a, fam.f, m.m.paginas.length, src ? { src, w: +w, h: +h } : portada, lang, fam.cortar);
  }, [modo, obra, m, fam, lang]);

  if (obra.kind === "script") return <div className="panel"><p>{t("mq.script")}</p><button className="on" onClick={onPdf}>{t("mq.pdf")}</button></div>;

  const num = (k: "ancho" | "alto" | "sup" | "inf" | "int" | "ext" | "cuerpo" | "interlinea" | "sangria" | "hundido" | "cubSangrado", min: number, max: number, step = 0.5) => (
    <label>{t(`mq.${k}` as Key)}
      <input type="number" min={min} max={max} step={step} value={a[k]} onChange={(e) => set({ [k]: Number(e.target.value) })}
        onBlur={() => set({ [k]: Math.min(max, Math.max(min, a[k] || min)) })} />
    </label>
  );
  const sel = <K extends "fuente" | "capitulo" | "cabecera" | "folio" | "cubPapel">(k: K, opciones: [Ajustes[K], string][]) => (
    <label>{t(`mq.${k}` as Key)}
      <select value={a[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<Ajustes>)}>{opciones.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
    </label>
  );
  const si = (k: "justificar" | "guiones" | "numerar" | "titulos" | "capitular" | "versalitas" | "imagen" | "anteportada" | "portada" | "creditos" | "indice" | "par" | "cubTitulo" | "cubCodigo") => (
    <label className="check"><input type="checkbox" checked={a[k]} onChange={(e) => set({ [k]: e.target.checked })} />{t(`mq.${k}` as Key)}</label>
  );
  const texto = (k: "subtitulo" | "editorial" | "isbn" | "separador") => <label>{t(`mq.${k}` as Key)}<input type="text" value={a[k]} onChange={(e) => set({ [k]: e.target.value })} /></label>;
  const largo = (k: "textoCreditos" | "dedicatoria" | "epigrafe" | "agradecimientos" | "sobreAutor" | "cubContra") => (
    <label>{t(`mq.${k}` as Key)}<textarea rows={3} value={a[k]} placeholder={k === "textoCreditos" ? t("mq.credAuto") : k === "cubContra" ? t("mq.contraAuto") : ""} onChange={(e) => set({ [k]: e.target.value })} /></label>
  );
  const color = (k: "cubFondo" | "cubTexto") => <label>{t(`mq.${k}` as Key)}<input type="color" value={a[k]} onChange={(e) => set({ [k]: e.target.value })} /></label>;

  function nuevaFuente() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ttf,.woff";
    input.multiple = true;
    input.onchange = async () => {
      try {
        const r = await anadirFuentes([...(input.files ?? [])]);
        await releer();
        setFam(null);
        setAviso(r.mal.map((x) => t(x.error === "licencia" ? "mq.f.licencia" : "mq.f.formato", { n: x.archivo })).join(" "));
        if (r.familias[0]) set({ fuente: `propia:${r.familias[0]}` });
        else setFam(fam);
      } catch { setAviso(t("mq.error")); }
    };
    input.click();
  }
  const imagenCubierta = () => elegirImagen(3000).then((r) => r && set({ cubImagen: `${r.url}|${r.w}|${r.h}` }), () => setAviso(t("img.bad")));
  const pdfCubierta = async () => {
    if (!cub || !fam) return;
    const data = maquetaPdf(cub.m, fam.f, { titulo: obra.title, autor: obra.meta?.author });
    try { await saveBlob(`${obra.title} - ${t("mq.cubierta")}.pdf`, new Blob([data as BlobPart], { type: "application/pdf" })); }
    catch { setAviso(t("w.export")); }
  };

  // La anchura mínima evita que un valor a medio teclear dé una caja de texto negativa.
  const valido = m && m.a.ancho - m.a.int - m.a.ext >= 40 && m.a.alto - m.a.sup - m.a.inf >= 50 && m.a.cuerpo >= 6 && m.a.interlinea >= 7;
  const total = m?.m.paginas.length ?? 0;
  const pl = Math.min(pliego, Math.floor(total / 2));
  const r = m && revisar(m.m, m.a, getLang() === "en");
  const fuentes: [NombreFuente, string][] = [...FUENTES, ...propias.map((n): [NombreFuente, string] => [`propia:${n}`, n])];

  return (
    <div className="maqueta">
      <form className="mq-ajustes" onSubmit={(e) => e.preventDefault()}>
        <div className="mq-modos" role="tablist">
          {(["interior", "cubierta"] as const).map((x) => <button key={x} type="button" role="tab" aria-selected={modo === x} className={modo === x ? "on" : ""} onClick={() => setModo(x)}>{t(`mq.${x}`)}</button>)}
        </div>
        {modo === "cubierta" ? (
          <div className="mq-grupo">
            {sel("cubPapel", [["crema", t("mq.papel.crema")], ["blanco", t("mq.papel.blanco")]])}
            {num("cubSangrado", 0, 6, 0.1)}{color("cubFondo")}{color("cubTexto")}
            <button type="button" onClick={imagenCubierta}>{t("mq.cubImagen")}</button>
            {a.cubImagen && <button type="button" onClick={() => set({ cubImagen: "" })}>{t("mq.cubSinImagen")}</button>}
            {si("cubTitulo")}{si("cubCodigo")}{texto("subtitulo")}{texto("isbn")}{largo("cubContra")}
            <label className="check"><input type="checkbox" checked={guias} onChange={(e) => setGuias(e.target.checked)} />{t("mq.guias")}</label>
            <p className="muted">{t("mq.cubNota")}</p>
          </div>
        ) : <>
          <label>{t("mq.preajuste")}
            <select value={a.preajuste} onChange={(e) => onChange(preajuste(a, e.target.value))}>{PREAJUSTES.map((p) => <option key={p.id} value={p.id}>{p[getLang()]}</option>)}</select>
          </label>
          <details open><summary>{t("mq.g.letra")}</summary><div>
            {sel("fuente", fuentes)}
            <button type="button" onClick={nuevaFuente} title={t("mq.f.ayuda")}>{t("mq.f.anadir")}</button>
            {num("cuerpo", 7, 24)}{num("interlinea", 8, 40)}{num("sangria", 0, 6, 0.1)}{si("justificar")}
            {hayGuiones(lang) ? si("guiones") : <p className="muted">{t("mq.sinGuiones")}</p>}
          </div></details>
          <details><summary>{t("mq.g.pagina")}</summary><div>
            {num("ancho", 80, 300, 0.1)}{num("alto", 100, 420, 0.1)}{num("sup", 5, 60)}{num("inf", 5, 60)}{num("int", 5, 60)}{num("ext", 5, 60)}
          </div></details>
          <details><summary>{t("mq.g.capitulos")}</summary><div>
            {sel("capitulo", [["impar", t("mq.cap.impar")], ["nueva", t("mq.cap.nueva")], ["seguido", t("mq.cap.seguido")]])}
            {num("hundido", 0, 20, 1)}{si("numerar")}{si("titulos")}{si("capitular")}{si("versalitas")}{texto("separador")}
          </div></details>
          <details><summary>{t("mq.g.cabeceras")}</summary><div>
            {sel("cabecera", [["autor-titulo", t("mq.cab.autor")], ["titulo-capitulo", t("mq.cab.capitulo")], ["manuscrito", t("mq.cab.manuscrito")], ["ninguna", t("mq.cab.ninguna")]])}
            {sel("folio", [["abajo", t("mq.folio.abajo")], ["arriba", t("mq.folio.arriba")], ["ninguno", t("mq.cab.ninguna")]])}
          </div></details>
          <details><summary>{t("mq.g.paginas")}</summary><div>
            <button type="button" onClick={onMeta}>{t("mq.meta")}</button>
            {si("imagen")}{si("anteportada")}{si("portada")}{si("creditos")}{si("indice")}{si("par")}
            {texto("subtitulo")}{texto("editorial")}{texto("isbn")}
            {largo("textoCreditos")}{largo("dedicatoria")}{largo("epigrafe")}{largo("agradecimientos")}{largo("sobreAutor")}
          </div></details>
        </>}
        {aviso && <p className="mq-avisos" role="alert">⚠ {aviso}</p>}
      </form>

      <section className="mq-vista" aria-label={t("mq.preview")} tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowRight") setPliego(Math.min(pl + 1, Math.floor(total / 2))); if (e.key === "ArrowLeft") setPliego(Math.max(0, pl - 1)); }}>
        {error ? <p className="empty">{error}</p> : !m || !r || !fam ? <p className="empty">{t("mq.loading")}</p> : !valido ? <p className="empty">{t("mq.invalid")}</p> : cub ? (
          <>
            <div className="mq-barra"><span>{t("mq.cubStats", { w: cub.ancho.toFixed(1), h: cub.alto.toFixed(1), l: cub.lomo.toFixed(1), p: total })}</span><span className="spacer" /><button className="on" onClick={pdfCubierta}>{t("mq.pdfCubierta")}</button></div>
            <div className="pliego cubierta" style={{ aspectRatio: `${cub.m.w} / ${cub.m.h}` }}>
              <Hoja p={cub.m.paginas[0]} m={cub.m} fuente={m.a.fuente} familia={fam.f} numero={0} guias={guias ? cub.guias : undefined} />
            </div>
            {cub.avisos.length ? <ul className="mq-avisos">{cub.avisos.map((x) => <li key={x}>⚠ {x}</li>)}</ul> : <p className="mq-ok">✓ {t("mq.ok")}</p>}
          </>
        ) : (
          <>
            <div className="mq-barra">
              <button disabled={pl === 0} onClick={() => setPliego(pl - 1)} aria-label={t("mq.prev")}>◀</button>
              <label>{t("mq.page")} <input type="number" min={1} max={total} value={Math.max(1, pl * 2)} onChange={(e) => setPliego(Math.floor((Number(e.target.value) || 1) / 2))} /> / {total}</label>
              <button disabled={pl >= Math.floor(total / 2)} onClick={() => setPliego(pl + 1)} aria-label={t("mq.next")}>▶</button>
              <span className="spacer" />
              <button className="on" onClick={onPdf}>{t("mq.pdf")}</button>
            </div>
            <div className="pliego">
              <Hoja p={pl ? m.m.paginas[pl * 2 - 1] : undefined} m={m.m} fuente={m.a.fuente} familia={fam.f} numero={pl * 2} />
              <Hoja p={m.m.paginas[pl * 2]} m={m.m} fuente={m.a.fuente} familia={fam.f} numero={pl * 2 + 1} />
            </div>
            <p className="muted">{t("mq.stats", { p: total, w: m.m.palabras, b: r.lomoBlanco.toFixed(1), c: r.lomoCrema.toFixed(1) })}</p>
            {r.avisos.length ? <ul className="mq-avisos">{r.avisos.map((x) => <li key={x}>⚠ {x}</li>)}</ul> : <p className="mq-ok">✓ {t("mq.ok")}</p>}
          </>
        )}
      </section>
    </div>
  );
}
