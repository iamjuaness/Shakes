// Puro: sinónimos con la misma forma que la palabra original (tiempo y persona del verbo, género y número).
// Diccionario por lema: verbos en infinitivo (regulares: se conjugan solos), adjetivos en masculino singular, sustantivos en singular.
// shortcut: lematizador por sufijos solo para formas regulares y unas cuantas irregulares de la narración (3.ª persona);
// ampliar DATOS o IRREGULARES cuando falte una palabra.
import { EXTRA } from "./diccionario-extra.ts";
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

type Cat = "v" | "a" | "n" | "d"; // verbo, adjetivo, sustantivo, adverbio/otros (invariable)
const D: [Cat, string, string][] = [
  // verbos
  ["v", "decir", "afirmar,comentar,responder,señalar,añadir,musitar,replicar"],
  ["v", "mirar", "observar,contemplar,examinar,otear,escudriñar,fijar la vista en"],
  ["v", "ver", "divisar,distinguir,advertir,percibir,avistar"],
  ["v", "caminar", "avanzar,andar,recorrer,deambular,marchar"],
  ["v", "empezar", "comenzar,iniciar,emprender"], ["v", "comenzar", "empezar,iniciar,emprender"],
  ["v", "terminar", "acabar,concluir,finalizar,culminar"], ["v", "acabar", "terminar,concluir,finalizar"],
  ["v", "sonreír", "esbozar una sonrisa,reír,sonrojarse"],
  ["v", "entrar", "acceder,penetrar,adentrarse,irrumpir"],
  ["v", "salir", "abandonar,partir,marcharse,largarse"],
  ["v", "pensar", "reflexionar,meditar,suponer,considerar,imaginar"],
  ["v", "creer", "suponer,figurarse,imaginar,opinar"],
  ["v", "preguntar", "inquirir,indagar,interrogar,consultar"],
  ["v", "gritar", "exclamar,vociferar,bramar,chillar,clamar"],
  ["v", "tomar", "agarrar,coger,asir,sujetar,empuñar"], ["v", "coger", "agarrar,tomar,asir,sujetar"],
  ["v", "abrir", "descorrer,destapar,entreabrir,desatrancar"], ["v", "cerrar", "entornar,atrancar,clausurar,sellar"],
  ["v", "sentir", "notar,percibir,experimentar,advertir"], ["v", "notar", "percibir,advertir,sentir,apreciar"],
  ["v", "llevar", "transportar,cargar,trasladar,acarrear"], ["v", "traer", "acercar,aportar,transportar"],
  ["v", "dejar", "soltar,depositar,abandonar,colocar"], ["v", "poner", "colocar,situar,depositar,disponer"],
  ["v", "hacer", "realizar,ejecutar,crear,elaborar,llevar a cabo"],
  ["v", "buscar", "rastrear,indagar,explorar,husmear"], ["v", "encontrar", "hallar,descubrir,localizar,dar con"],
  ["v", "correr", "apresurarse,precipitarse,galopar,trotar"], ["v", "saltar", "brincar,lanzarse,botar"],
  ["v", "levantar", "alzar,elevar,erguir,aupar"], ["v", "sentar", "acomodar,instalar,aposentar"],
  ["v", "esperar", "aguardar,permanecer,demorarse,contener el aliento"],
  ["v", "llamar", "convocar,reclamar,nombrar,invocar"], ["v", "contestar", "responder,replicar,objetar"], ["v", "responder", "contestar,replicar,objetar,retrucar"],
  ["v", "volver", "regresar,retornar,tornar"], ["v", "regresar", "volver,retornar"],
  ["v", "seguir", "continuar,proseguir,perseguir,acompañar"], ["v", "continuar", "seguir,proseguir,persistir"],
  ["v", "parecer", "semejar,asemejarse,aparentar"], ["v", "mostrar", "enseñar,exhibir,revelar,exponer"], ["v", "enseñar", "mostrar,exhibir,revelar"],
  ["v", "ayudar", "auxiliar,asistir,socorrer,echar una mano"], ["v", "querer", "desear,anhelar,ansiar,apetecer"], ["v", "desear", "querer,anhelar,ansiar"],
  ["v", "necesitar", "requerir,precisar,hacerle falta"], ["v", "intentar", "tratar de,procurar,pretender,probar"],
  ["v", "recordar", "evocar,rememorar,acordarse de"], ["v", "olvidar", "descuidar,omitir,dejar de lado"],
  ["v", "caer", "desplomarse,derrumbarse,precipitarse"], ["v", "mover", "desplazar,agitar,trasladar,menear"],
  ["v", "tirar", "arrojar,lanzar,echar,despedir"], ["v", "lanzar", "arrojar,tirar,disparar,proyectar"],
  ["v", "golpear", "pegar,azotar,aporrear,percutir"], ["v", "escuchar", "oír,atender,prestar atención a"], ["v", "oír", "escuchar,percibir,captar"],
  ["v", "hablar", "conversar,platicar,departir,charlar"], ["v", "contar", "relatar,narrar,referir,explicar"],
  ["v", "reír", "carcajearse,soltar una carcajada,sonreír"], ["v", "llorar", "sollozar,lagrimear,gimotear,derramar lágrimas"],
  ["v", "dormir", "descansar,reposar,adormilarse,dormitar"], ["v", "despertar", "espabilar,desvelar,incorporarse"],
  ["v", "subir", "ascender,trepar,escalar,remontar"], ["v", "bajar", "descender,apearse,desandar"],
  ["v", "tocar", "rozar,palpar,acariciar,sobar"], ["v", "agarrar", "sujetar,asir,aferrar,empuñar"], ["v", "sujetar", "agarrar,aferrar,retener,asir"],
  ["v", "girar", "volverse,voltear,dar media vuelta"], ["v", "apartar", "alejar,retirar,separar,desviar"],
  ["v", "acercar", "aproximar,arrimar,juntar"], ["v", "alejar", "apartar,distanciar,retirar"],
  ["v", "ocurrir", "suceder,acontecer,pasar,producirse"], ["v", "suceder", "ocurrir,acontecer,producirse"],
  ["v", "aparecer", "surgir,asomar,emerger,presentarse"], ["v", "desaparecer", "esfumarse,evaporarse,desvanecerse"],
  ["v", "descubrir", "hallar,desvelar,detectar,destapar"], ["v", "explicar", "aclarar,exponer,detallar,justificar"],
  ["v", "suspirar", "resoplar,exhalar,soltar el aire"], ["v", "temblar", "estremecerse,tiritar,vibrar,convulsionar"],
  ["v", "morir", "fallecer,perecer,expirar,sucumbir"], ["v", "matar", "asesinar,eliminar,abatir,ejecutar"],
  ["v", "vivir", "habitar,residir,existir,morar"], ["v", "pasar", "transcurrir,discurrir,ocurrir"],
  ["v", "conseguir", "lograr,alcanzar,obtener,consumar"], ["v", "lograr", "conseguir,alcanzar,obtener"],
  ["v", "detener", "parar,frenar,interrumpir,contener"], ["v", "parar", "detener,frenar,interrumpir,cesar"],
  ["v", "estudiar", "examinar,analizar,investigar"], ["v", "trabajar", "laborar,afanarse,esforzarse"],
  ["v", "jugar", "juguetear,entretenerse,divertirse"], ["v", "cantar", "entonar,tararear,canturrear"],
  ["v", "mantener", "conservar,sostener,preservar"], ["v", "perder", "extraviar,desperdiciar,malgastar"],
  ["v", "ganar", "vencer,triunfar,imponerse"], ["v", "gustar", "agradar,encantar,complacer"],
  // adjetivos
  ["a", "grande", "enorme,amplio,inmenso,vasto,descomunal"], ["a", "pequeño", "diminuto,menudo,reducido,minúsculo"],
  ["a", "bonito", "hermoso,bello,precioso,vistoso"], ["a", "hermoso", "bello,precioso,espléndido,primoroso"], ["a", "bello", "hermoso,precioso,espléndido"],
  ["a", "bueno", "agradable,excelente,noble,estupendo"], ["a", "malo", "terrible,pésimo,cruel,nefasto"],
  ["a", "rápido", "veloz,ágil,presuroso,ligero"], ["a", "lento", "pausado,tardo,parsimonioso,cansino"],
  ["a", "extraño", "raro,insólito,peculiar,singular,desconcertante"], ["a", "raro", "extraño,insólito,peculiar,curioso"],
  ["a", "feliz", "dichoso,contento,radiante,jubiloso"], ["a", "triste", "afligido,apenado,abatido,melancólico,compungido"],
  ["a", "viejo", "anciano,antiguo,gastado,vetusto,avejentado"], ["a", "nuevo", "reciente,flamante,inédito,novedoso"],
  ["a", "fuerte", "robusto,potente,firme,vigoroso,recio"], ["a", "oscuro", "sombrío,tenebroso,negro,lóbrego,umbrío"],
  ["a", "frío", "gélido,helado,glacial,fresco"], ["a", "caliente", "cálido,ardiente,tórrido,tibio"],
  ["a", "importante", "esencial,relevante,fundamental,decisivo"], ["a", "difícil", "complicado,arduo,peliagudo,espinoso"], ["a", "fácil", "sencillo,simple,llano,accesible"],
  ["a", "largo", "extenso,dilatado,interminable,prolongado"], ["a", "corto", "breve,escueto,fugaz,sucinto"],
  ["a", "alto", "elevado,esbelto,encumbrado,erguido"], ["a", "bajo", "reducido,achaparrado,rastrero"],
  ["a", "cansado", "agotado,exhausto,fatigado,extenuado,rendido"], ["a", "asustado", "aterrado,espantado,sobresaltado,atemorizado"],
  ["a", "enfadado", "furioso,irritado,airado,molesto,encolerizado"], ["a", "sorprendido", "atónito,pasmado,desconcertado,perplejo,estupefacto"],
  ["a", "silencioso", "callado,sigiloso,mudo,sosegado"], ["a", "lleno", "repleto,colmado,abarrotado,rebosante"], ["a", "vacío", "desierto,hueco,despoblado,yermo"],
  ["a", "pesado", "denso,abrumador,gravoso,macizo"], ["a", "ligero", "liviano,leve,tenue,ingrávido"],
  ["a", "brillante", "resplandeciente,luminoso,radiante,fulgurante"], ["a", "claro", "nítido,diáfano,luminoso,evidente"],
  ["a", "duro", "firme,rígido,recio,severo"], ["a", "suave", "tierno,delicado,mullido,sedoso"],
  ["a", "terrible", "espantoso,atroz,horrendo,pavoroso"], ["a", "increíble", "asombroso,extraordinario,inverosímil,pasmoso"],
  ["a", "loco", "demente,desquiciado,trastornado,perturbado"], ["a", "solo", "solitario,aislado,desamparado"],
  ["a", "mismo", "idéntico,igual,semejante"], ["a", "joven", "mozo,juvenil,lozano,imberbe"],
  ["a", "pobre", "humilde,menesteroso,necesitado,modesto"], ["a", "rico", "adinerado,acaudalado,opulento,pudiente"],
  ["a", "seguro", "firme,cierto,confiado,fiable"], ["a", "listo", "ingenioso,astuto,despierto,avispado"],
  ["a", "tonto", "necio,torpe,bobo,simple"], ["a", "gordo", "corpulento,obeso,rollizo,orondo"], ["a", "delgado", "esbelto,flaco,enjuto,fino"],
  ["a", "mojado", "empapado,húmedo,calado,chorreante"], ["a", "sucio", "mugriento,manchado,sórdido,roñoso"], ["a", "limpio", "inmaculado,impoluto,pulcro,aseado"],
  // sustantivos
  ["n", "cosa", "objeto,asunto,elemento,algo concreto"], ["n", "casa", "hogar,vivienda,morada,residencia"],
  ["n", "miedo", "pavor,temor,espanto,terror"], ["n", "puerta", "portón,umbral,entrada,portal"], ["n", "luz", "claridad,resplandor,destello,fulgor"],
  ["n", "noche", "oscuridad,anochecer,madrugada,penumbra"], ["n", "ojo", "mirada,pupila,vista"], ["n", "mano", "palma,puño,garra"],
  ["n", "cara", "rostro,semblante,faz,facciones"], ["n", "rostro", "cara,semblante,faz"], ["n", "gente", "personas,multitud,público,vecinos"],
  ["n", "camino", "senda,sendero,ruta,vereda,trayecto"], ["n", "calle", "vía,avenida,callejón,travesía"], ["n", "ciudad", "urbe,población,metrópoli"],
  ["n", "hombre", "tipo,individuo,varón,sujeto"], ["n", "mujer", "dama,fémina,señora,muchacha"], ["n", "niño", "crío,chiquillo,pequeño,chaval"],
  ["n", "silencio", "quietud,calma,mutismo,sosiego"], ["n", "ruido", "estruendo,estrépito,bullicio,fragor"], ["n", "sonido", "ruido,eco,rumor,murmullo"],
  ["n", "voz", "tono,timbre,acento,murmullo"], ["n", "sombra", "penumbra,silueta,oscuridad,contorno"],
  ["n", "idea", "ocurrencia,noción,pensamiento,concepto"], ["n", "problema", "dificultad,contratiempo,obstáculo,complicación"],
  ["n", "momento", "instante,rato,segundo,lapso"], ["n", "rato", "momento,instante,lapso,tiempo"], ["n", "lugar", "sitio,paraje,rincón,enclave"], ["n", "sitio", "lugar,paraje,rincón"],
  ["n", "mundo", "orbe,universo,tierra,realidad"], ["n", "vida", "existencia,andanza,día a día"], ["n", "muerte", "fallecimiento,fin,deceso,óbito"],
  ["n", "sueño", "ensueño,quimera,fantasía,anhelo"], ["n", "dolor", "pena,tormento,sufrimiento,aflicción"], ["n", "alegría", "gozo,júbilo,dicha,regocijo"],
  ["n", "pregunta", "interrogante,cuestión,duda"], ["n", "respuesta", "contestación,réplica,solución"], ["n", "trabajo", "labor,tarea,faena,empleo"],
  ["n", "amigo", "compañero,camarada,colega,allegado"], ["n", "enemigo", "adversario,rival,contrincante,oponente"],
  ["n", "viento", "brisa,ráfaga,corriente,aire"], ["n", "agua", "líquido,caudal,corriente"], ["n", "fuego", "llama,lumbre,hoguera,incendio"],
  ["n", "pared", "muro,tabique,muralla"], ["n", "ventana", "cristal,ventanal,tragaluz"], ["n", "habitación", "estancia,cuarto,aposento,sala"], ["n", "cuarto", "habitación,estancia,aposento"],
  ["n", "coche", "automóvil,vehículo,carro"], ["n", "barco", "nave,embarcación,navío,buque"], ["n", "montaña", "monte,cumbre,sierra,cordillera"],
  ["n", "bosque", "selva,espesura,arboleda,floresta"], ["n", "camisa", "blusa,prenda"], ["n", "mirada", "vistazo,ojeada,vista,atisbo"],
  ["n", "sonrisa", "mueca,gesto amable,rictus"], ["n", "paso", "zancada,pisada,andar"],
  // adverbios y otros
  ["d", "rápidamente", "deprisa,a toda prisa,con rapidez,velozmente"], ["d", "lentamente", "despacio,con lentitud,poco a poco,a paso lento"],
  ["d", "silenciosamente", "en silencio,sin hacer ruido,con sigilo"], ["d", "suavemente", "con suavidad,con delicadeza,despacio"],
  ["d", "fácilmente", "con facilidad,sin esfuerzo,sin dificultad"], ["d", "finalmente", "al fin,por fin,al final,por último"],
  ["d", "claramente", "con claridad,sin duda,de forma nítida"], ["d", "inmediatamente", "al instante,de inmediato,en el acto,sin demora"],
  ["d", "felizmente", "con alegría,con gozo,contento"], ["d", "tristemente", "con tristeza,con pesar,apenado"],
  ["d", "cuidadosamente", "con cuidado,con esmero,con tiento,con cautela"], ["d", "fuertemente", "con fuerza,con ímpetu,con vigor"],
  ["d", "lentamente", "despacio,con lentitud,poco a poco"], ["d", "repentinamente", "de pronto,de repente,súbitamente,de golpe"], ["d", "súbitamente", "de pronto,de repente,de golpe"],
  ["d", "probablemente", "quizá,tal vez,seguramente,acaso"], ["d", "evidentemente", "sin duda,es obvio que,claramente"], ["d", "ciertamente", "en efecto,sin duda,desde luego"],
  ["d", "totalmente", "por completo,del todo,enteramente"], ["d", "completamente", "por completo,del todo,enteramente"], ["d", "absolutamente", "por completo,del todo"],
  ["d", "ligeramente", "un tanto,levemente,apenas"], ["d", "nerviosamente", "con nerviosismo,con inquietud"], ["d", "rápido", "deprisa,a toda prisa,con rapidez"],
  ["d", "muy", "sumamente,harto,tan"], ["d", "mucho", "bastante,en abundancia,sobremanera"],
];
D.push(...EXTRA); // las entradas posteriores pisan a las anteriores
const DATOS = new Map<string, { cat: Cat; sin: string[] }>();
for (const [cat, lema, sin] of D) DATOS.set(cat + ":" + fold(lema), { cat, sin: sin.split(",") });

// Formas irregulares frecuentes (3.ª persona) -> [lema, tiempo].
type Base = "inf" | "p3s" | "p3p" | "i3s" | "i3p" | "r3s" | "r3p" | "ger" | "part";
export type T = Base | "f3s" | "f3p" | "c3s" | "c3p"; // futuro y condicional: infinitivo + terminación
const IRREGULARES: Record<string, [string, T]> = {
  dijo: ["decir", "p3s"], dijeron: ["decir", "p3p"], dice: ["decir", "r3s"], dicen: ["decir", "r3p"], decía: ["decir", "i3s"], decían: ["decir", "i3p"], diciendo: ["decir", "ger"],
  vio: ["ver", "p3s"], vieron: ["ver", "p3p"], ve: ["ver", "r3s"], ven: ["ver", "r3p"], veía: ["ver", "i3s"], veían: ["ver", "i3p"],
  puso: ["poner", "p3s"], pusieron: ["poner", "p3p"], pone: ["poner", "r3s"], ponen: ["poner", "r3p"], ponía: ["poner", "i3s"],
  hizo: ["hacer", "p3s"], hicieron: ["hacer", "p3p"], hace: ["hacer", "r3s"], hacen: ["hacer", "r3p"], hacía: ["hacer", "i3s"], hacían: ["hacer", "i3p"],
  quiso: ["querer", "p3s"], quisieron: ["querer", "p3p"], quiere: ["querer", "r3s"], quieren: ["querer", "r3p"], quería: ["querer", "i3s"], querían: ["querer", "i3p"],
  pidió: ["pedir", "p3s"], sintió: ["sentir", "p3s"], sintieron: ["sentir", "p3p"], siente: ["sentir", "r3s"], sentía: ["sentir", "i3s"],
  siguió: ["seguir", "p3s"], siguieron: ["seguir", "p3p"], sigue: ["seguir", "r3s"], seguía: ["seguir", "i3s"],
  volvió: ["volver", "p3s"], volvieron: ["volver", "p3p"], vuelve: ["volver", "r3s"], volvía: ["volver", "i3s"],
  abrió: ["abrir", "p3s"], abrieron: ["abrir", "p3p"], abre: ["abrir", "r3s"], abría: ["abrir", "i3s"],
  murió: ["morir", "p3s"], murieron: ["morir", "p3p"], cayó: ["caer", "p3s"], cayeron: ["caer", "p3p"], oyó: ["oír", "p3s"], oyeron: ["oír", "p3p"],
  rió: ["reír", "p3s"], rieron: ["reír", "p3p"], sonrió: ["sonreír", "p3s"], sonrieron: ["sonreír", "p3p"], sonríe: ["sonreír", "r3s"], sonreía: ["sonreír", "i3s"],
  trajo: ["traer", "p3s"], trajeron: ["traer", "p3p"], trae: ["traer", "r3s"], condujo: ["conducir", "p3s"],
  salió: ["salir", "p3s"], salieron: ["salir", "p3p"], sale: ["salir", "r3s"], salen: ["salir", "r3p"], salía: ["salir", "i3s"],
  durmió: ["dormir", "p3s"], duerme: ["dormir", "r3s"], dormía: ["dormir", "i3s"],
  encontró: ["encontrar", "p3s"], contó: ["contar", "p3s"], cuenta: ["contar", "r3s"], mostró: ["mostrar", "p3s"], muestra: ["mostrar", "r3s"],
  pensó: ["pensar", "p3s"], piensa: ["pensar", "r3s"], empezó: ["empezar", "p3s"], empieza: ["empezar", "r3s"], comenzó: ["comenzar", "p3s"],
  cerró: ["cerrar", "p3s"], cierra: ["cerrar", "r3s"], despertó: ["despertar", "p3s"], despierta: ["despertar", "r3s"],
  sentó: ["sentar", "p3s"], levantó: ["levantar", "p3s"], movió: ["mover", "p3s"], mueve: ["mover", "r3s"], recordó: ["recordar", "p3s"], recuerda: ["recordar", "r3s"],
  tuvo: ["tener", "p3s"], pudo: ["poder", "p3s"], supo: ["saber", "p3s"], vino: ["venir", "p3s"], fue: ["ir", "p3s"], dio: ["dar", "p3s"],
};
const IRR_REG = Object.fromEntries(Object.entries(IRREGULARES).map(([k, v]) => [fold(k), v])) as Record<string, [string, T]>;

// Terminaciones regulares: tiempo -> [ar, er, ir].
const TERM: Record<Base, [string, string, string]> = {
  inf: ["ar", "er", "ir"], p3s: ["ó", "ió", "ió"], p3p: ["aron", "ieron", "ieron"], i3s: ["aba", "ía", "ía"], i3p: ["aban", "ían", "ían"],
  r3s: ["a", "e", "e"], r3p: ["an", "en", "en"], ger: ["ando", "iendo", "iendo"], part: ["ado", "ido", "ido"],
};
const CLASES = ["ar", "er", "ir"] as const;

const VERBOS = new Map(D.filter((d) => d[0] === "v").map((d) => [fold(d[1]), d[1]] as [string, string]));

// Forma verbal -> [lema, tiempo] (regular, con el lema comprobado en el diccionario; o irregular conocida).
// Las terminaciones se comparan CON tilde (miró ≠ miro: «paso» es un sustantivo).
function analizarVerbo(w: string): [string, T] | null {
  const lw = w.toLowerCase();
  const irr = IRR_REG[fold(lw)];
  if (irr && VERBOS.has(fold(irr[0]))) return [VERBOS.get(fold(irr[0]))!, irr[1]];
  for (const t of Object.keys(TERM) as Base[]) {
    for (let c = 0; c < 3; c++) {
      const e = TERM[t][c];
      if (!lw.endsWith(e) || lw.length <= e.length + 1) continue;
      const lema = VERBOS.get(fold(lw.slice(0, -e.length)) + CLASES[c]);
      if (lema) return [lema, t];
    }
  }
  return null;
}

// Conjuga un verbo del diccionario (regular, o frase con complemento: «fijar la vista en», «esbozar una sonrisa»).
export function conjugar(frase: string, t: T): string | null {
  const [v, ...resto] = frase.split(" ");
  const refl = v.endsWith("se");
  const base = refl ? v.slice(0, -2) : v;
  const c = CLASES.findIndex((x) => base.endsWith(x) || base.endsWith(x.replace("i", "í")));
  if (c < 0) return null;
  const stem = base.slice(0, -2);
  const fut = { f3s: "á", f3p: "án", c3s: "ía", c3p: "ían" }[t as "f3s"];
  const forma = fut ? base + fut : stem + TERM[t as Base][c];
  return [refl ? "se" : "", forma, ...resto].filter(Boolean).join(" ");
}
// Verbos destino que NO se pueden conjugar con terminaciones regulares (cambio de raíz, irregulares, tilde).
const CAMBIA = /^(?:advertir|soltar|probar|acordar|sostener|obtener|contener|retener|mantener|detener|disponer|exponer|imponer|poner|situar|erguir|aupar|proseguir|perseguir|seguir|conseguir|requerir|referir|despedir|atender|ascender|descender|desandar|andar|dar|volver|volverse|oír|reír|sonreír|concluir|producir|producirse|extraviar|desviar|ansiar|esforzar|entretener|divertir|ver|decir|hacer|traer|salir|morir|caer|querer|dormir|sentir|mover|contar|encontrar|mostrar|pensar|empezar|comenzar|cerrar|despertar|sentar|recordar|poder|tener|ir|venir|saber|jugar|volar|pedir|elegir|repetir|preferir|sugerir|mentir|convertir|defender|encender|entender|perder|continuar|enviar)$/;
const regular = (frase: string) => { const v = frase.split(" ")[0]; return !CAMBIA.test(v) && !CAMBIA.test(v.length > 6 ? v.replace(/se$/, "") : v); };

const plural = (w: string) => (/[aeiouáéíóú]$/i.test(w) ? w + "s" : /z$/i.test(w) ? w.slice(0, -1) + "ces" : w + "es");
const conCaso = (orig: string, s: string) => (orig[0] && orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase() ? s[0].toUpperCase() + s.slice(1) : s);

// Lema de adjetivos/sustantivos: quita plural y busca la forma masculina/singular en el diccionario.
function analizarNombre(w: string): { cat: Cat; sin: string[]; pl: boolean; fem: boolean } | null {
  const f = fold(w);
  const sing: [string, boolean][] = [[f, false], [f.replace(/s$/, ""), true], [f.replace(/es$/, ""), true], [f.replace(/ces$/, "z"), true]];
  for (const [s, pl] of sing) {
    for (const [k, fem] of [[s, false], [s.replace(/a$/, "o"), true]] as [string, boolean][]) {
      for (const cat of ["a", "n", "d"] as Cat[]) {
        const e = DATOS.get(cat + ":" + k);
        if (e) return { cat, sin: e.sin, pl, fem: fem && cat === "a" };
      }
    }
  }
  return null;
}

const concuerda = (s: string, pl: boolean, fem: boolean) => {
  if (s.includes(" ")) return s;
  let r = s;
  if (fem && /o$/i.test(r)) r = r.slice(0, -1) + "a";
  return pl ? plural(r) : r;
};

// Sinónimos que el usuario añade desde el menú (palabra exacta -> lista). Se guardan en este navegador.
const KEY = "shakes.sinonimos";
const leer = (): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
let propios = leer();
export const propiosDe = (w: string): string[] => propios[fold(w)] ?? [];
export function aprender(w: string, lista: string[]) {
  const l = [...new Set(lista.map((x) => x.trim()).filter(Boolean))];
  propios = { ...propios };
  if (l.length) propios[fold(w)] = l; else delete propios[fold(w)];
  try { localStorage.setItem(KEY, JSON.stringify(propios)); } catch {}
}

// Sinónimos para `w` con su misma forma (primero los del usuario). Vacío si no está en el diccionario.
export function sinonimos(w: string): string[] {
  const mios = propiosDe(w).map((s) => conCaso(w, s));
  return [...new Set([...mios, ...sinonimosDic(w)])];
}
function sinonimosDic(w: string): string[] {
  const v = analizarVerbo(w);
  if (v) {
    const e = DATOS.get("v:" + fold(v[0]));
    const out = (e?.sin ?? []).map((s) => (v[1] === "inf" ? s : regular(s) ? conjugar(s, v[1]) : null)).filter((x): x is string => !!x);
    return out.map((s) => conCaso(w, s));
  }
  const n = analizarNombre(w);
  if (n) return n.sin.map((s) => conCaso(w, n.cat === "d" ? s : concuerda(s, n.pl, n.fem)));
  return [];
}

// Adverbio en -mente: sinónimos del diccionario o la perífrasis «de manera + adjetivo» (siempre correcta).
export function sinonimosAdverbio(w: string): string[] {
  const e = DATOS.get("d:" + fold(w));
  const base = w.replace(/mente$/i, "");
  const out = [...(e?.sin ?? []), `de manera ${base.toLowerCase()}`, `de forma ${base.toLowerCase()}`];
  return [...new Set(out)].slice(0, 5).map((s) => conCaso(w, s));
}

// «muy + adjetivo» -> adjetivo más fuerte (muy grande -> enorme).
const FUERTE: Record<string, string> = {
  grande: "enorme", pequeño: "diminuto", bonito: "precioso", bueno: "excelente", malo: "pésimo", rápido: "veloz", lento: "pausado", feliz: "eufórico",
  triste: "desolado", cansado: "exhausto", asustado: "aterrado", enfadado: "furioso", hermoso: "espléndido", frío: "gélido", caliente: "ardiente",
  oscuro: "negro", viejo: "anciano", importante: "esencial", difícil: "arduo", fácil: "sencillo", largo: "interminable", corto: "breve", sorprendido: "atónito",
  silencioso: "sigiloso", lleno: "repleto", sucio: "mugriento", mojado: "empapado", delgado: "esbelto", gordo: "obeso", pobre: "menesteroso", rico: "opulento",
  terrible: "espantoso", brillante: "resplandeciente", ligero: "liviano", pesado: "abrumador", fuerte: "vigoroso", extraño: "insólito", raro: "insólito",
};
export function fuerte(adj: string): string | null {
  const f = fold(adj);
  const pl = f.endsWith("s") && !FUERTE[f] && FUERTE[f.slice(0, -1)] !== undefined;
  const sing = pl ? f.slice(0, -1) : f;
  const fem = !FUERTE[sing] && /a$/.test(sing) && FUERTE[sing.replace(/a$/, "o")] !== undefined;
  const key = fem ? sing.replace(/a$/, "o") : sing;
  const k = Object.keys(FUERTE).find((x) => fold(x) === key);
  return k ? concuerda(FUERTE[k], pl, fem) : null;
}

export { conCaso };
