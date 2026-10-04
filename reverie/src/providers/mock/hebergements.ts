// Hébergements simulés : un ou plusieurs logements par type disponible dans la destination.
// Montant = séjour complet pour tout le groupe.

import { HEBERGEMENTS } from "@/lib/options";
import type { LodgingOffer, LodgingProvider } from "../types";
import { entre, hasard, nbPersonnes } from "../outils";
import { coefSaison, destinationProche, OPTIONS_PAR_DEFAUT, patienter, prix, type OptionsSimulation } from "./commun";

interface Tarif {
  /** Prix par nuit (moyenne française) pour une unité. */
  base: number;
  /** Ce qu'on loue : une place par personne, une chambre, ou un logement entier. */
  unite: "personne" | "chambre" | "logement";
  /** Personnes par unité. */
  capacite: number;
  note: [number, number];
}

export const TARIFS: Record<string, Tarif> = {
  auberge_jeunesse: { base: 32, unite: "personne", capacite: 1, note: [7, 8.6] },
  camping: { base: 32, unite: "logement", capacite: 4, note: [7, 8.8] },
  refuge: { base: 38, unite: "personne", capacite: 1, note: [7.5, 9] },
  chez_habitant: { base: 45, unite: "chambre", capacite: 2, note: [8, 9.4] },
  tipi: { base: 70, unite: "logement", capacite: 4, note: [7.8, 9.2] },
  chambre_hotes: { base: 85, unite: "chambre", capacite: 2, note: [8.3, 9.6] },
  roulotte: { base: 90, unite: "logement", capacite: 4, note: [8, 9.4] },
  gite: { base: 95, unite: "logement", capacite: 6, note: [8, 9.3] },
  yourte: { base: 95, unite: "logement", capacite: 4, note: [8, 9.4] },
  location: { base: 115, unite: "logement", capacite: 5, note: [7.8, 9.3] },
  cabane: { base: 120, unite: "logement", capacite: 4, note: [8.4, 9.6] },
  glamping: { base: 130, unite: "logement", capacite: 4, note: [8.2, 9.5] },
  peniche: { base: 160, unite: "logement", capacite: 6, note: [8.2, 9.4] },
  cabane_perchee: { base: 170, unite: "logement", capacite: 3, note: [8.6, 9.8] },
  bulle: { base: 190, unite: "logement", capacite: 2, note: [8.3, 9.6] },
  resort: { base: 230, unite: "chambre", capacite: 3, note: [8.2, 9.4] },
};

/** Prix d'une chambre d'hôtel double selon les étoiles. */
const HOTEL_PAR_ETOILE = [0, 60, 80, 115, 175, 330];

/** Probabilité qu'un équipement soit présent, selon le type de logement. */
function probabiliteEquipement(type: string, equipement: string, etoiles = 0): number {
  const entier = ["gite", "location", "peniche"].includes(type);
  switch (equipement) {
    case "wifi":
      return ["refuge", "tipi", "yourte", "bulle"].includes(type) ? 0.2 : 0.95;
    case "cuisine":
      return entier || ["camping", "auberge_jeunesse", "roulotte"].includes(type) ? 0.9 : 0.1;
    case "piscine":
      return type === "resort" ? 0.95 : etoiles >= 4 ? 0.6 : ["gite", "location", "camping", "glamping"].includes(type) ? 0.3 : 0.05;
    case "parking":
      return ["auberge_jeunesse"].includes(type) ? 0.3 : 0.8;
    case "animaux":
      return ["resort", "bulle", "auberge_jeunesse"].includes(type) ? 0.1 : 0.55;
    case "pmr":
      return type === "hotel" || type === "resort" ? 0.75 : ["cabane_perchee", "refuge", "peniche", "tipi"].includes(type) ? 0 : 0.25;
    case "vue_mer":
      return 0.2;
    case "climatisation":
      return type === "hotel" || type === "resort" ? 0.85 : 0.3;
    case "lit_bebe":
      return ["hotel", "resort", "gite", "location", "chambre_hotes"].includes(type) ? 0.8 : 0.15;
    default:
      return 0.3;
  }
}

const EQUIPEMENTS = ["piscine", "cuisine", "parking", "wifi", "animaux", "pmr", "vue_mer", "climatisation", "lit_bebe"];
const NOMS_TYPES = Object.fromEntries(HEBERGEMENTS.map((h) => [h.id, h.nom]));
const QUALIFICATIFS = ["des Pins", "du Vieux Moulin", "Belle Vue", "des Sources", "du Lac", "de la Colline", "Les Hirondelles", "du Phare"];

export function creerHebergementsSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): LodgingProvider {
  const nom = "Simulation Rêverie — hébergements";
  return {
    nom,
    async search(q) {
      await patienter(opts, `heb${q.lieu.nom}${q.arrivee}`);
      const dest = destinationProche(q.lieu);
      const disponibles = dest?.hebergements ?? ["hotel", "location", "chambre_hotes"];
      const indice = (dest?.indicePrix ?? 1) * coefSaison(dest, q.arrivee);
      const personnes = nbPersonnes(q.passagers);
      const offres: LodgingOffer[] = [];

      for (const type of q.types.filter((t) => disponibles.includes(t))) {
        const variantes: { etoiles?: number; base: number; unite: Tarif["unite"]; capacite: number; note: [number, number] }[] = [];
        if (type === "hotel") {
          for (let e = q.etoilesMin ?? 2; e <= (q.etoilesMax ?? 5); e++) {
            if (e >= 1 && e <= 5) variantes.push({ etoiles: e, base: HOTEL_PAR_ETOILE[e], unite: "chambre", capacite: 2, note: [6.8 + e * 0.4, 7.6 + e * 0.4] });
          }
        } else {
          const t = TARIFS[type];
          if (t) variantes.push(t);
        }

        for (const v of variantes) {
          const g = `${q.lieu.nom}${type}${v.etoiles ?? ""}`;
          const unites = v.unite === "personne" ? personnes : Math.ceil(personnes / v.capacite);
          const parNuit = v.base * unites * indice * entre(`${g}p`, 0.85, 1.2);
          const equipements = EQUIPEMENTS.filter((e) => hasard(`${g}${e}`) < probabiliteEquipement(type, e, v.etoiles));
          const qualif = QUALIFICATIFS[Math.floor(hasard(`${g}n`) * QUALIFICATIFS.length)];
          offres.push({
            id: `${type}${v.etoiles ?? ""}-${q.lieu.nom}`,
            nom: `${NOMS_TYPES[type] ?? type} ${qualif}`,
            type,
            etoiles: v.etoiles,
            unites,
            equipements,
            note: Math.round(entre(`${g}note`, v.note[0], v.note[1]) * 10) / 10,
            prix: prix(parNuit * q.nuits, nom, opts),
          });
        }
      }
      return offres;
    },
  };
}
