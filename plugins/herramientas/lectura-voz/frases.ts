// Puro: parte un párrafo en frases con su posición, para leerlas una a una.
export const frases = (t: string): { from: number; to: number; t: string }[] =>
  [...t.matchAll(/[^.!?…\n]+[.!?…»”"]*/g)].flatMap((m) => {
    const x = m[0].trim();
    if (!/[\p{L}\d]/u.test(x)) return [];
    const from = m.index! + m[0].length - m[0].trimStart().length;
    return [{ from, to: from + x.length, t: x }];
  });
