// Puro: momentos de un arco de personaje y lo que le falta o chirría.
export const HITOS = ["inicio", "detonante", "medio", "crisis", "climax", "final"] as const;
export type HitoId = (typeof HITOS)[number];
export type TipoArco = "positivo" | "negativo" | "plano";
export interface Hito { scene?: string; nota?: string; valor?: number } // valor: de -2 (hundido) a 2 (pleno)
export interface Arco { tipo: TipoArco; hitos: Partial<Record<HitoId, Hito>> }

// curva de partida según el tipo; cada momento se puede ajustar
export const VALOR: Record<TipoArco, number[]> = { positivo: [-1, -1, 0, -2, 1, 2], negativo: [1, 1, 0, 2, -1, -2], plano: [1, 0, 0, -1, 1, 1] };
export const AUSENCIA = 3; // capítulos seguidos sin aparecer que merecen aviso

// `orden`: ids de los capítulos en orden narrativo. `presencia`: menciones del personaje en cada uno.
export function revisar(arco: Arco, orden: string[], presencia: number[]) {
  const puestos = HITOS.flatMap((id, k) => {
    const h = arco.hitos[id], i = h?.scene ? orden.indexOf(h.scene) : -1;
    return i < 0 ? [] : [{ id, i, valor: h!.valor ?? VALOR[arco.tipo][k], nota: h!.nota ?? "" }];
  });
  const faltan = HITOS.filter((id) => !puestos.some((p) => p.id === id));
  const desorden = puestos.slice(1).flatMap((p, k): [HitoId, HitoId][] => (p.i < puestos[k].i ? [[puestos[k].id, p.id]] : []));
  const ausencias: [number, number][] = []; // [primero, último] de cada tramo sin aparecer, ya presentado el personaje
  const primera = presencia.findIndex((n) => n > 0);
  for (let i = primera + 1, desde = -1; primera >= 0 && i <= presencia.length; i++) {
    if (i < presencia.length && !presencia[i]) { if (desde < 0) desde = i; continue; }
    if (desde >= 0 && i - desde >= AUSENCIA) ausencias.push([desde, i - 1]);
    desde = -1;
  }
  return { puestos, faltan, desorden, ausencias, nunca: primera < 0 };
}
