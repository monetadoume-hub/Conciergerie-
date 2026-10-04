// Registre des fournisseurs : chaque partenaire réel ne sera activé que si sa clé est dans `.env`.
// Étape 2 : seuls les adaptateurs simulés existent.

import { creerActivitesSimulees, creerLieuxSimules } from "./mock/activites";
import { OPTIONS_PAR_DEFAUT, type OptionsSimulation } from "./mock/commun";
import { creerGeoSimule } from "./mock/geo";
import { creerHebergementsSimules } from "./mock/hebergements";
import { creerMeteoSimulee } from "./mock/meteo";
import {
  creerBusSimules,
  creerCovoiturageSimule,
  creerFerriesSimules,
  creerLocationVoitureSimulee,
  creerTrainsSimules,
  creerVelosSimules,
  creerVolsSimules,
} from "./mock/transports";
import type { Fournisseurs } from "./types";

export function creerFournisseursSimules(opts: Partial<OptionsSimulation> = {}): Fournisseurs {
  const o = { ...OPTIONS_PAR_DEFAUT, ...opts };
  return {
    meteo: creerMeteoSimulee(o),
    geo: creerGeoSimule(o),
    vols: [creerVolsSimules(o)],
    trains: [creerTrainsSimules(o)],
    bus: [creerBusSimules(o)],
    covoiturage: [creerCovoiturageSimule(o)],
    ferries: [creerFerriesSimules(o)],
    locationVoiture: [creerLocationVoitureSimulee(o)],
    velos: [creerVelosSimules(o)],
    hebergements: [creerHebergementsSimules(o)],
    activites: [creerActivitesSimulees(o)],
    lieux: [creerLieuxSimules(o)],
  };
}

/**
 * Fournisseurs utilisés par le site. Quand un vrai partenaire sera branché, on l'ajoutera ici
 * si sa clé est présente (ex. `if (process.env.DUFFEL_API_KEY) vols.push(creerDuffel(...))`).
 */
export function fournisseursActifs(): Fournisseurs {
  const latence = Number(process.env.REVERIE_LATENCE_SIMULEE_MS ?? 400);
  return creerFournisseursSimules({ latenceMs: Number.isFinite(latence) ? latence : 0 });
}
