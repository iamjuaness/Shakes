// Ejecutar: node plugins/herramientas/herramientas.test.ts  (lógica pura de las herramientas; fichas-auto tiene su propio test)
import assert from "node:assert/strict";
import { tipografia } from "./dialogo-auto/tipografia.ts";
import { lint } from "./linter-estilo/reglas.ts";
import { fallos, palabrasDe } from "./ortografia/revisar.ts";
import { muletillas, repeticiones } from "./repeticiones/reglas.ts";
import { inconsistencias } from "./inconsistencias/reglas.ts";
import { familia } from "./arbol-genealogico/familia.ts";
import { docxBloques, estructura, mdBloques } from "./importar/importar.ts";
import { toFountain, toLatex } from "./exportar-extra/formatos.ts";
import { editorial } from "./manuscrito-editorial/editorial.ts";
import { generar } from "./_comun/nombres.ts";
import { cardToMd, nombreArchivo } from "./obsidian-sync/obsidian.ts";
import { resumir } from "./resumen-escenas/resumen.ts";

// ortografía (corrector simulado: solo conoce estas palabras)
const dicc = { correct: (w: string) => ["hola", "mundo", "casa", "la", "es", "de"].includes(w.toLowerCase()) };
const mal = (t: string, ok: string[] = []) => fallos(t, dicc, palabrasDe(ok)).map((f) => f.word);
assert.deepEqual(mal("Hola mundoo, la casa."), ["mundoo"]);
assert.deepEqual(mal("Hola Véronique. Casa de Vero."), [], "mayúscula a mitad de frase = nombre propio");
assert.deepEqual(mal("Véronique es casa."), ["Véronique"], "al abrir frase sí se revisa");
assert.deepEqual(mal("Véronique es casa.", ["Véronique Dupont"]), [], "nombres de fichas conocidos");
assert.deepEqual(mal("la ONU y a"), [], "siglas y una letra no cuentan");

// diálogo
assert.deepEqual(tipografia("", '"'), { borrar: 0, texto: "«" });
assert.deepEqual(tipografia("dijo «hola", '"'), { borrar: 0, texto: "»" });
assert.deepEqual(tipografia("a -", "-"), { borrar: 1, texto: "—" });
assert.equal(tipografia("hola", "x"), null);

// linter
const tipos = (t: string) => lint(t).map((x) => x.tipo).sort();
assert.deepEqual(tipos("Caminó lentamente. Fue robada por todos."), ["adverbio", "pasiva"]);
assert.ok(lint(Array(45).fill("palabra").join(" ") + ".").some((t) => t.tipo === "larga"));
// adverbios: sí en -mente reales, no en palabras que solo terminan igual
assert.deepEqual(tipos("Habló rápidamente y felizmente."), ["adverbio", "adverbio"]);
assert.deepEqual(tipos("Su mente era vehemente. Que no se aumente."), []);
// pasiva: hecho -> siempre; estado (es/era) solo con «por»
assert.deepEqual(tipos("La puerta fue abierta."), ["pasiva"]);
assert.deepEqual(tipos("Era un hombre cansado y estaba aburrido. Es sabido."), [], "adjetivos no son pasiva");
assert.deepEqual(tipos("El ladrón era perseguido por la policía."), ["pasiva"]);
assert.deepEqual(tipos("Fue escrita por ella y también fue hecha."), ["pasiva", "pasiva"]);
assert.deepEqual(tipos("Siempre había sido tranquila."), []);
// gramática
assert.deepEqual(tipos("Pienso de que vendrá."), ["gramatica"]);
assert.deepEqual(tipos("Me di cuenta que mentía."), ["gramatica"]);
assert.deepEqual(tipos("Quiso subir arriba."), ["gramatica"]);
assert.deepEqual(tipos("Pienso que vendrá."), []);
// tipografía
assert.deepEqual(tipos("Hola  mundo ."), ["tipografia", "tipografia"]);
assert.deepEqual(tipos("Espera... ¿sí?"), [], "los tres puntos están bien");
// inicios repetidos
assert.deepEqual(tipos("Él llegó. Él miró. Él calló. Ella rió."), ["inicio"]);
assert.deepEqual(tipos("Él llegó. Él miró. Ella calló."), []);

// repeticiones
const r = repeticiones("Dijo algo grande y luego dijo otra cosa.");
assert.deepEqual(r.map((x) => x.palabra), ["dijo"]);
assert.ok(r[0].sugerencias.length > 0 && r[0].distancia > 0);
assert.deepEqual(repeticiones("casa " + "x ".repeat(30) + "casa"), [], "fuera de ventana");
assert.deepEqual(repeticiones("La puerta crujió y otra puerta más lejos.").map((x) => x.palabra), ["puerta"]);
assert.deepEqual(repeticiones("Los zapatos y el zapato").map((x) => x.palabra), ["zapato"], "plural = singular");
assert.deepEqual(repeticiones("Vio a Marcos. Luego Marcos rió.").map((x) => x.palabra), [], "nombre propio a mitad de frase");
assert.deepEqual(repeticiones("la puerta cruje", "otra puerta cerrada").map((x) => x.palabra), ["puerta"], "entre párrafos");
assert.deepEqual(repeticiones("era un hombre que era alto y estaba cerca").map((x) => x.palabra), [], "auxiliares ignorados");
assert.deepEqual(muletillas("Es, o sea, básicamente un problema.").map((m) => m.frase), ["o sea", "básicamente"]);

// inconsistencias
const cards = [{ id: "1", name: "Elena", notes: "Ojos azules. Tiene 30 años." }];
const sc = [{ id: "s", title: "Uno", text: "Elena abrió sus ojos verdes. Más tarde Elena, de 30 años, rió." }];
assert.deepEqual(inconsistencias(cards, sc).map((i) => [i.attr, i.escena]), [["ojos", "verdes"]]);

// genealogía
const f = familia([{ from: "a", to: "b", label: "padre de" }, { from: "c", to: "b", label: "madre de" }, { from: "d", to: "b", label: "hijo de" }, { from: "a", to: "c", label: "esposo de" }]);
assert.deepEqual([f.gen.get("a"), f.gen.get("c"), f.gen.get("b"), f.gen.get("d")], [0, 0, 1, 2], "pareja misma generación; «d hijo de b» queda bajo b");

// importar
const md = "Intro suelta\n\n# Alfa\n\nTexto **fuerte** y *suave*.\n\n## Beta\nOtra";
const imp = estructura(mdBloques(md), "x.md");
assert.deepEqual(imp.map((e) => [e.tipo, e.titulo]), [["chapter", "x.md"], ["chapter", "Alfa"]], "2 niveles = capítulos y escenas; el texto suelto inicial es un capítulo");
assert.equal(imp[1].html, "<p>Texto <strong>fuerte</strong> y <em>suave</em>.</p><hr><p>Otra</p>", "la escena Beta es un cambio de escena dentro de Alfa");
assert.equal(imp[1].hijos.length, 0);
const solo = estructura(mdBloques("# Uno\n\nHola **fuerte**\n\n# Dos\n\nAdios"), "x");
assert.deepEqual(solo.map((e) => [e.tipo, e.titulo, e.html.includes("<p>")]), [["chapter", "Uno", true], ["chapter", "Dos", true]], "solo capítulos: sin partes");
const tres = estructura(mdBloques("# L1\n## C1\n### E1\ntexto\n### E2\notro\n## C2\n### E3\nx\n# L2\n## C3\n### E4\ny"), "x");
assert.deepEqual(tres.map((p) => [p.tipo, p.hijos.map((c) => c.html.split("<hr>").length)]), [["part", [2, 1]], ["part", [1]]]);
const kw = estructura(mdBloques("# Capítulo 1\n\n## Escena 1\nhola\n# Capítulo 2\ntexto suelto"), "x");
assert.deepEqual(kw.map((c) => [c.tipo, c.html]), [["chapter", "<p>hola</p>"], ["chapter", "<p>texto suelto</p>"]], "«Escena 1» al empezar el capítulo no deja separador");
assert.deepEqual(docxBloques('<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Cap &amp; 1</w:t></w:r></w:p><w:p><w:r><w:t>Hola</w:t></w:r><w:r><w:t> mundo</w:t></w:r></w:p>'), [{ h: true, n: 1, t: "Cap & 1" }, { h: false, t: "Hola mundo" }]);

// formatos
const book: any = { id: "b", kind: "book", title: "Mi_libro & Co", children: [{ id: "p", kind: "part", title: "P1", children: [{ id: "c", kind: "chapter", title: "C1", content: "<p>Hola 50% listo.</p><hr><p>Luego.</p>", children: [] }] }] };
assert.ok(toFountain(book).includes("## C1") && toFountain(book).includes("==="), "capítulo con su texto y salto de escena");
assert.ok(toLatex(book).includes(String.raw`50\% listo`) && toLatex(book).includes(String.raw`Mi\_libro \& Co`));
const ed = editorial(book, "Ana Pérez");
assert.ok(ed.includes("Pérez / MI_LIBRO") && ed.includes("aprox. 100 palabras"));

// nombres
const n = generar("vikinga", 5);
assert.equal(n.length, 5);
assert.equal(new Set(n).size, 5);
assert.deepEqual(generar("Marciana", 3), []);

// obsidian
assert.equal(nombreArchivo("A/B: C"), "A-B- C.md");
const md2 = cardToMd({ id: "1", type: "character", name: "Elena", notes: "Hola", links: [{ to: "2", label: "hermana de" }] }, [{ id: "2", type: "character", name: "Rosa", notes: "" } as any], ["Esc 1"]);
assert.ok(md2.includes("hermana de: [[Rosa]]") && md2.includes("- Esc 1") && md2.startsWith("---"));

// resumen
assert.equal(resumir("Uno. Dos. Tres."), "Uno. Dos.");
assert.ok(resumir("x".repeat(500)).length <= 200);
console.log("herramientas ok");

// ---- sustitutos ----
import { sinonimos } from "./_comun/sinonimos.ts";
{
  const s = (w: string) => sinonimos(w);
  assert.ok(s("dijo").includes("afirmó"), "irregular -> pretérito 3s");
  assert.ok(s("dijeron").includes("afirmaron"), "plural");
  assert.ok(s("miró").includes("observó"), "regular");
  assert.ok(s("caminaba").includes("avanzaba"), "imperfecto");
  assert.ok(s("grandes").includes("enormes"), "plural adj");
  assert.ok(s("pequeña").includes("diminuta"), "femenino");
  assert.ok(s("casas").includes("hogares") || s("casas").includes("viviendas"), "plural nombre");
  assert.ok(s("Miró").includes("Observó"), "mayúscula inicial");
  assert.ok(!s("paso").some((x) => /ó$/.test(x)), "«paso» no es verbo");
  const pas = (t: string) => lint(t).find((x) => x.tipo === "pasiva")!.sug;
  assert.deepEqual(pas("La casa fue construida."), ["se construyó"], "irregular -ido");
  assert.deepEqual(pas("Las puertas fueron abiertas."), ["se abrieron"]);
  assert.deepEqual(pas("La carta ha sido escrita."), ["se ha escrito"]);
  assert.deepEqual(pas("El pacto será hecho."), ["se hará"]);
  assert.deepEqual(pas("La carta era hecha por Ana.") ?? [], [], "con agente no se propone");
  assert.ok(sinonimos("abrazó").includes("estrechó"), "diccionario ampliado");
  assert.ok(sinonimos("tarde").length > 0 && sinonimos("rostro").length > 0);
  assert.deepEqual(s("xyzzy"), []);
  assert.ok(repeticiones("Miró la puerta y luego miró otra vez.").some((r) => r.sugerencias.includes("observó")), "repe con sustitutos");
  assert.ok(muletillas("Digamos que no.").every((m) => m.sugerencias.length > 0), "muletillas con sustitutos");
  const l = lint("Caminó rápidamente hacia la casa.");
  assert.ok(l.find((x) => x.tipo === "adverbio")!.sug!.includes("deprisa"), "adverbio");
  assert.ok(lint("Era muy grande.").some((x) => x.tipo === "vago" && x.sug![0] === "enorme"), "muy grande");
  assert.deepEqual(lint("La carta fue enviada.").find((x) => x.tipo === "pasiva")!.sug, ["se envió"]);
  assert.deepEqual(lint("Las cartas fueron enviadas.").find((x) => x.tipo === "pasiva")!.sug, ["se enviaron"]);
  assert.deepEqual(lint("Pienso de que es tarde.").find((x) => x.tipo === "gramatica")!.sug, ["Pienso que"]);
  assert.deepEqual(lint("Hay  dos espacios.").find((x) => x.tipo === "tipografia")!.sug, [" "]);
  const larga = Array(22).fill("uno").join(" ") + ", y " + Array(22).fill("dos").join(" ") + ".";
  assert.ok(lint(larga).find((x) => x.tipo === "larga")!.sug![0].includes(". "), "dividir frase larga");
  console.log("sustitutos ok");
}

{
  const md = cardToMd({ id: "1", type: "character", name: "Ana", notes: "", age: "30", job: "Farera", flaw: "Orgullo" }, [], []);
  assert.ok(md.includes("**Edad:** 30") && md.includes("### Defecto central\nOrgullo"), "personaje: campos en el md");
  assert.ok(!cardToMd({ id: "2", type: "place", name: "X", notes: "", age: "9" }, [], []).includes("Edad"), "solo personajes");
}

// guion
{
  const g = await import("./guion/guion.ts");
  assert.equal(g.detectar("int. casa de ana - noche", "action"), "heading");
  assert.equal(g.detectar("CORTE A:", "action"), "transition");
  assert.equal(g.detectar("MAÑANA:", "action"), "action", "una palabra acabada en A: no es transición");
  assert.equal(g.detectar("(en voz baja)", "dialogue"), "paren");
  assert.equal(g.detectar("(nota)", "action"), "action", "paréntesis en la acción sigue siendo acción");
  assert.deepEqual([g.siguiente("character"), g.siguiente("dialogue"), g.siguiente("heading")], ["dialogue", "action", "action"]);
  assert.equal(g.ciclo("heading", 1), "action", "Tab da la vuelta");
  assert.equal(g.ciclo("action", -1), "heading");
  const html = '<p data-sp="heading">INT. FARO - NOCHE</p><p>Ana sube.</p><p data-sp="character">Ana (V.O.)</p><p data-sp="paren">susurra</p><p data-sp="dialogue">No mires &amp; calla.</p><p data-sp="transition">CORTE A:</p>';
  assert.deepEqual(g.reparto(html), ["ANA"]);
  assert.equal(g.encabezado(html), "INT. FARO - NOCHE");
  assert.ok(g.paginas(html) > 0 && g.paginas(html) < 1);
  const obra: any = { id: "g", kind: "script", title: "Faro", meta: { author: "Ana" }, children: [{ id: "a", kind: "act", title: "Acto 1", children: [{ id: "s", kind: "scene", title: "E", content: html, children: [] }] }] };
  const fo = g.fountain(obra);
  assert.ok(fo.includes("Title: Faro") && fo.includes("# Acto 1") && fo.includes("INT. FARO - NOCHE\n\nAna sube."), "encabezado y acción");
  assert.ok(fo.includes("@ANA (V.O.)\n(susurra)\nNo mires & calla.") || fo.includes("ANA (V.O.)\n(susurra)\nNo mires & calla."), "personaje, acotación y diálogo seguidos");
  assert.ok(fo.includes("CORTE A:"), "transición");
  { const { guionPdf } = await import("./guion/pdf.ts"); const t = new TextDecoder("latin1").decode(guionPdf(obra)); assert.ok(t.includes(String.raw`(\(susurra\)) Tj`) && t.includes("(No mires & calla.) Tj"), "PDF: acotación con paréntesis escapados"); }
  console.log("guion ok");
}
{
  const g = await import("./guion/guion.ts");
  assert.equal(g.detectar("fundido a negro", "action"), "transition");
  assert.equal(g.detectar("Corte a:", "action"), "transition");
  assert.ok(g.encabezadoOk("INT. CASA DE ANA - NOCHE") && g.encabezadoOk("EXT. PLAYA – DÍA"));
  assert.ok(!g.encabezadoOk("INT. CASA") && !g.encabezadoOk("CASA - NOCHE"), "faltan momento o INT./EXT.");
  assert.equal(g.completar("an", ["ANA", "ANDRÉS"]), "ANA", "el más usado primero");
  assert.equal(g.completar("ANA", ["ANA"]), null, "ya completo");
  assert.equal(g.completar("zz", ["ANA"]), null);
  const obra: any = { id: "o", kind: "script", title: "T", children: [{ id: "1", kind: "scene", title: "a", children: [], content: '<p data-sp="character">LUIS</p>' }, { id: "2", kind: "scene", title: "b", children: [], content: '<p data-sp="character">LUIS</p><p data-sp="character">ANA</p>' }] };
  assert.deepEqual(g.personajes(obra, ["Marta"]), ["LUIS", "ANA", "MARTA"]);
  assert.equal(g.papelPara("en-US"), "letter");
  assert.equal(g.papelPara("es-MX"), "A4");
  const { guionPdf } = await import("./guion/pdf.ts");
  const txt = (o: any, p?: any) => new TextDecoder("latin1").decode(guionPdf(o, p));
  const pdf = txt({ ...obra, children: [{ id: "3", kind: "scene", title: "c", children: [], content: '<p data-sp="heading">int. casa - día</p><p>Se oye un <strong>DISPARO</strong><span>.</span></p>' }] }, "A4");
  assert.ok(pdf.startsWith("%PDF-1.4") && pdf.includes("/BaseFont /Courier ") && pdf.includes("/MediaBox [0 0 595.28 841.89]"), "PDF, Courier y A4");
  assert.ok(pdf.includes("/Count 2") && pdf.includes("(2.) Tj") && !pdf.includes("(1.) Tj"), "portada sin número; «2.» en la primera hoja del guion");
  assert.ok(pdf.includes("1 0 0 1 108.00") && pdf.includes("(INT. CASA - DÍA) Tj"), "margen izquierdo 1,5\" y encabezado en mayúsculas");
  assert.ok(pdf.includes("/F2 12 Tf (DISPARO) Tj") && !pdf.includes("span"), "negrita en la acción; otras etiquetas fuera");
  const largo = { ...obra, children: [{ id: "4", kind: "scene", title: "d", children: [], content: '<p data-sp="character">ANA</p><p data-sp="dialogue">' + "palabra ".repeat(800) + "</p>" }] };
  const multi = txt(largo);
  assert.ok(multi.includes(String.raw`(\(MÁS\)) Tj`) && multi.includes(String.raw`(ANA \(CONT.\)) Tj`), "diálogo partido con (MÁS) y (CONT.)");
  const xref = Number(multi.match(/startxref\n(\d+)/)![1]);
  assert.ok(multi.slice(xref).startsWith("xref"), "tabla xref en su sitio");
  console.log("guion estándar ok");
}

{
  const { enEspanol } = await import("./_comun/texto.ts");
  assert.ok(enEspanol({ bookLang: "es" }) && enEspanol({ bookLang: "es-MX" }) && enEspanol({}), "español o host antiguo sin idioma");
  assert.ok(!enEspanol({ bookLang: "en" }) && !enEspanol({ bookLang: "eu" }) && !enEspanol({ bookLang: "et" }), "otros idiomas no");
  console.log("idioma ok");
}
{
  const g = await import("./guion/guion.ts");
  const o: any = { id: "o", kind: "script", title: "T", children: [{ id: "1", kind: "scene", title: "a", children: [], content: '<p data-sp="character">ANA SUBE LA ESCALERA. SE OYE UN TRUENO.</p><p data-sp="character">DR. LÓPEZ</p>' }] };
  assert.deepEqual(g.personajes(o), ["DR. LÓPEZ"], "una frase no es un personaje; DR. LÓPEZ sí");
  console.log("personajes ok");
}
{
  const g = await import("./guion/guion.ts");
  assert.deepEqual(g.elementos("comic"), ["action", "character", "dialogue", "caption", "sfx", "heading"]);
  assert.equal(g.ciclo("sfx", 1, "comic"), "heading");
  assert.equal(g.detectar("Viñeta 3", "action", "comic"), "heading");
  assert.equal(g.detectar("INT. CASA - DÍA", "action", "comic"), "action", "INT. solo es encabezado en cine");
  assert.equal(g.detectar("Escena II", "action", "theatre"), "heading");
  assert.equal(g.detectar("Música: piano suave", "action", "audio"), "music");
  assert.equal(g.siguiente("dialogue", "comic"), "character", "cómic: tras un globo, otro personaje");
  assert.equal(g.nombreElem("action", "theatre"), "Acotación");
  assert.equal(g.nombreElem("heading", "comic", true), "Panel");
  const { guionPdf } = await import("./guion/pdf.ts");
  const c: any = { id: "c", kind: "script", title: "C", meta: { formato: "comic" }, children: [{ id: "p", kind: "scene", title: "P", children: [], content: '<p data-sp="heading">Viñeta 1</p><p data-sp="sfx">bum</p><p data-sp="caption">Mientras tanto</p>' }] };
  const t = new TextDecoder("latin1").decode(guionPdf(c));
  assert.ok(t.includes("/F2 12 Tf (BUM) Tj") && t.includes("/F3 12 Tf (Mientras tanto) Tj"), "onomatopeya en negrita y mayúsculas; cartela en cursiva");
  console.log("formatos de guion ok");
}
{
  const N = await import("./_comun/nombres.ts");
  let k = 0; const r = () => ((k = (k * 9301 + 49297) % 233280) / 233280); // aleatorio con semilla
  assert.ok(N.CULTURAS.length >= 60, "muchas culturas");
  for (const c of N.CULTURAS) {
    assert.ok(c.modo === "mezcla" || (c.f.length >= 6 && c.m.length >= 6), `${c.id}: listas de nombres`);
    assert.ok(!N.CULTURAS.some((x) => x !== c && x.id === c.id), `${c.id}: id único`);
    const n = N.generar(c.id, 3, "x", r);
    assert.equal(n.length, 3, `${c.id}: genera`);
    assert.ok(n.every((x) => x && !x.includes("_") && !x.includes("undefined")), `${c.id}: ${n.join(" / ")}`);
  }
  assert.equal(N.femEslavo("Volkov"), "Volkova");
  assert.equal(N.femEslavo("Kowalski"), "Kowalska");
  assert.match(N.nombreCompleto(N.cultura("rusia")!, "f", r).completo, /a$/, "apellido ruso en femenino");
  assert.equal(N.nombreCompleto(N.cultura("espana")!, "m", r).completo.split(" ").length >= 3, true, "dos apellidos");
  assert.match(N.nombreCompleto(N.cultura("vikinga")!, "f", r).completo, /dóttir$/, "patronímico");
  const jp = N.nombreCompleto(N.cultura("japon")!, "f", r);
  assert.ok(N.cultura("japon")!.ap.includes(jp.completo.split(" ")[0]), "apellido delante en Japón");
  assert.match(N.nombreCompleto(N.cultura("grecia")!, "m", r, true).completo, /, son of /);
  assert.match(N.nombreCompleto(N.cultura("futuro")!, "x", r).completo, /\S+ \S+-\S+/, "futuro: apellidos mestizos");
  assert.ok(N.EPOCAS.every(([e]) => N.culturasDe(e).length > 0), "cada época tiene culturas");
  console.log("nombres ok");
}
{
  const C = await import("./taller-creativo/crear.ts");
  let k = 7; const rnd = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
  assert.equal(C.oficioEs("programadora", "m"), "programador");
  assert.equal(C.oficioEs("enfermero de urgencias", "f"), "enfermera de urgencias");
  assert.equal(C.oficioEs("ladrona de reliquias", "m"), "ladrón de reliquias");
  assert.equal(C.oficioEs("aprendiz de maga", "m"), "aprendiz de mago");
  assert.equal(C.oficioEs("princesa exiliada", "m"), "príncipe exiliado");
  assert.equal(C.oficioEs("soldado sin paga", "f"), "soldado sin paga");
  assert.equal(C.conGenero("fue traicionad{o} y {lo} expulsaron; {el} hij{o} de {ella}", "m"), "fue traicionado y lo expulsaron; el hijo de él");
  const prota: any = { id: "p1", type: "character", name: "Elena Marín", notes: "" };
  const ctx = { genero: "historica" as const, epoca: "s19" as const, en: false, cards: [prota], premisa: "Una farera guarda un secreto", rnd };
  for (let i = 0; i < 30; i++) {
    const p = C.personaje(ctx, "antagonista");
    const cd = p.card;
    assert.ok(cd.name && cd.age && cd.job && cd.virtues && cd.flaw && cd.backstory && cd.lie && cd.arc && cd.trait && cd.notes, "ficha completa");
    assert.ok(!/[{}|]/.test(Object.values(cd).filter((x) => typeof x === "string").join(" ")), "sin marcas sin resolver: " + JSON.stringify(cd));
    assert.equal(cd.links?.[0].to, "p1", "se relaciona con el protagonista");
    assert.ok(Number(cd.age) >= 30 && Number(cd.age) <= 65, "edad de antagonista");
    assert.ok(p.preguntas.some((q) => q.includes("farera")), "pregunta sobre la premisa");
  }
  const en = C.personaje({ genero: "scifi", epoca: "actual", en: true, cards: [], rnd }, "protagonista", "f");
  assert.ok(en.card.notes.includes("Wants:") && !en.card.links, "inglés y sin protagonista previo");
  assert.ok(/-/.test(en.card.name), "ciencia ficción: nombres de las colonias");
  assert.equal(C.rolSugerido([]), "protagonista");
  assert.equal(C.rolSugerido([prota]), "antagonista");
  const fant = C.personaje({ genero: "fantasia", epoca: "medieval", en: false, cards: [], rnd }, "mentor");
  assert.ok(Number(fant.card.age) >= 50, "mentor mayor");
  const lu = C.lugar({ ...ctx, rnd }), ob = C.objeto({ ...ctx, rnd });
  assert.equal(lu.type, "place"); assert.equal(ob.type, "object");
  assert.ok(!/[{}|]/.test(lu.name + lu.notes + ob.name + ob.notes));
  for (const t of ["conflicto", "giro", "chispa", "ejercicio", "titulo"] as const) assert.ok(!/[{}|]/.test(C.idea(ctx, t)), t);
  assert.ok(C.idea({ ...ctx, cards: [] }, "conflicto").length > 10, "sin fichas también");
  assert.equal(C.atasco(ctx).length, 3);
  console.log("taller ok");
}
