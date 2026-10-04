// Outils partagés par les fournisseurs simulés.

import { DESTINATIONS, type Destination } from "@/donnees/destinations";
import type { Nature, PriceQuote } from "../types";
import { distanceKm, hasard } from "../outils";

export interface OptionsSimulation {
  /** Latence maximale simulée par appel, en millisecondes (0 dans les tests). */
  latenceMs: number;
  maintenant: () => Date;
}

export const OPTIONS_PAR_DEFAUT: OptionsSimulation = { latenceMs: 0, maintenant: () => new Date() };

export async function patienter(opts: OptionsSimulation, graine: string) {
  if (opts.latenceMs <= 0) return;
  const ms = Math.round(opts.latenceMs * (0.3 + 0.7 * hasard(graine)));
  await new Promise((r) => setTimeout(r, ms));
}

export function prix(montant: number, provider: string, opts: OptionsSimulation, nature: Nature = "simulation"): PriceQuote {
  return {
    amount: Math.round(montant),
    currency: "EUR",
    observedAt: opts.maintenant().toISOString(),
    provider,
    nature,
  };
}

/** Destination de la base la plus proche d'un point (à moins de `rayonKm`). */
export function destinationProche(p: { lat: number; lon: number }, rayonKm = 250): Destination | undefined {
  let meilleure: Destination | undefined;
  let min = Infinity;
  for (const d of DESTINATIONS) {
    const km = Math.min(distanceKm(p, d.centre), distanceKm(p, d.aeroport), ...d.etapes.map((e) => distanceKm(p, e)));
    if (km < min) {
      min = km;
      meilleure = d;
    }
  }
  return min <= rayonKm ? meilleure : undefined;
}

/** Mois (1 à 12) d'une date ISO. */
export const moisDe = (date: string) => Number(date.slice(5, 7));

/** Coefficient saisonnier des prix selon l'affluence (1 calme → 0,85 ; 3 foule → 1,3). */
export function coefSaison(dest: Destination | undefined, date: string): number {
  if (!dest) return 1;
  const a = dest.affluence[moisDe(date) - 1];
  return a === 1 ? 0.85 : a === 2 ? 1 : 1.3;
}
