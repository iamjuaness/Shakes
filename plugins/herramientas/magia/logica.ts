// Puro: datos de un sistema de magia, avisos de coherencia e ideas de partida.
export interface Escuela { id: string; nombre: string; descripcion: string }
export interface Rango { id: string; nombre: string; requisitos: string; capacidades: string }
export interface Hechizo { id: string; nombre: string; escuela: string; rango: string; efecto: string; coste: string }
export interface Usuario { id: string; card: string; escuela: string; rango: string; nota: string }
export interface Regla { id: string; texto: string }
export interface Sistema {
  id: string; nombre: string; nivel: "sencillo" | "complejo"; dureza: number; // 0 = blanda (misteriosa), 100 = dura (con reglas)
  concepto?: string; fuente?: string; activacion?: string; coste?: string; limites?: string; quien?: string;
  debilidades?: string; consecuencias?: string; sociedad?: string; historia?: string;
  reglas: Regla[]; escuelas: Escuela[]; rangos: Rango[]; hechizos: Hechizo[]; usuarios: Usuario[];
}

export const nuevoSistema = (id: string, nombre: string, nivel: Sistema["nivel"]): Sistema => ({ id, nombre, nivel, dureza: 50, reglas: [], escuelas: [], rangos: [], hechizos: [], usuarios: [] });

export type Aviso = { tipo: "sinFuente" | "sinCoste" | "sinLimites" | "sinReglas" | "sinDebilidades" } | { tipo: "hechizoSinCoste" | "escuelaVacia"; nombre: string };

// En un sistema sencillo solo se revisa lo que muestra.
export function revisar(s: Sistema): Aviso[] {
  const vacio = (t?: string) => !t?.trim();
  const out: Aviso[] = [];
  if (vacio(s.fuente)) out.push({ tipo: "sinFuente" });
  if (vacio(s.coste)) out.push({ tipo: "sinCoste" });
  if (vacio(s.limites)) out.push({ tipo: "sinLimites" });
  if (s.nivel === "sencillo") return out;
  if (s.dureza >= 60 && !s.reglas.some((r) => !vacio(r.texto))) out.push({ tipo: "sinReglas" });
  if (vacio(s.debilidades)) out.push({ tipo: "sinDebilidades" });
  for (const h of s.hechizos) if (vacio(h.coste)) out.push({ tipo: "hechizoSinCoste", nombre: h.nombre });
  for (const e of s.escuelas) if (!s.hechizos.some((h) => h.escuela === e.id)) out.push({ tipo: "escuelaVacia", nombre: e.nombre });
  return out;
}

export const CAMPOS_IDEA = ["fuente", "activacion", "coste", "limites", "quien", "debilidades"] as const;
type CampoIdea = (typeof CAMPOS_IDEA)[number];
export const IDEAS: Record<CampoIdea, [string, string][]> = {
  fuente: [["La sangre de quien la usa", "The user's own blood"], ["Las emociones intensas", "Intense emotions"], ["Un metal que se consume", "A metal that gets consumed"], ["Pactos con espíritus", "Pacts with spirits"], ["La luz de las estrellas almacenada", "Stored starlight"], ["Los nombres verdaderos de las cosas", "The true names of things"], ["El sueño de otras personas", "Other people's dreams"], ["Líneas de energía bajo la tierra", "Energy lines beneath the earth"]],
  activacion: [["Palabras en una lengua antigua", "Words in an old language"], ["Dibujar un símbolo exacto", "Drawing an exact symbol"], ["Gestos aprendidos desde niño", "Gestures learned in childhood"], ["Cantar", "Singing"], ["Tocar el objetivo", "Touching the target"], ["Romper algo valioso", "Breaking something precious"]],
  coste: [["Recuerdos que no vuelven", "Memories that never return"], ["Años de vida", "Years of life"], ["Agotamiento físico", "Physical exhaustion"], ["Una parte del cuerpo se convierte en piedra", "Part of the body turns to stone"], ["Perder un sentido durante un día", "Losing a sense for a day"], ["Alguien querido enferma", "A loved one falls ill"]],
  limites: [["No puede crear nada de la nada", "It cannot create from nothing"], ["No funciona sobre seres vivos", "It does not work on living beings"], ["Solo de noche", "Only at night"], ["El efecto dura lo que dure la concentración", "Effects last only while concentrating"], ["Nunca puede revivir a los muertos", "It can never revive the dead"], ["Solo afecta a lo que se ve", "Only affects what can be seen"]],
  quien: [["Solo quien nace con ella", "Only those born with it"], ["Cualquiera, tras años de estudio", "Anyone, after years of study"], ["Quien ha sobrevivido a una muerte cercana", "Those who survived near death"], ["Un linaje concreto", "A specific bloodline"], ["Quien porte una reliquia", "Whoever carries a relic"]],
  debilidades: [["El hierro la anula", "Iron cancels it"], ["El agua corriente la disipa", "Running water dispels it"], ["El miedo la descontrola", "Fear makes it wild"], ["Quien conoce tu nombre puede cortarla", "Whoever knows your name can sever it"], ["Falla sin sueño suficiente", "It fails without enough sleep"]],
};

// Rellena solo lo que esté vacío.
export function idea(s: Sistema, es: boolean, r: () => number = Math.random): Partial<Sistema> {
  return Object.fromEntries(CAMPOS_IDEA.filter((k) => !s[k]?.trim()).map((k) => [k, IDEAS[k][Math.floor(r() * IDEAS[k].length)][es ? 0 : 1]]));
}
