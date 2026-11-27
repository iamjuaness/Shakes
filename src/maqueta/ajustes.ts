// Ajustes de maquetación de un libro. Se guardan en el proyecto: project.ext.maqueta[id de la obra].
// «propia:Nombre»: fuente que cargó el usuario (se guarda en la app, no en el proyecto).
export type NombreFuente = "eb-garamond" | "crimson-text" | "libre-baskerville" | "courier" | `propia:${string}`;
export const FUENTES: [NombreFuente, string][] = [["eb-garamond", "EB Garamond"], ["crimson-text", "Crimson Text"], ["libre-baskerville", "Libre Baskerville"], ["courier", "Courier"]];

export interface Ajustes {
  preajuste: string;
  ancho: number; alto: number; // página, en mm
  sup: number; inf: number; int: number; ext: number; // márgenes en mm (int = junto al lomo)
  fuente: NombreFuente;
  cuerpo: number; interlinea: number; // pt
  sangria: number; // emes
  justificar: boolean; guiones: boolean;
  capitulo: "impar" | "nueva" | "seguido";
  hundido: number; // líneas en blanco antes del título de capítulo
  numerar: boolean; titulos: boolean; capitular: boolean; versalitas: boolean;
  separador: string; // entre escenas
  cabecera: "autor-titulo" | "titulo-capitulo" | "manuscrito" | "ninguna";
  folio: "abajo" | "arriba" | "ninguno";
  imagen: boolean; anteportada: boolean; portada: boolean; creditos: boolean; indice: boolean;
  par: boolean; // terminar en número par de páginas
  subtitulo: string; editorial: string; isbn: string;
  textoCreditos: string; dedicatoria: string; epigrafe: string; agradecimientos: string; sobreAutor: string;
  // cubierta completa (contraportada, lomo y portada)
  cubPapel: "blanco" | "crema"; cubSangrado: number; cubFondo: string; cubTexto: string; cubContra: string; cubImagen: string; cubTitulo: boolean; cubCodigo: boolean;
}

const BASE: Ajustes = {
  preajuste: "novela", ancho: 139.7, alto: 215.9, sup: 19, inf: 19, int: 19, ext: 15,
  fuente: "eb-garamond", cuerpo: 11.5, interlinea: 14.5, sangria: 1.4, justificar: true, guiones: true,
  capitulo: "impar", hundido: 6, numerar: true, titulos: true, capitular: true, versalitas: false, separador: "* * *",
  cabecera: "autor-titulo", folio: "abajo",
  imagen: false, anteportada: true, portada: true, creditos: true, indice: true, par: true,
  subtitulo: "", editorial: "", isbn: "", textoCreditos: "", dedicatoria: "", epigrafe: "", agradecimientos: "", sobreAutor: "",
  cubPapel: "crema", cubSangrado: 3.2, cubFondo: "#1f2a44", cubTexto: "#ffffff", cubContra: "", cubImagen: "", cubTitulo: true, cubCodigo: true,
};

const MANUSCRITO: Partial<Ajustes> = {
  sup: 25.4, inf: 25.4, int: 25.4, ext: 25.4, fuente: "courier", cuerpo: 12, interlinea: 24, sangria: 3,
  justificar: false, guiones: false, capitulo: "nueva", hundido: 6, numerar: false, titulos: true, capitular: false, versalitas: false,
  separador: "#", cabecera: "manuscrito", folio: "ninguno", imagen: false, anteportada: false, portada: true, creditos: false, indice: false, par: false,
};

// Cada preajuste cambia el diseño; los textos del libro (dedicatoria, créditos…) se conservan.
export const PREAJUSTES: { id: string; es: string; en: string; v: Partial<Ajustes> }[] = [
  { id: "novela", es: "Novela 5,5 × 8,5\"", en: "Novel 5.5 × 8.5\"", v: {} },
  { id: "comercial", es: "Novela 6 × 9\"", en: "Novel 6 × 9\"", v: { ancho: 152.4, alto: 228.6, sup: 21, inf: 21, int: 22, ext: 17, cuerpo: 12, interlinea: 15.5 } },
  { id: "pequeno", es: "Novela 5 × 8\"", en: "Novel 5 × 8\"", v: { ancho: 127, alto: 203.2, sup: 17, inf: 17, int: 18, ext: 13, cuerpo: 11, interlinea: 14 } },
  { id: "bolsillo", es: "Bolsillo 11 × 18 cm", en: "Pocket 11 × 18 cm", v: { ancho: 110, alto: 180, sup: 14, inf: 15, int: 16, ext: 10, cuerpo: 10, interlinea: 12.5, hundido: 5 } },
  { id: "a5", es: "A5", en: "A5", v: { ancho: 148, alto: 210, sup: 20, inf: 20, int: 22, ext: 17 } },
  { id: "manuscrito-a4", es: "Manuscrito editorial (A4)", en: "Submission manuscript (A4)", v: { ...MANUSCRITO, ancho: 210, alto: 297 } },
  { id: "manuscrito-carta", es: "Manuscrito editorial (Carta)", en: "Submission manuscript (Letter)", v: { ...MANUSCRITO, ancho: 215.9, alto: 279.4 } },
];

const TEXTOS = ["subtitulo", "editorial", "isbn", "textoCreditos", "dedicatoria", "epigrafe", "agradecimientos", "sobreAutor", "cubPapel", "cubSangrado", "cubFondo", "cubTexto", "cubContra", "cubImagen", "cubTitulo", "cubCodigo"] as const;
export function preajuste(actual: Ajustes, id: string): Ajustes {
  const textos = Object.fromEntries(TEXTOS.map((k) => [k, actual[k]]));
  return { ...BASE, ...PREAJUSTES.find((p) => p.id === id)?.v, ...textos, preajuste: id };
}
// Lo guardado puede venir incompleto (versión anterior): se completa con los valores por defecto.
export const ajustesDe = (guardado?: Partial<Ajustes>): Ajustes => ({ ...BASE, ...guardado });
