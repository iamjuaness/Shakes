// Lienzo SVG con zoom (rueda y botones) y desplazamiento arrastrando el fondo. Lo usan el mapa de conexiones
// de la app y el plugin Árbol genealógico, junto con el icono de persona y los colores de las líneas.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { t } from "../../../src/i18n";

export const PERSONA = "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 22c0-5 4-8.5 9-8.5s9 3.500 9 8.500z"; // caja de 24×24
export const COLORES = ["#e5484d", "#3b82f6", "#22a04a", "#a855f7", "#e08a00", "#ec4899", "#00a5b5", "#8d8d8d"];

export interface Caja { x: number; y: number; w: number; h: number }

// `fit`: caja que muestra todo. `listo`: el <svg> ya está en pantalla (para enganchar la rueda).
export function useLienzo(fit: Caja, listo: boolean) {
  const svg = useRef<SVGSVGElement>(null);
  const [cam, setCam] = useState<Caja | null>(null); // null: encuadre completo automático
  const pan = useRef<{ px: number; py: number; k: number; box: Caja } | null>(null);
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const view = cam ?? fit;
  const point = (e: { clientX: number; clientY: number }) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  // f < 1 acerca, f > 1 aleja; `at` es el punto que se queda quieto
  const zoom = (f: number, at?: { x: number; y: number }) => setCam((c) => {
    const v = c ?? fitRef.current;
    const k = Math.min(fitRef.current.w * 2, Math.max(200, v.w * f)) / v.w;
    const o = at ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    return { x: o.x - (o.x - v.x) * k, y: o.y - (o.y - v.y) * k, w: v.w * k, h: v.h * k };
  });
  // listener nativo: el onWheel de React es pasivo y no deja frenar el zoom o scroll de la ventana
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0015), point(e)); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [listo]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    svg, point, zoom, zoomed: !!cam, reset: () => setCam(null),
    viewBox: `${view.x} ${view.y} ${view.w} ${view.h}`,
    panStart(e: PointerEvent) {
      if (e.button !== 0) return;
      pan.current = { px: e.clientX, py: e.clientY, k: 1 / svg.current!.getScreenCTM()!.a, box: view };
      try { svg.current!.setPointerCapture(e.pointerId); } catch {}
    },
    panMove(e: PointerEvent) {
      const m = pan.current;
      if (m) setCam({ ...m.box, x: m.box.x - (e.clientX - m.px) * m.k, y: m.box.y - (e.clientY - m.py) * m.k });
    },
    panEnd() { pan.current = null; },
  };
}

export function BotonesZoom({ lienzo }: { lienzo: ReturnType<typeof useLienzo> }) {
  return (
    <>
      <span className="spacer" />
      <button aria-label={t("map.zoomIn")} title={t("map.zoomIn")} onClick={() => lienzo.zoom(0.75)}>+</button>
      <button aria-label={t("map.zoomOut")} title={t("map.zoomOut")} onClick={() => lienzo.zoom(1 / 0.75)}>−</button>
      <button disabled={!lienzo.zoomed} onClick={lienzo.reset}>{t("map.fit")}</button>
    </>
  );
}
