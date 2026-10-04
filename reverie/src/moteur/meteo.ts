// Étape 4 du pipeline : la météo au bon moment, et le choix de la période.

import type { Destination } from "@/donnees/destinations";
import type { Demande } from "@/lib/demande";
import { nomMois } from "@/lib/texte";
import type { Climate, Forecast, WeatherProvider } from "@/providers/types";
import type { Criteres } from "./comprehension";
import type { MeteoProposition, Periode } from "./types";

/** Envies dont la satisfaction dépend du mois. */
export const ENVIES_METEO = ["soleil", "chaleur", "douceur", "fraicheur", "neige", "ski"] as const;
export const estEnvieMeteo = (e: string) => (ENVIES_METEO as readonly string[]).includes(e);

/** Une envie météo est-elle satisfaite par ce climat ? (null si l'envie ne dépend pas de la météo) */
export function envieMeteoSatisfaite(envie: string, c: Climate, dest?: Destination): boolean | null {
  switch (envie) {
    case "soleil":
      return c.soleilH >= 7 && c.pluieJ <= 7;
    case "chaleur":
      return c.tMax >= 26;
    case "douceur":
      return c.tMax >= 18 && c.tMax <= 27;
    case "fraicheur":
      return c.tMax <= 22;
    case "neige":
      return c.neige;
    case "ski":
      return c.neige && (dest ? dest.tags.includes("ski") : true);
    default:
      return null;
  }
}

/**
 * Envies liées à un lieu mais qui dépendent aussi de la saison (une plage en mars, c'est
 * une balade, pas une baignade). Renvoie true si la saison convient.
 */
export const ENVIES_SAISONNIERES: Record<string, (c: Climate) => boolean> = {
  plage: (c) => c.tMax >= 23,
  baignade_facile: (c) => c.tMax >= 23,
  plongee: (c) => c.tMax >= 22,
  nautique: (c) => c.tMax >= 20,
};

export const saisonConvient = (envie: string, c: Climate) => ENVIES_SAISONNIERES[envie]?.(c) ?? true;

export interface EvaluationMeteo {
  /** Entre 0 et 1. */
  score: number;
  explications: string[];
  /** Refus météo touchés (ex. « Léa n'aime pas la chaleur »). */
  refusTouches: string[];
}

export function evaluerMeteo(c: Climate, criteres: Criteres, dest?: Destination): EvaluationMeteo {
  let voulues = 0;
  let servies = 0;
  const explications: string[] = [];
  const refusTouches: string[] = [];

  for (const v of criteres.voyageurs) {
    for (const [e, poids] of v.envies) {
      let ok = envieMeteoSatisfaite(e, c, dest);
      // Envie saisonnière : ne compte que si la destination l'offre (sinon la météo n'y change rien).
      if (ok === null && ENVIES_SAISONNIERES[e] && dest?.tags.includes(e)) ok = saisonConvient(e, c);
      if (ok === null) continue;
      voulues += poids;
      if (ok) servies += poids;
    }
    for (const r of v.refus) {
      if (envieMeteoSatisfaite(r, c, dest)) refusTouches.push(`${v.prenom} n'aime pas « ${r} »`);
    }
  }

  let score = voulues === 0 ? 1 : servies / voulues;
  if (voulues > 0) explications.push(`Envies liées à la météo et à la saison servies : ${Math.round(score * 100)} %`);
  // La pluie gâche un peu tout voyage ; beaucoup plus si on a demandé à l'éviter.
  const poidsPluie = criteres.eviterPluie ? 0.5 : 0.2;
  const pluie = Math.min(1, c.pluieJ / 20);
  score = Math.max(0, score - pluie * poidsPluie - refusTouches.length * 0.25);
  if (c.pluieJ >= 12) explications.push(`Mois pluvieux (${c.pluieJ} jours de pluie)`);
  return { score, explications, refusTouches };
}

export function resumeClimat(c: Climate): string {
  const parties = [
    `${c.tMax} °C l'après-midi, ${c.tMin} °C la nuit`,
    `${c.soleilH} h de soleil par jour`,
    `${c.pluieJ} jour${c.pluieJ > 1 ? "s" : ""} de pluie dans le mois`,
  ];
  if (c.neige) parties.push("neige présente");
  return parties.join(", ");
}

const JOUR_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Mois à examiner selon le mode de dates choisi. */
export function moisCandidats(d: Demande, maintenant: Date): { mois: number; annee: number }[] {
  const dates = d.dates;
  if ((dates.mode === "fixes" || dates.mode === "flexibles") && dates.aller) {
    return [{ mois: Number(dates.aller.slice(5, 7)), annee: Number(dates.aller.slice(0, 4)) }];
  }
  if (dates.mode === "mois" && dates.mois?.length) {
    return dates.mois.map((m) => ({ annee: Number(m.slice(0, 4)), mois: Number(m.slice(5, 7)) }));
  }
  // « Quand c'est le mieux » : les 12 prochains mois, à partir du mois prochain.
  return Array.from({ length: 12 }, (_, i) => {
    const x = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1 + i, 1));
    return { mois: x.getUTCMonth() + 1, annee: x.getUTCFullYear() };
  });
}

/** Date d'aller représentative d'un mois : le 15, ou au moins une semaine après aujourd'hui. */
function allerPourMois(annee: number, mois: number, maintenant: Date): string {
  const quinze = new Date(Date.UTC(annee, mois - 1, 15));
  const auPlusTot = new Date(maintenant.getTime() + 7 * JOUR_MS);
  return iso(quinze < auPlusTot ? auPlusTot : quinze);
}

export const nuitsDemandees = (d: Demande) => Math.round((d.dates.nuitsMin + d.dates.nuitsMax) / 2);

export interface ChoixPeriode {
  periode: Periode;
  meteo: MeteoProposition;
  evaluation: EvaluationMeteo;
  affluence: number;
}

/**
 * Choisit la meilleure période pour une destination : météo voulue, affluence (surtout si on veut
 * éviter la foule) et prix (la haute saison coûte plus cher).
 */
export async function choisirPeriode(
  dest: Destination,
  d: Demande,
  criteres: Criteres,
  meteo: WeatherProvider,
  maintenant: Date,
): Promise<ChoixPeriode | null> {
  const candidats = moisCandidats(d, maintenant);
  let meilleur: (ChoixPeriode & { note: number }) | null = null;

  for (const { mois, annee } of candidats) {
    const climat = await meteo.climate(dest.centre.lat, dest.centre.lon, mois);
    if (!climat) continue;
    const evaluation = evaluerMeteo(climat, criteres, dest);
    const affluence = dest.affluence[mois - 1];
    const calme = (3 - affluence) / 2; // 1 = calme, 0 = foule
    const note = evaluation.score * 0.65 + calme * (criteres.eviterFoule ? 0.35 : 0.15) + calme * 0.1;

    if (!meilleur || note > meilleur.note + 1e-9) {
      const fixes = d.dates.mode === "fixes" || d.dates.mode === "flexibles";
      const aller = fixes && d.dates.aller ? d.dates.aller : allerPourMois(annee, mois, maintenant);
      const libelle = fixes && d.dates.aller && d.dates.retour
        ? `du ${new Date(d.dates.aller).toLocaleDateString("fr-FR", { timeZone: "UTC" })} au ${new Date(d.dates.retour).toLocaleDateString("fr-FR", { timeZone: "UTC" })}${d.dates.mode === "flexibles" ? ` (± ${d.dates.flexJours} j)` : ""}`
        : `en ${nomMois(mois)} ${annee}`;
      meilleur = {
        note,
        affluence,
        evaluation,
        periode: { mois, libelle, aller, nuits: nuitsDemandees(d) },
        meteo: {
          source: "normales",
          nature: climat.nature,
          mois,
          climat,
          resume: `En ${nomMois(mois)} : ${resumeClimat(climat)}.`,
        },
      };
    }
  }
  if (!meilleur) return null;

  // Départ dans moins de 14 jours : on ajoute les vraies prévisions.
  const joursAvantDepart = (Date.parse(meilleur.periode.aller) - maintenant.getTime()) / JOUR_MS;
  if (joursAvantDepart < 14) {
    const fin = iso(new Date(Date.parse(meilleur.periode.aller) + meilleur.periode.nuits * JOUR_MS));
    const previsions: Forecast[] = await meteo.forecast(dest.centre.lat, dest.centre.lon, meilleur.periode.aller, fin);
    if (previsions.length > 0) {
      const moy = (f: (x: Forecast) => number) => Math.round(previsions.reduce((t, x) => t + f(x), 0) / previsions.length);
      const pluvieux = previsions.filter((x) => x.pluieMm > 0).length;
      meilleur.meteo = {
        ...meilleur.meteo,
        source: "previsions",
        nature: previsions[0].nature,
        previsions,
        resume: `Prévisions : ${moy((x) => x.tMax)} °C l'après-midi en moyenne, ${pluvieux} jour${pluvieux > 1 ? "s" : ""} de pluie sur ${previsions.length}.`,
      };
    }
  }

  const { note, ...choix } = meilleur;
  void note;
  return choix;
}
