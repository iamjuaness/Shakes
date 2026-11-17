// Puro: muletillas y comodines que casi siempre sobran en narración, con sustitutos ("" = quitar).
export interface Muleti { from: number; to: number; frase: string; sugerencias: string[] }

const M: [string, string[]][] = [
  ["o sea", ["es decir", "esto es", ""]], ["en plan", ["como", "a modo de", ""]], ["como que", ["", "algo así como"]],
  ["digamos", ["por ejemplo", ""]], ["por así decirlo", ["", "en cierto modo"]],
  ["de alguna manera", ["de algún modo", "en parte", ""]], ["de alguna forma", ["de algún modo", "en parte", ""]],
  ["de cierta manera", ["en parte", "en cierto sentido", ""]], ["de cierta forma", ["en parte", "en cierto sentido", ""]], ["en cierto modo", ["en parte", ""]],
  ["básicamente", ["en esencia", "esencialmente", ""]], ["literalmente", ["en sentido estricto", ""]], ["simplemente", ["solo", "tan solo", ""]],
  ["realmente", ["de verdad", "en efecto", ""]], ["verdaderamente", ["de verdad", ""]], ["sinceramente", ["con franqueza", ""]],
  ["en realidad", ["en el fondo", "a decir verdad", ""]], ["la verdad es que", ["lo cierto es que", ""]], ["por lo visto", ["al parecer", "según parece"]],
  ["de hecho", ["en efecto", "efectivamente", ""]], ["por supuesto", ["claro", "desde luego", "sin duda"]], ["como si nada", ["con indiferencia", "sin inmutarse"]],
  ["un poco", ["algo", "ligeramente", "levemente", ""]], ["bastante", ["considerablemente", "notablemente", ""]], ["algo así como", ["como", "una especie de", "aproximadamente"]],
  ["en cierta medida", ["en parte", ""]], ["prácticamente", ["casi", ""]], ["totalmente", ["por completo", "del todo", ""]], ["absolutamente", ["por completo", ""]],
  ["en fin", ["en suma", ""]],
];
const MULETILLAS: [RegExp, string, string[]][] = M.map(([f, s]) => [new RegExp(`(?<![\\p{L}])${f.replace(/ /g, "\\s+")}(?![\\p{L}])`, "giu"), f, s]);

export const muletillas = (text: string): Muleti[] =>
  MULETILLAS.flatMap(([re, frase, sugerencias]) => [...text.matchAll(re)]
    .map((m) => ({ from: m.index!, to: m.index! + m[0].length, frase, sugerencias })))
    .sort((a, b) => a.from - b.from);
