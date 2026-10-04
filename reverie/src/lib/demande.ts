// Validation stricte de la demande (type `Demande` du cahier des charges §6).
// Le même code tourne dans le navigateur (pour prévenir tout de suite) et sur le serveur
// (qui a toujours le dernier mot). Tout ce qui n'est pas prévu ici est refusé.

import { z } from "zod";
import { IDS_ENVIES } from "./envies";
import { AVATARS, DEPASSEMENTS, FLEX_JOURS, IDS } from "./options";

z.config(z.locales.fr());

export const LONGUEUR_MAX_TEXTE = 220;
export const MAX_PROFILS = 6;
export const AGE_MAX_ENFANT = 17;
/** Jusqu'où dans le futur on accepte un départ. */
export const HORIZON_JOURS = 365;

// Texte libre : une simple donnée. On remplace les caractères de contrôle et on borne la longueur.
const nettoyer = (t: string) =>
  [...t].map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? " " : c)).join("").trim();

const texteLibre = z.string().max(LONGUEUR_MAX_TEXTE).transform(nettoyer).optional();

const listeSansDoublon = <T extends z.ZodType>(element: T, min = 0, messageMin?: string) =>
  z
    .array(element)
    .min(min, messageMin)
    .refine((l) => new Set(l).size === l.length, "Une même valeur est présente deux fois.");

const dateIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ.")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "Date inexistante.");

const moisIso = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois attendu au format AAAA-MM.");

const envieId = z.enum(IDS_ENVIES as [string, ...string[]]);

export const schemaVoyageur = z.strictObject({
  prenom: z.string().trim().min(1, "Indiquez un prénom.").max(40),
  avatar: z.enum(AVATARS).optional(),
  envies: z.partialRecord(envieId, z.enum(["aime", "naime_pas"])),
  reve: texteLibre,
  refusLibre: texteLibre,
});

const schemaBase = z.strictObject({
  voyageurs: z.array(schemaVoyageur).min(1).max(MAX_PROFILS),
  adultes: z.number().int().min(1).max(12),
  enfants: z.number().int().min(0).max(10),
  agesEnfants: z.array(z.number().int().min(0).max(AGE_MAX_ENFANT)).max(10),
  groupe: z.strictObject({
    animal: z.boolean(),
    accessibilite: listeSansDoublon(z.enum(IDS.accessibilite)),
    regime: listeSansDoublon(z.enum(IDS.regimes)),
    langues: listeSansDoublon(z.enum(IDS.langues)),
  }),
  type: z.enum(["sejour", "roadtrip", "velo", "iles"]),
  depart: z.strictObject({
    lieu: z.string().transform(nettoyer).pipe(z.string().min(2, "Indiquez votre ville de départ.").max(120)),
    rayonKm: z.number().int().min(0).max(200),
  }),
  dates: z.strictObject({
    mode: z.enum(["fixes", "flexibles", "mois", "auMieux"]),
    aller: dateIso.optional(),
    retour: dateIso.optional(),
    flexJours: z.union(FLEX_JOURS.map((n) => z.literal(n))).optional(),
    mois: listeSansDoublon(moisIso).max(12).optional(),
    nuitsMin: z.number().int().min(1).max(30),
    nuitsMax: z.number().int().min(1).max(30),
  }),
  budget: z.strictObject({
    montant: z.number().int().min(50, "Le budget doit être d'au moins 50 €.").max(100_000, "Le budget ne peut pas dépasser 100 000 €."),
    par: z.enum(["groupe", "personne"]),
    depassement: z.union(DEPASSEMENTS.map((n) => z.literal(n))),
    inclut: listeSansDoublon(z.enum(IDS.postes), 1, "Cochez au moins une chose que couvre le budget."),
  }),
  transports: z.strictObject({
    modes: listeSansDoublon(z.enum(IDS.transports), 1, "Cochez au moins un moyen de transport."),
    dureeMaxH: z.number().int().min(1).max(48).optional(),
    correspondancesMax: z.number().int().min(0).max(5).optional(),
    nuit: z.boolean(),
    basCarbone: z.boolean(),
  }),
  hebergements: z.strictObject({
    types: listeSansDoublon(z.enum(IDS.hebergements), 1, "Cochez au moins un type d'hébergement."),
    etoilesMin: z.number().int().min(1).max(5).optional(),
    etoilesMax: z.number().int().min(1).max(5).optional(),
    equipements: listeSansDoublon(z.enum(IDS.equipements)),
  }),
  rythme: z.enum(["tranquille", "equilibre", "intense"]),
});

export type Demande = z.output<typeof schemaBase>;
export type Voyageur = z.output<typeof schemaVoyageur>;

const JOUR_MS = 86_400_000;
const versDate = (s: string) => new Date(`${s}T00:00:00Z`);
export const nuitsEntre = (aller: string, retour: string) =>
  Math.round((versDate(retour).getTime() - versDate(aller).getTime()) / JOUR_MS);
const jourIso = (d: Date) => d.toISOString().slice(0, 10);

/** Les 12 mois à venir, mois en cours compris, au format AAAA-MM. */
export function moisDisponibles(maintenant = new Date()): string[] {
  const res: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + i, 1));
    res.push(d.toISOString().slice(0, 7));
  }
  return res;
}

/** Contrôles qui croisent plusieurs champs (et dépendent de la date du jour). */
function controlesCroises(d: Demande, ctx: z.RefinementCtx, maintenant: Date) {
  const erreur = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  if (d.voyageurs.length > Math.min(MAX_PROFILS, d.adultes + d.enfants)) {
    erreur(["voyageurs"], "Il y a plus de profils que de voyageurs.");
  }
  if (d.agesEnfants.length !== d.enfants) {
    erreur(["agesEnfants"], "Indiquez l'âge de chaque enfant.");
  }

  const { dates } = d;
  if (dates.nuitsMin > dates.nuitsMax) {
    erreur(["dates", "nuitsMax"], "Le nombre de nuits maximum doit être supérieur ou égal au minimum.");
  }

  // Une demi-journée de tolérance couvre les fuseaux horaires (un visiteur en avance sur l'heure UTC).
  const hier = jourIso(new Date(maintenant.getTime() - JOUR_MS));
  const horizon = jourIso(new Date(maintenant.getTime() + HORIZON_JOURS * JOUR_MS));

  if (dates.mode === "fixes" || dates.mode === "flexibles") {
    if (!dates.aller) erreur(["dates", "aller"], "Indiquez la date d'aller.");
    if (!dates.retour) erreur(["dates", "retour"], "Indiquez la date de retour.");
    if (dates.aller && dates.retour) {
      const n = nuitsEntre(dates.aller, dates.retour);
      if (dates.aller < hier) erreur(["dates", "aller"], "La date d'aller est déjà passée.");
      if (dates.aller > horizon) erreur(["dates", "aller"], "Le départ doit avoir lieu dans les 12 prochains mois.");
      if (n < 1) erreur(["dates", "retour"], "Le retour doit être après l'aller.");
      else if (n > 30) erreur(["dates", "retour"], "Le voyage ne peut pas dépasser 30 nuits.");
      else if (dates.nuitsMin !== n || dates.nuitsMax !== n) {
        erreur(["dates", "nuitsMin"], "Le nombre de nuits ne correspond pas aux dates.");
      }
    }
    if (dates.mode === "flexibles" && dates.flexJours === undefined) {
      erreur(["dates", "flexJours"], "Indiquez de combien de jours les dates peuvent bouger.");
    }
  }
  if (dates.mode === "mois") {
    const possibles = new Set(moisDisponibles(maintenant));
    if (!dates.mois?.length) erreur(["dates", "mois"], "Choisissez au moins un mois.");
    else if (dates.mois.some((m) => !possibles.has(m))) {
      erreur(["dates", "mois"], "Choisissez des mois parmi les 12 prochains.");
    }
  }
  if (dates.mode !== "fixes" && dates.mode !== "flexibles") {
    if (dates.aller || dates.retour) erreur(["dates"], "Pas de dates d'aller ou de retour dans ce mode.");
  }

  const { hebergements: h } = d;
  if (h.etoilesMin !== undefined && h.etoilesMax !== undefined && h.etoilesMin > h.etoilesMax) {
    erreur(["hebergements", "etoilesMax"], "Le nombre d'étoiles maximum doit être supérieur ou égal au minimum.");
  }
}

export function creerSchemaDemande(maintenant = new Date()) {
  return schemaBase.superRefine((d, ctx) => controlesCroises(d, ctx, maintenant));
}

// Noms lisibles des champs, pour des messages d'erreur compréhensibles.
const LIBELLES: Record<string, string> = {
  voyageurs: "Profils",
  prenom: "prénom",
  avatar: "avatar",
  envies: "envies",
  reve: "« Mon rêve »",
  refusLibre: "« Ce que je ne veux surtout pas »",
  adultes: "Adultes",
  enfants: "Enfants",
  agesEnfants: "Âges des enfants",
  groupe: "Groupe",
  type: "Type de voyage",
  depart: "Départ",
  lieu: "ville de départ",
  rayonKm: "rayon",
  dates: "Dates",
  aller: "aller",
  retour: "retour",
  flexJours: "flexibilité",
  mois: "mois",
  nuitsMin: "nuits",
  nuitsMax: "nuits maximum",
  budget: "Budget",
  montant: "montant",
  inclut: "ce que couvre le budget",
  transports: "Transports",
  modes: "modes acceptés",
  hebergements: "Hébergements",
  types: "types acceptés",
  etoilesMax: "étoiles",
  rythme: "Rythme",
};

export function libelleChemin(chemin: PropertyKey[]): string {
  const morceaux: string[] = [];
  for (let i = 0; i < chemin.length; i++) {
    const c = chemin[i];
    if (c === "voyageurs" && typeof chemin[i + 1] === "number") {
      morceaux.push(`Voyageur ${(chemin[i + 1] as number) + 1}`);
      i++;
    } else if (typeof c === "number") {
      morceaux.push(`n° ${c + 1}`);
    } else {
      morceaux.push(LIBELLES[String(c)] ?? String(c));
    }
  }
  return morceaux.join(" · ") || "Demande";
}

export interface ErreurChamp {
  chemin: string;
  message: string;
}

export type ResultatVerification =
  | { ok: true; demande: Demande }
  | { ok: false; erreurs: string[]; champs: ErreurChamp[] };

export function verifierDemande(brut: unknown, maintenant = new Date()): ResultatVerification {
  const r = creerSchemaDemande(maintenant).safeParse(brut);
  if (r.success) return { ok: true, demande: r.data };
  const champs = r.error.issues.map((i) => ({ chemin: i.path.map(String).join("."), message: i.message }));
  return {
    ok: false,
    erreurs: r.error.issues.map((i) => `${libelleChemin(i.path)} : ${i.message}`),
    champs,
  };
}
