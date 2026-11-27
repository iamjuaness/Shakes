// Letras propias: dibujar el signo de cada sonido y escribir texto con ellos.
import { useRef, useState } from "react";
import { confirmAsk } from "../../../src/dialog";
import { guardar } from "../_comun/guardar";
import { Idioma, alfabetoSvg, enSonidos, glifo, sonidos } from "./logica";

export function Signo({ d, tam = 40, titulo }: { d: string; tam?: number; titulo?: string }) {
  return <svg className="signo" width={tam} height={tam} viewBox="0 0 100 100" aria-label={titulo}><path d={d} /></svg>;
}

// Texto del idioma inventado escrito con sus letras; los sonidos sin signo salen con su letra.
export function Escrito({ i, texto }: { i: Idioma; texto: string }) {
  return (
    <p className="escrito" dir={i.direccion ?? "ltr"} aria-label={texto}>
      {texto.split(/\s+/).filter(Boolean).map((w, k) => (
        <span key={k}>{enSonidos(i, w).map((s, j) => (i.glifos?.[s] ? <Signo key={j} d={i.glifos[s]} tam={28} titulo={s} /> : <b key={j}>{s}</b>))}</span>
      ))}
    </p>
  );
}

export function Escritura({ i, poner, es }: { i: Idioma; poner: (p: Partial<Idioma>) => void; es: boolean }) {
  const L = (a: string, b: string) => (es ? a : b);
  const lista = sonidos(i);
  const [sel, setSel] = useState("");
  const s = lista.includes(sel) ? sel : lista[0];
  const [trazo, setTrazo] = useState("");
  const dibujando = useRef(false);
  const punto = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return `${Math.round(((e.clientX - r.x) / r.width) * 100)} ${Math.round(((e.clientY - r.y) / r.height) * 100)}`;
  };
  const guardarSigno = (d: string) => poner({ glifos: { ...i.glifos, [s]: d } });
  const actual = i.glifos?.[s] ?? "";
  if (!s) return <p className="muted">{L("Añade sonidos en la pestaña Sonidos.", "Add sounds in the Sounds tab.")}</p>;
  return (
    <>
      <div className="row">
        <button onClick={() => poner({ glifos: Object.fromEntries(lista.map((x) => [x, i.glifos?.[x] || glifo(i, x)])) })}>{L("Generar las letras que faltan", "Generate missing letters")}</button>
        <button disabled={!i.glifos} onClick={async () => { if (await confirmAsk(L("¿Borrar todas las letras?", "Delete all letters?"))) poner({ glifos: undefined }); }}>{L("Borrar todas", "Delete all")}</button>
        <button disabled={!i.glifos} onClick={() => guardar(`${i.nombre}-alfabeto.svg`, alfabetoSvg(i), "image/svg+xml")}>{L("Exportar alfabeto", "Export alphabet")}</button>
        <label className="fld">{L("Dirección", "Direction")}
          <select value={i.direccion ?? "ltr"} onChange={(e) => poner({ direccion: e.target.value as "ltr" | "rtl" })}><option value="ltr">{L("Izquierda a derecha", "Left to right")}</option><option value="rtl">{L("Derecha a izquierda", "Right to left")}</option></select>
        </label>
      </div>
      <div className="alfabeto">
        {lista.map((x) => <button key={x} className={x === s ? "on" : ""} aria-pressed={x === s} onClick={() => { setSel(x); setTrazo(""); }}><Signo d={i.glifos?.[x] ?? ""} tam={34} />{x}</button>)}
      </div>
      <div className="row editor-signo">
        <svg className="signo lienzo-signo" width={240} height={240} viewBox="0 0 100 100" aria-label={L(`Dibuja el signo de «${s}»`, `Draw the sign for “${s}”`)}
          onPointerDown={(e) => { dibujando.current = true; e.currentTarget.setPointerCapture(e.pointerId); const p = punto(e); setTrazo(`M${p}L${p}`); }}
          onPointerMove={(e) => { if (dibujando.current) { const p = punto(e); setTrazo((t) => (t.endsWith(`L${p}`) ? t : `${t}L${p}`)); } }}
          onPointerUp={() => { if (!dibujando.current) return; dibujando.current = false; guardarSigno(actual + trazo); setTrazo(""); }}>
          <path className="guia" d="M18 0V100M50 0V100M82 0V100M0 18H100M0 50H100M0 82H100" />
          <path d={actual + trazo} />
        </svg>
        <div className="columna">
          <p className="muted">{L(`Dibuja con el ratón o el dedo el signo de «${s}». Cada trazo se suma.`, `Draw the sign for “${s}” with mouse or finger. Strokes add up.`)}</p>
          <button disabled={!actual} onClick={() => guardarSigno(actual.replace(/M[^M]*$/, ""))}>{L("Deshacer trazo", "Undo stroke")}</button>
          <button disabled={!actual} onClick={() => guardarSigno("")}>{L("Limpiar signo", "Clear sign")}</button>
        </div>
      </div>
    </>
  );
}
