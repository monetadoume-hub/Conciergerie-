// Outils communs aux adaptateurs : délai maximum, nouvelles tentatives, cache, plafond de coût,
// journal, et un générateur pseudo-aléatoire reproductible pour les simulations.

// ——— Délai maximum ———

export class DelaiDepasse extends Error {
  constructor(nom: string, ms: number) {
    super(`${nom} n'a pas répondu en ${ms} ms`);
    this.name = "DelaiDepasse";
  }
}

export async function avecDelai<T>(promesse: Promise<T>, ms: number, nom: string): Promise<T> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new DelaiDepasse(nom, ms)), ms);
  });
  try {
    return await Promise.race([promesse, delai]);
  } finally {
    clearTimeout(minuteur);
  }
}

// ——— Nouvelles tentatives ———

/** Relance `fn` jusqu'à `tentatives` fois en tout. Un délai dépassé n'est pas relancé (inutile d'attendre deux fois). */
export async function avecReessais<T>(fn: () => Promise<T>, tentatives = 2): Promise<T> {
  let derniere: unknown;
  for (let i = 0; i < tentatives; i++) {
    try {
      return await fn();
    } catch (e) {
      derniere = e;
      if (e instanceof DelaiDepasse) break;
    }
  }
  throw derniere;
}

// ——— Cache en mémoire ———

export const DUREES_CACHE = {
  normales: 24 * 3600_000,
  previsions: 3 * 3600_000,
  prix: 30 * 60_000,
  lieux: 24 * 3600_000,
} as const;

export class CacheMemoire {
  private entrees = new Map<string, { expire: number; valeur: unknown }>();
  constructor(private maxEntrees = 5_000) {}

  async obtenir<T>(cle: string, dureeMs: number, calcul: () => Promise<T>, maintenant = Date.now()): Promise<T> {
    const e = this.entrees.get(cle);
    if (e && e.expire > maintenant) return e.valeur as T;
    const valeur = await calcul();
    if (this.entrees.size >= this.maxEntrees) this.entrees.clear(); // garde-fou mémoire
    this.entrees.set(cle, { expire: maintenant + dureeMs, valeur });
    return valeur;
  }

  vider() {
    this.entrees.clear();
  }
}

export const cacheGlobal = new CacheMemoire();

// ——— Plafond de coût par recherche ———

/** Coût maximum autorisé pour une recherche (appels payants), en euros. Configurable dans `.env`. */
export function plafondCoutParDefaut(): number {
  const v = Number(process.env.COUT_MAX_RECHERCHE_EUR);
  return Number.isFinite(v) && v >= 0 ? v : 0.1;
}

export class CompteurCout {
  depense = 0;
  refus: string[] = [];
  constructor(readonly plafond: number) {}

  /** Réserve le coût d'un appel ; renvoie false si le plafond serait dépassé. */
  reserver(nom: string, cout: number): boolean {
    if (this.depense + cout > this.plafond) {
      this.refus.push(nom);
      return false;
    }
    this.depense += cout;
    return true;
  }
}

// ——— Journal ———

export type NiveauJournal = "info" | "avertissement" | "erreur";

export function journal(niveau: NiveauJournal, message: string, details: Record<string, unknown> = {}) {
  if (process.env.REVERIE_JOURNAL === "silencieux") return;
  const ligne = JSON.stringify({ t: new Date().toISOString(), niveau, message, ...details });
  if (niveau === "erreur") console.error(ligne);
  else if (niveau === "avertissement") console.warn(ligne);
  else console.info(ligne);
}

// ——— Hasard reproductible (simulations) ———

/** Empreinte numérique stable d'un texte (FNV-1a). */
export function empreinte(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Nombre entre 0 et 1, toujours le même pour la même graine. */
export function hasard(graine: string): number {
  let t = empreinte(graine) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Valeur entre min et max, reproductible. */
export const entre = (graine: string, min: number, max: number) => min + hasard(graine) * (max - min);

// ——— Géographie ———

/** Distance à vol d'oiseau en km (formule de haversine). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Part du prix d'un adulte selon l'âge (tarifs habituels des transporteurs). */
export function coefTarifAge(age: number): number {
  if (age < 2) return 0.1;
  if (age < 12) return 0.7;
  return 1;
}

export const equivalentsAdultes = (p: { adultes: number; agesEnfants: number[] }) =>
  p.adultes + p.agesEnfants.reduce((t, a) => t + coefTarifAge(a), 0);

export const nbPersonnes = (p: { adultes: number; agesEnfants: number[] }) => p.adultes + p.agesEnfants.length;
