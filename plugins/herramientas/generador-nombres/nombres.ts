// Puro: nombres inventados por cultura (nombre + apellido).
export const CULTURAS: Record<string, { nombres: string[]; apellidos: string[] }> = {
  Hispana: { nombres: ["Elena", "Mateo", "Lucía", "Diego", "Inés", "Rafael", "Carmen", "Andrés", "Pilar", "Joaquín", "Marta", "Tomás"], apellidos: ["Marín", "Salazar", "Ortega", "Villalobos", "Quintero", "Montoya", "Reyes", "Cabrera", "Ibarra"] },
  Anglosajona: { nombres: ["Edmund", "Alice", "Oliver", "Margaret", "Henry", "Eleanor", "Arthur", "Vivian", "Walter", "Harriet"], apellidos: ["Blackwood", "Hartley", "Whitmore", "Ashford", "Pembroke", "Thorne", "Calloway", "Fairfax"] },
  Nórdica: { nombres: ["Bjorn", "Astrid", "Leif", "Sigrid", "Ragnar", "Freya", "Eirik", "Ingrid", "Halvard", "Solveig"], apellidos: ["Ironside", "Haraldsson", "Stormborn", "Eriksdottir", "Skullsplitter", "Thorsen", "Ravenhair"] },
  Japonesa: { nombres: ["Haruto", "Sakura", "Ren", "Yuki", "Kaito", "Akari", "Daichi", "Mei", "Takeshi", "Hana"], apellidos: ["Takahashi", "Nakamura", "Kobayashi", "Fujiwara", "Hayashi", "Matsuda", "Mori"] },
  Árabe: { nombres: ["Layla", "Omar", "Zahra", "Khalid", "Samira", "Tariq", "Nadia", "Yusuf", "Amira", "Idris"], apellidos: ["al-Rashid", "ibn Salim", "al-Farsi", "Haddad", "al-Mansur", "Khoury", "ibn Yahya"] },
  Élfica: { nombres: ["Aelindra", "Thalion", "Sylvara", "Erevan", "Lúthien", "Faelar", "Iriel", "Caladrel", "Nimrodel", "Galadwen"], apellidos: ["Luzdeluna", "Hojaplata", "Brisaestelar", "Cantoalba", "Sombraverde", "Rocíodorado"] },
  Romana: { nombres: ["Marcus", "Livia", "Gaius", "Julia", "Lucius", "Cornelia", "Titus", "Aurelia", "Quintus", "Octavia"], apellidos: ["Aurelius", "Valerius", "Claudius", "Flavius", "Cassius", "Severus", "Maximus"] },
  Eslava: { nombres: ["Dmitri", "Anya", "Vladimir", "Katya", "Boris", "Irina", "Nikolai", "Tatiana", "Alexei", "Olga"], apellidos: ["Volkov", "Petrova", "Sokolov", "Morozova", "Kuznetsov", "Orlov", "Romanova"] },
};

export function generar(cultura: string, n: number, rnd: () => number = Math.random): string[] {
  const c = CULTURAS[cultura];
  if (!c) return [];
  const pick = (a: string[]) => a[Math.floor(rnd() * a.length)];
  const out = new Set<string>();
  for (let i = 0; out.size < n && i < n * 20; i++) out.add(`${pick(c.nombres)} ${pick(c.apellidos)}`);
  return [...out];
}
