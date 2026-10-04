// Étape 3 du pipeline : destinations candidates.
// D'abord les contraintes dures (refus, type de voyage, accès), puis une pré-note rapide
// (sans appeler de fournisseur) pour ne garder que les plus prometteuses.

import { DESTINATIONS, type Destination } from "@/donnees/destinations";
import type { Demande } from "@/lib/demande";
import { NOMS_ENVIES } from "@/lib/envies";
import type { Criteres } from "./comprehension";
import { moisCandidats } from "./meteo";
import { envieServie } from "./score";
import { budgetTotal } from "./formules";
import { TYPES_INSOLITES } from "./hebergements";

export const NB_CANDIDATES_MAX = 8;

export interface Exclusion {
  destination: string;
  raison: string;
}

/** Envies servies par les activités et hébergements d'une destination (« Insolite » compris). */
export function enviesDesActivites(dest: Destination): Set<string> {
  const res = new Set(dest.activites.flatMap((a) => (a.insolite ? [...a.envies, "insolite"] : a.envies)));
  if (dest.hebergements.some((h) => TYPES_INSOLITES.includes(h))) res.add("insolite");
  return res;
}

/** Raison d'exclure une destination, ou null si elle reste candidate. */
export function contrainteDure(dest: Destination, d: Demande, c: Criteres): string | null {
  for (const v of c.voyageurs) {
    const r = [...v.refus].find((x) => dest.tagsForts.includes(x));
    if (r) return `${v.prenom} ne veut pas de « ${NOMS_ENVIES[r]} », au cœur de cette destination`;
  }
  if (d.type === "iles" && !dest.ile) return "ce n'est pas une île";
  if (d.type === "velo" && !dest.tags.includes("velo")) return "pas adaptée à un voyage à vélo";

  const m = c.modes;
  const parAvion = m.has("avion");
  const parFerry = m.has("ferry") && !!dest.ferry && (m.has("train") || m.has("ma_voiture") || m.has("van"));
  const parSol = dest.continent && ["train", "bus", "covoiturage", "ma_voiture", "van"].some((x) => m.has(x));
  if (!parAvion && !parFerry && !parSol) {
    return dest.continent ? "aucun des transports acceptés n'y va" : "accessible seulement en avion (ou en bateau)";
  }

  // Plancher de budget : même en serrant tout, l'estimation dépasse de beaucoup.
  const plafond = budgetTotal(d) * (1 + d.budget.depassement / 100);
  const nuits = d.dates.nuitsMin;
  const equiv = d.adultes + d.agesEnfants.length * 0.7;
  const plancher = (dest.estimationTransportParAdulte * 0.6 + dest.estimationNuitParAdulte * 0.35 * nuits) * equiv;
  if (plancher > plafond * 1.6) return "bien trop chère pour le budget, même en formule économique";
  return null;
}

/** Pré-note entre 0 et 1 : envies (avec la météo du meilleur mois possible) et coût estimé. */
export function preNote(dest: Destination, d: Demande, c: Criteres, maintenant: Date): number {
  const mois = moisCandidats(d, maintenant).map((x) => x.mois);
  const enviesActivites = enviesDesActivites(dest);
  let meilleure = 0;
  for (const m of mois) {
    const i = m - 1;
    const climat = {
      mois: m,
      tMax: dest.climat.tMax[i],
      tMin: dest.climat.tMin[i],
      soleilH: dest.climat.soleilH[i],
      pluieJ: dest.climat.pluieJ[i],
      neige: dest.climat.neige.includes(m),
      source: "base",
      nature: "estimation" as const,
    };
    let total = 0;
    for (const v of c.voyageurs) {
      let voulu = 0;
      let servi = 0;
      for (const [e, p] of v.envies) {
        voulu += p;
        if (envieServie(e, dest, climat, enviesActivites)) servi += p;
      }
      total += voulu === 0 ? 1 : servi / voulu;
    }
    meilleure = Math.max(meilleure, total / c.voyageurs.length);
  }
  const refusSecondaires = c.voyageurs.reduce((t, v) => t + [...v.refus].filter((r) => dest.tags.includes(r)).length, 0);
  const equiv = d.adultes + d.agesEnfants.length * 0.7;
  const estime = (dest.estimationTransportParAdulte + dest.estimationNuitParAdulte * d.dates.nuitsMin) * equiv;
  const budget = budgetTotal(d) * (1 + d.budget.depassement / 100);
  const cout = estime <= budget ? 1 : Math.max(0, 1 - (estime - budget) / budget);
  return meilleure * 0.7 + cout * 0.3 - refusSecondaires * 0.08;
}

export function selectionnerCandidates(d: Demande, c: Criteres, maintenant: Date): { candidates: Destination[]; exclues: Exclusion[] } {
  const exclues: Exclusion[] = [];
  const restantes: Destination[] = [];
  for (const dest of DESTINATIONS) {
    const raison = contrainteDure(dest, d, c);
    if (raison) exclues.push({ destination: dest.nom, raison });
    else restantes.push(dest);
  }
  const notees = restantes.map((dest) => ({ dest, note: preNote(dest, d, c, maintenant) })).sort((a, b) => b.note - a.note);
  return { candidates: notees.slice(0, NB_CANDIDATES_MAX).map((x) => x.dest), exclues };
}
