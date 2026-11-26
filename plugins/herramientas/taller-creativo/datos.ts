// Tablas del Taller creativo, en español e inglés: cada entrada es "español|english". {A} y {B} son personajes de
// las fichas. Los pares herida/mentira/verdad van alineados por índice. Género gramatical en español:
// {o} = o/a, {a} = (nada)/a, {lo} = lo/la, {el} = el/la, {ella} = él/ella (los oficios se adaptan solos).

export type Mundo = "antiguo" | "s19" | "actual" | "fantasia" | "futuro";

export const GENEROS = [
  ["fantasia", "Fantasía|Fantasy"], ["scifi", "Ciencia ficción|Science fiction"], ["historica", "Histórica|Historical"],
  ["policiaca", "Policiaca / thriller|Crime / thriller"], ["romance", "Romance|Romance"], ["terror", "Terror|Horror"],
  ["realista", "Realista / contemporánea|Literary / contemporary"], ["aventura", "Aventura|Adventure"], ["distopia", "Distopía|Dystopia"],
  ["humor", "Humor|Comedy"], ["juvenil", "Juvenil|Young adult"], ["infantil", "Infantil|Children's"],
] as const;
export type GeneroHistoria = (typeof GENEROS)[number][0];

export const ROLES = [
  ["protagonista", "Protagonista|Protagonist"], ["antagonista", "Antagonista|Antagonist"], ["mentor", "Mentor|Mentor"],
  ["aliado", "Aliado|Ally"], ["amor", "Interés amoroso|Love interest"], ["rival", "Rival|Rival"],
  ["embaucador", "Embaucador|Trickster"], ["guardian", "Guardián del umbral|Threshold guardian"], ["secundario", "Secundario|Supporting"],
] as const;
export type Rol = (typeof ROLES)[number][0];

export const EDAD: Record<Rol, [number, number]> = { protagonista: [17, 45], antagonista: [30, 65], mentor: [50, 82], aliado: [18, 50], amor: [20, 45], rival: [18, 45], embaucador: [20, 60], guardian: [35, 70], secundario: [12, 80] };

export const OFICIOS: Record<Mundo, string[]> = {
  antiguo: ["herrera|blacksmith", "escriba|scribe", "juglar|minstrel", "mercader de sal|salt merchant", "curandera|healer", "soldado sin paga|unpaid soldier", "monje copista|copyist monk", "cazador furtivo|poacher", "tejedora|weaver", "posadero|innkeeper", "hija de un noble arruinado|daughter of a ruined noble", "ladrona de reliquias|relic thief", "partera|midwife", "barquero|ferryman", "alquimista|alchemist", "pastor|shepherd", "verdugo|executioner", "cartógrafo|cartographer"],
  s19: ["institutriz|governess", "telegrafista|telegraph operator", "minero|miner", "periodista de sucesos|crime reporter", "médico rural|country doctor", "cochero|coachman", "costurera|seamstress", "inspector de policía|police inspector", "boticario|apothecary", "banquero|banker", "actriz de vodevil|vaudeville actress", "fotógrafo ambulante|travelling photographer", "maestra de escuela|schoolteacher", "contrabandista|smuggler", "ingeniero del ferrocarril|railway engineer", "sufragista|suffragette", "farero|lighthouse keeper", "naturalista|naturalist"],
  actual: ["programadora|programmer", "enfermero de urgencias|ER nurse", "profesora de instituto|high-school teacher", "repartidor|delivery rider", "abogada laboralista|labour lawyer", "cocinero|cook", "policía local|local police officer", "estudiante de Bellas Artes|art student", "creadora de contenido|content creator", "mecánica|mechanic", "periodista|journalist", "psicóloga|psychologist", "músico callejero|street musician", "arquitecta|architect", "conductor de autobús nocturno|night bus driver", "veterinaria rural|country vet", "bombero|firefighter", "camarera de hotel|hotel housekeeper", "investigadora científica|research scientist", "agente inmobiliario|estate agent"],
  fantasia: ["aprendiz de maga|apprentice mage", "guardabosques|ranger", "cazadora de bestias|beast hunter", "herrero de runas|rune smith", "bardo|bard", "sacerdotisa de la luna|moon priestess", "mercenario|sellsword", "princesa exiliada|exiled princess", "ladrón de sueños|dream thief", "domadora de grifos|griffin tamer", "nigromante arrepentido|repentant necromancer", "cartógrafa de reinos perdidos|cartographer of lost realms", "alquimista de la corte|court alchemist", "caballero sin señor|lordless knight", "bruja del pantano|swamp witch", "escriba de la biblioteca prohibida|scribe of the forbidden library"],
  futuro: ["piloto de carga orbital|orbital freight pilot", "ingeniera de terraformación|terraforming engineer", "hacker de clase baja|underclass hacker", "médico de clones|clone physician", "minero de asteroides|asteroid miner", "negociadora con IA|AI negotiator", "cartógrafa de saltos|jump cartographer", "agente de la Corporación|Corporation agent", "androide doméstico liberado|freed domestic android", "biólogo de mundos nuevos|xenobiologist", "contrabandista de recuerdos|memory smuggler", "soldado de reemplazo|replacement soldier", "archivista de la Tierra perdida|archivist of lost Earth", "jardinera hidropónica|hydroponic gardener", "inspector de colonias|colony inspector"],
};
export const OFICIO_GENERO: Partial<Record<GeneroHistoria, string[]>> = {
  policiaca: ["detective privada|private detective", "forense|forensic pathologist", "inspector de homicidios|homicide inspector", "prestamista|loan shark", "cantante de cabaret|cabaret singer", "abogado defensor|defence lawyer", "periodista de investigación|investigative journalist"],
  terror: ["cuidadora de un caserón|caretaker of an old manor", "sacerdote sin fe|faithless priest", "taxidermista|taxidermist", "parapsicóloga escéptica|sceptical parapsychologist", "sepulturero|gravedigger", "médica de guardia nocturna|night-shift doctor"],
  romance: ["florista|florist", "chef de un restaurante en apuros|chef of a struggling restaurant", "librera|bookseller", "fotógrafo de bodas|wedding photographer", "violinista|violinist"],
  infantil: ["niña inventora|girl inventor", "gato que habla|talking cat", "abuelo farero|lighthouse-keeper grandad", "dragón con miedo al fuego|dragon afraid of fire", "niño explorador|boy explorer"],
};

export const VIRTUDES = ["valiente|brave", "leal|loyal", "compasiv{o}|compassionate", "ingenios{o}|witty", "paciente|patient", "honest{o}|honest", "curios{o}|curious", "generos{o}|generous", "tenaz|tenacious", "observador{a}|observant", "protector{a}|protective", "humilde|humble", "creativ{o}|creative", "disciplinad{o}|disciplined", "optimista|optimistic", "just{o}|fair", "carismátic{o}|charismatic", "resiliente|resilient", "intuitiv{o}|intuitive", "divertid{o}|funny"];
export const DEFECTOS = ["orgullo|pride", "cobardía ante el compromiso|fear of commitment", "rencor|grudge-holding", "impulsividad|impulsiveness", "celos|jealousy", "necesidad de controlarlo todo|need to control everything", "mentir para agradar|lying to please", "arrogancia intelectual|intellectual arrogance", "desconfianza|distrust", "terquedad|stubbornness", "ambición sin límites|limitless ambition", "autocompasión|self-pity", "cinismo|cynicism", "vanidad|vanity", "huir de los problemas|running from problems", "ira contenida|bottled-up anger", "indecisión|indecisiveness", "perfeccionismo paralizante|paralysing perfectionism", "codicia|greed", "lealtad ciega|blind loyalty"];

export const HERIDAS = [
  "perdió a su madre siendo niñ{o} y nadie le explicó por qué|lost their mother as a child and nobody explained why",
  "fue traicionad{o} por su mejor amigo|was betrayed by their best friend",
  "su familia {lo} repudió por elegir su propio camino|was disowned by their family for choosing their own path",
  "causó un accidente en el que murió alguien|caused an accident in which someone died",
  "creció en la pobreza y vio humillados a los suyos|grew up poor and saw their family humiliated",
  "fue abandonad{o} en el altar|was left at the altar",
  "sobrevivió a una guerra que no entiende|survived a war they don't understand",
  "fracasó en público en lo único que sabía hacer|failed in public at the one thing they were good at",
  "le robaron la autoría de su obra|had their work stolen and credited to another",
  "fue {el} hij{o} invisible entre hermanos brillantes|was the invisible child among brilliant siblings",
  "guardó un secreto que destrozó a su familia|kept a secret that tore their family apart",
  "{lo} expulsaron de su comunidad por algo que no hizo|was cast out of their community for something they didn't do",
];
export const MENTIRAS = [
  "querer a alguien es prepararse para perderlo|loving someone means getting ready to lose them",
  "no se puede confiar en nadie|you can't trust anyone",
  "solo vale lo que demuestra|you're only worth what you prove",
  "no merece ser feliz|they don't deserve to be happy",
  "el dinero es lo único que protege|money is the only real protection",
  "no es suficiente para que alguien se quede|they are not enough for anyone to stay",
  "el mundo no tiene sentido y nada importa|the world makes no sense and nothing matters",
  "si no es el mejor, no es nada|if they're not the best, they're nothing",
  "lo que es suyo siempre se lo quitarán|whatever is theirs will always be taken",
  "nadie {lo} ve si no hace ruido|nobody sees them unless they make noise",
  "callar protege a los que ama|silence protects the ones they love",
  "nunca podrá volver a pertenecer a ningún sitio|they can never belong anywhere again",
];
export const VERDADES = [
  "el amor vale aunque duela perderlo|love is worth it even if losing it hurts",
  "confiar es elegir, y algunos lo merecen|trust is a choice, and some people deserve it",
  "vale por quien es, no por lo que logra|they matter for who they are, not what they achieve",
  "el perdón empieza por uno mismo|forgiveness starts with oneself",
  "las personas protegen más que el dinero|people protect better than money",
  "quien se queda lo hace por elección|those who stay do so by choice",
  "el sentido se construye haciéndose cargo de otros|meaning is built by caring for others",
  "fallar no borra lo que es|failing doesn't erase who they are",
  "compartir no es perder|sharing is not losing",
  "su voz importa aunque sea suave|their voice matters even when it's quiet",
  "la verdad duele menos que el silencio|the truth hurts less than silence",
  "la pertenencia se gana dando, no pidiendo permiso|belonging is earned by giving, not by asking permission",
];
export const DESEOS = ["recuperar lo que le quitaron|get back what was taken from them", "ser reconocid{o} por su gremio|be recognised by their peers", "proteger a su hermano menor|protect their younger brother", "escapar de su ciudad|escape their town", "descubrir quién mató a su padre|find out who killed their father", "ganar la competición|win the competition", "casarse por amor y no por deber|marry for love, not duty", "encontrar un hogar|find a home", "vengarse|take revenge", "salvar el negocio familiar|save the family business", "demostrar su inocencia|prove their innocence", "romper una maldición|break a curse", "llegar a la ciudad prohibida|reach the forbidden city", "que su hija vuelva a hablarle|have their daughter speak to them again", "publicar su libro|publish their book", "ser libre|be free"];
export const MIEDOS = ["a la soledad|of loneliness", "al agua profunda|of deep water", "a volverse como su padre|of becoming like their father", "a ser olvidada|of being forgotten", "a la oscuridad|of the dark", "a fallar a quien confía en {ella}|of failing those who trust them", "al fuego|of fire", "a perder la memoria|of losing their memory", "a enamorarse|of falling in love", "a la multitud|of crowds", "a que descubran su origen|of their origins being found out", "a la muerte lenta|of a slow death"];
export const SECRETOS = ["no sabe leer|can't read", "es hij{o} de quien persigue|is the child of the person they hunt", "estuvo en la escena del crimen|was at the crime scene", "tiene otra familia en otra ciudad|has another family in another city", "firmó un pacto que vence pronto|signed a pact that expires soon", "es menos valiente de lo que aparenta|is less brave than they seem", "escribe cartas que nunca envía|writes letters they never send", "robó el dinero con el que empezó todo|stole the money that started it all", "está enferm{o} y no se lo ha dicho a nadie|is ill and hasn't told anyone", "fue espía del bando contrario|was a spy for the other side", "no es quien dice ser|is not who they claim to be", "aún ama a su peor enemigo|still loves their worst enemy"];
export const MANIAS = ["cuenta los escalones en voz baja|counts steps under their breath", "colecciona llaves que no abren nada|collects keys that open nothing", "silba cuando miente|whistles when lying", "nunca se sienta de espaldas a la puerta|never sits with their back to the door", "habla con los animales como con personas|talks to animals like people", "lleva siempre un libro que no lee|always carries a book they never read", "se ríe en los momentos más tensos|laughs at the tensest moments", "ordena los objetos por colores|sorts things by colour", "cita refranes que se inventa|quotes proverbs they make up", "se muerde el labio antes de decidir|bites their lip before deciding", "duerme con la luz encendida|sleeps with the light on", "corrige la gramática ajena|corrects other people's grammar", "regala flores robadas|gives away stolen flowers", "tararea canciones de cuna|hums lullabies"];
export const VOCES = ["frases cortas y secas|short, dry sentences", "habla mucho cuando está nervios{o}|talks a lot when nervous", "usa palabras antiguas|uses old-fashioned words", "responde con preguntas|answers with questions", "tono suave que obliga a escuchar|a soft voice that makes you lean in", "humor negro|dark humour", "muy formal, incluso con amigos|very formal, even with friends", "mezcla dos idiomas|switches between two languages", "dice siempre la verdad, sin filtro|always says the truth, unfiltered", "promete demasiado|promises too much"];
export const RASGOS_FISICOS = ["una cicatriz en la ceja|a scar through one eyebrow", "manos manchadas de tinta|ink-stained hands", "ojos de distinto color|eyes of different colours", "anda con un leve cojeo|walks with a slight limp", "voz grave y ronca|a deep, hoarse voice", "pelo blanco prematuro|prematurely white hair", "un tatuaje que esconde|a tattoo they hide", "ropa remendada con cuidado|carefully mended clothes", "un diente de oro|a gold tooth", "pecas por todas partes|freckles everywhere", "siempre lleva guantes|always wears gloves", "una sonrisa que no llega a los ojos|a smile that never reaches the eyes"];

// Lo propio de cada papel: {A} es el protagonista (o la primera ficha de personaje), si lo hay.
export const PAPEL: Record<Rol, string[]> = {
  protagonista: ["Lo que quiere le obliga a enfrentarse a su mentira.|What they want forces them to face their lie."],
  antagonista: ["Cree tener razón: quiere lo mismo que {A}, pero está dispuest{o} a todo.|Believes they're right: wants the same as {A}, but will do anything.", "Es el espejo oscuro de {A}: misma herida, otra respuesta.|The dark mirror of {A}: same wound, different answer.", "Tuvo razón una vez y nadie le escuchó.|Was right once and nobody listened."],
  mentor: ["Carga con un error del pasado que no quiere que {A} repita.|Carries a past mistake they don't want {A} to repeat.", "Enseña lo que nunca supo aplicar a su propia vida.|Teaches what they never managed to apply to their own life."],
  aliado: ["Ayuda a {A} por una deuda que nadie conoce.|Helps {A} because of a debt nobody knows about.", "Su lealtad se pondrá a prueba en el peor momento.|Their loyalty will be tested at the worst moment."],
  amor: ["Representa justo aquello que {A} cree no merecer.|Embodies exactly what {A} believes they don't deserve.", "Quiere a {A}, pero su propio deseo los separa.|Loves {A}, but their own desire pulls them apart."],
  rival: ["Compite con {A} por lo mismo, y a veces lo merece más.|Competes with {A} for the same thing, and sometimes deserves it more."],
  embaucador: ["Dice verdades incómodas en forma de broma.|Tells uncomfortable truths as jokes.", "Cambia de bando según le conviene… hasta que no.|Switches sides when it suits them… until it doesn't."],
  guardian: ["Pone a prueba a {A} antes de dejarle pasar.|Tests {A} before letting them through."],
  secundario: ["Tiene su propia historia; solo se cruza con la de {A} en un punto clave.|Has their own story; it crosses {A}'s at one key point."],
};
export const VINCULO: Record<Rol, string> = { protagonista: "conoce a|knows", antagonista: "enemigo de|enemy of", mentor: "mentor de|mentor of", aliado: "aliado de|ally of", amor: "enamorad{o} de|in love with", rival: "rival de|rival of", embaucador: "engaña a|deceives", guardian: "pone a prueba a|tests", secundario: "conoce a|knows" };

export const LUGARES: Record<Mundo, string[]> = {
  antiguo: ["posada|inn", "monasterio|monastery", "puerto|harbour", "mercado|market", "castillo en ruinas|ruined castle", "aldea|village", "molino|mill", "biblioteca|library", "cripta|crypt", "puente|bridge"],
  s19: ["estación de tren|railway station", "casa de huéspedes|boarding house", "fábrica textil|textile mill", "teatro de variedades|music hall", "faro|lighthouse", "hacienda|hacienda", "sanatorio|sanatorium", "redacción de un periódico|newspaper office", "café|café", "cementerio|cemetery"],
  actual: ["gasolinera|petrol station", "hospital|hospital", "piso compartido|shared flat", "instituto|high school", "bar de barrio|neighbourhood bar", "azotea|rooftop", "lavandería nocturna|late-night laundrette", "aeropuerto|airport", "pueblo vaciado|depopulated village", "centro comercial cerrado|abandoned mall"],
  fantasia: ["torre del hechicero|wizard's tower", "bosque que cambia de lugar|wandering forest", "ciudad bajo el lago|city beneath the lake", "mercado de recuerdos|market of memories", "templo de un dios olvidado|temple of a forgotten god", "fortaleza en las nubes|fortress in the clouds", "taberna en la frontera|border tavern", "biblioteca prohibida|forbidden library", "cementerio de dragones|dragon graveyard", "puerto de barcos voladores|port of flying ships"],
  futuro: ["estación orbital|orbital station", "colonia bajo cúpula|domed colony", "nave generacional|generation ship", "ciudad vertical|vertical city", "vertedero de datos|data dump", "laboratorio abandonado|abandoned lab", "mercado negro de implantes|implant black market", "luna minera|mining moon", "archivo de la Tierra|Earth archive", "jardín hidropónico|hydroponic garden"],
};
export const ATMOSFERAS = ["siempre en penumbra|always in half-light", "donde nadie habla en voz alta|where nobody speaks above a whisper", "invadido por la humedad|taken over by damp", "lleno de gente que no se mira|full of people who never look at each other", "que huele a pan y a lluvia|that smells of bread and rain", "en ruinas pero habitado|ruined but lived in", "demasiado limpio para ser normal|too clean to be normal", "donde el tiempo parece detenido|where time seems to stand still", "ruidosa de día y muerta de noche|loud by day and dead by night", "decorado con objetos de difuntos|decorated with the belongings of the dead"];
export const SENTIDOS = ["se oye un reloj que nadie da cuerda|a clock no one winds can be heard ticking", "huele a cera y a hierro|it smells of wax and iron", "el suelo cruje en un punto concreto|the floor creaks in one particular spot", "la luz entra de lado a media tarde|the light comes in sideways in the afternoon", "hace frío aunque haya fuego|it's cold even with the fire lit", "se escucha el mar aunque está lejos|you can hear the sea even though it's far away", "todo está cubierto de polvo menos una silla|everything is dusty except one chair", "las paredes tienen nombres grabados|names are carved into the walls"];
export const SECRETOS_LUGAR = ["esconde un pasadizo|hides a secret passage", "fue escenario de una masacre olvidada|was the scene of a forgotten massacre", "pertenece en secreto a {A}|secretly belongs to {A}", "allí se firmó un pacto que sigue vigente|a pact still in force was signed there", "nadie que haya dormido allí recuerda sus sueños|no one who sleeps there remembers their dreams", "es el único sitio donde {A} se siente a salvo|is the only place where {A} feels safe"];

export const OBJETOS = ["llave|key", "reloj de bolsillo|pocket watch", "carta sin abrir|unopened letter", "anillo|ring", "mapa incompleto|incomplete map", "cuaderno|notebook", "espejo de mano|hand mirror", "cuchillo|knife", "fotografía rota|torn photograph", "caja de música|music box", "medalla|medal", "frasco con algo dentro|jar with something inside", "brújula que no apunta al norte|compass that doesn't point north", "libro con páginas arrancadas|book with torn-out pages", "colgante|pendant", "cinta de casete|cassette tape"];
export const MATERIALES = ["de plata ennegrecida|of tarnished silver", "de hueso tallado|of carved bone", "de cobre verdoso|of greenish copper", "de cristal tallado|of cut glass", "de madera de naufragio|of shipwreck wood", "de oro falso|of fake gold", "forrado de cuero gastado|bound in worn leather", "de un metal que nadie reconoce|of a metal nobody recognises"];
export const HISTORIAS_OBJETO = ["perteneció a la madre de {A}|belonged to {A}'s mother", "lo encontraron junto a un cadáver|was found beside a body", "es la prueba que lo cambia todo|is the evidence that changes everything", "pasa de mano en mano y trae desgracia|passes from hand to hand and brings misfortune", "fue un regalo con una condición|was a gift with a condition", "abre algo que nadie ha visto|opens something no one has seen", "guarda una confesión|holds a confession", "{A} lo robó y nadie lo sabe|{A} stole it and no one knows"];

export const CONFLICTOS = [
  "{A} descubre que {B} le ha mentido sobre algo pequeño… y eso lo cambia todo.|{A} finds out {B} lied about something small… and it changes everything.",
  "Alguien que {A} creía muerto llama a la puerta.|Someone {A} thought was dead knocks at the door.",
  "{A} tiene que elegir entre salvar a {B} o cumplir su objetivo.|{A} must choose between saving {B} and reaching their goal.",
  "Se rompe algo que no tiene arreglo.|Something breaks that can't be fixed.",
  "Llega una noticia que obliga a {A} a irse hoy mismo.|News arrives that forces {A} to leave today.",
  "{B} pide a {A} un favor imposible de negar.|{B} asks {A} for a favour that can't be refused.",
  "Una tormenta (real o figurada) deja a {A} y {B} encerrados juntos.|A storm (literal or not) traps {A} and {B} together.",
  "El plan sale bien… y eso es lo peor que podía pasar.|The plan works… and that's the worst thing that could happen.",
  "{A} gana, pero pierde lo que de verdad quería.|{A} wins, but loses what they really wanted.",
  "Un desconocido sabe el secreto de {A}.|A stranger knows {A}'s secret.",
  "{A} tiene que mentir para proteger a {B}.|{A} has to lie to protect {B}.",
  "Se acaba el tiempo: queda una hora.|Time is running out: one hour left.",
  "Las reglas del mundo cambian de repente.|The rules of the world suddenly change.",
  "{B} hace justo lo que {A} más teme.|{B} does exactly what {A} fears most.",
  "Aparece la prueba que lo explica todo, en las manos equivocadas.|The evidence that explains everything turns up in the wrong hands.",
];
export const GIROS = [
  "El aliado más fiel era quien movía los hilos.|The most loyal ally was pulling the strings all along.",
  "Lo que buscaban nunca existió: era una excusa.|What they were looking for never existed: it was an excuse.",
  "El narrador no ha contado toda la verdad.|The narrator hasn't told the whole truth.",
  "El villano tenía razón en lo esencial.|The villain was right about what matters.",
  "Dos personajes son la misma persona.|Two characters are the same person.",
  "El pasado que creían conocer está falsificado.|The past they thought they knew was forged.",
  "La víctima lo planeó todo.|The victim planned it all.",
  "El mentor muere y deja una última mentira.|The mentor dies and leaves one final lie.",
  "La amenaza venía de dentro de la casa.|The threat was coming from inside the house.",
  "Lo que parecía un final es el comienzo de otra historia.|What looked like an ending is the start of another story.",
  "El objeto que todos persiguen no hace lo que creen.|The object everyone is chasing doesn't do what they think.",
  "La protagonista ya había estado aquí antes y lo olvidó.|The protagonist had been here before and forgot.",
];
export const CHISPAS = [
  "¿Y si {A} despertara un día con el recuerdo de otra persona?|What if {A} woke up with someone else's memory?",
  "¿Y si {B} supiera desde el principio cómo acaba todo?|What if {B} knew from the start how it all ends?",
  "¿Y si la historia la contara {B}?|What if {B} told the story?",
  "¿Y si {A} tuviera que pedir ayuda a quien más odia?|What if {A} had to ask for help from the person they hate most?",
  "¿Y si el lugar más seguro dejara de serlo?|What if the safest place stopped being safe?",
  "¿Y si {A} perdiera lo único que le da ventaja?|What if {A} lost the one thing that gives them an edge?",
  "¿Y si un niño viera lo que nadie quiere ver?|What if a child saw what nobody wants to see?",
  "¿Y si {A} y {B} intercambiaran sus vidas un día?|What if {A} and {B} swapped lives for a day?",
  "¿Y si la mentira de {A} fuera verdad?|What if {A}'s lie were true?",
  "¿Y si todo pasara en una sola noche?|What if it all happened in a single night?",
  "¿Y si la próxima escena empezara por el final?|What if the next scene started at the end?",
  "¿Y si alguien leyera en voz alta la carta equivocada?|What if someone read the wrong letter out loud?",
];
export const EJERCICIOS = [
  "Escribe 5 minutos sin parar y sin corregir: «Lo que {A} nunca ha contado es…».|Write for 5 minutes without stopping or correcting: “What {A} has never told anyone is…”.",
  "Describe el lugar de la escena solo con olores y sonidos.|Describe the scene's setting using only smells and sounds.",
  "Escribe la peor versión posible de la escena. Luego quédate con una frase.|Write the worst possible version of the scene. Then keep one sentence.",
  "Escribe el diálogo sin acotaciones: solo lo que dicen.|Write the dialogue with no tags: only what they say.",
  "Cuenta la escena desde el punto de vista de un objeto de la habitación.|Tell the scene from the point of view of an object in the room.",
  "Salta a la escena que más ganas tienes de escribir, aunque vaya al final.|Jump to the scene you most want to write, even if it comes at the end.",
  "Haz una lista de 10 cosas que podrían salir mal ahora. Usa la séptima.|List 10 things that could go wrong now. Use the seventh.",
  "Escribe una carta de {A} a {B} que nunca enviará.|Write a letter from {A} to {B} that will never be sent.",
  "Empieza la escena en mitad de una discusión.|Start the scene in the middle of an argument.",
  "Cambia el tiempo verbal o la persona durante un párrafo, solo para probar.|Switch tense or person for one paragraph, just to try it.",
  "Escribe lo que {A} piensa pero no dice durante la última conversación.|Write what {A} thinks but doesn't say during the last conversation.",
  "Pon un temporizador de 10 minutos y escribe solo acciones: nada de pensamientos.|Set a 10-minute timer and write only actions: no thoughts.",
];
export const TITULOS_A = ["La sombra|The shadow", "El silencio|The silence", "La casa|The house", "El último verano|The last summer", "La memoria|The memory", "El jardín|The garden", "La ciudad|The city", "El mapa|The map", "La hija|The daughter", "El invierno|The winter", "La herida|The wound", "El eco|The echo"];
export const TITULOS_B = ["de los que se fueron|of those who left", "sin nombre|without a name", "bajo el agua|beneath the water", "de cristal|of glass", "que nadie quiso|nobody wanted", "de las luciérnagas|of the fireflies", "al otro lado|on the other side", "de {A}|of {A}", "en llamas|in flames", "de las cosas pequeñas|of small things", "que nos debemos|we owe each other", "del faro|of the lighthouse"];
