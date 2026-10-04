// Logique du formulaire côté navigateur : valeurs de départ, cohérence entre champs,
// et répartition des erreurs entre les trois écrans.

import { MAX_PROFILS, type Demande, type ErreurChamp, type Voyageur } from "./demande";
import { AVATARS } from "./options";

export const AGE_ENFANT_PAR_DEFAUT = 8;

export const nouveauVoyageur = (n: number): Voyageur => ({
  prenom: `Voyageur ${n}`,
  avatar: AVATARS[(n - 1) % AVATARS.length],
  envies: {},
});

export function demandeParDefaut(): Demande {
  return {
    voyageurs: [nouveauVoyageur(1)],
    adultes: 2,
    enfants: 0,
    agesEnfants: [],
    groupe: { animal: false, accessibilite: [], regime: [], langues: ["fr"] },
    type: "sejour",
    depart: { lieu: "", rayonKm: 50 },
    dates: { mode: "auMieux", nuitsMin: 5, nuitsMax: 7 },
    budget: { montant: 2000, par: "groupe", depassement: 0, inclut: ["transport", "hebergement", "activites"] },
    transports: { modes: ["avion", "train"], nuit: false, basCarbone: false },
    hebergements: { types: ["hotel", "location", "chambre_hotes", "gite"], equipements: [] },
    rythme: "equilibre",
  };
}

/** Change le nombre de voyageurs en gardant les âges et le nombre de profils cohérents. */
export function changerPersonnes(d: Demande, adultes: number, enfants: number): Demande {
  const agesEnfants = d.agesEnfants.slice(0, enfants);
  while (agesEnfants.length < enfants) agesEnfants.push(AGE_ENFANT_PAR_DEFAUT);
  const maxProfils = Math.min(MAX_PROFILS, adultes + enfants);
  return { ...d, adultes, enfants, agesEnfants, voyageurs: d.voyageurs.slice(0, maxProfils) };
}

export const ECRANS = ["groupe", "envies", "cadre"] as const;
export type Ecran = (typeof ECRANS)[number];

const CHAMPS_ENVIES = new Set(["envies", "reve", "refusLibre"]);

/** Écran du formulaire où se trouve le champ en erreur. */
export function ecranDuChamp(chemin: string): Ecran {
  const morceaux = chemin.split(".");
  if (morceaux[0] === "voyageurs") return morceaux.some((m) => CHAMPS_ENVIES.has(m)) ? "envies" : "groupe";
  if (["adultes", "enfants", "agesEnfants", "groupe"].includes(morceaux[0])) return "groupe";
  return "cadre";
}

export function erreursDeLEcran(champs: ErreurChamp[], ecran: Ecran, libelles: string[]): string[] {
  return libelles.filter((_, i) => ecranDuChamp(champs[i].chemin) === ecran);
}
