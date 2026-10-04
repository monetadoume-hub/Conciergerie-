// Transports simulés : ordres de grandeur réalistes (prix, durées, CO₂), reproductibles.
// Montants pour tout le groupe, en aller-retour.

import type {
  BikeProvider,
  BusProvider,
  CarRentalProvider,
  FerryProvider,
  FlightProvider,
  GroundQuery,
  ModeTransport,
  RailProvider,
  RideshareProvider,
  TransportOffer,
} from "../types";
import { distanceKm, entre, equivalentsAdultes, nbPersonnes } from "../outils";
import { coefSaison, destinationProche, OPTIONS_PAR_DEFAUT, patienter, prix, type OptionsSimulation } from "./commun";

/** CO₂ par personne et par km (ordres de grandeur ADEME, arrondis). */
export const CO2_KG_PAR_KM: Record<ModeTransport, number> = {
  avion: 0.23,
  train: 0.01,
  bus: 0.03,
  covoiturage: 0.05,
  ferry: 0.12,
  voiture: 0.2, // pour la voiture entière
  location: 0.2,
  velo: 0,
};

function offre(
  q: GroundQuery,
  provider: string,
  opts: OptionsSimulation,
  o: Omit<TransportOffer, "id" | "de" | "vers" | "prix" | "co2Kg"> & { montant: number; km: number },
): TransportOffer {
  const co2 = CO2_KG_PAR_KM[o.mode] * o.km * 2 * nbPersonnes(q.passagers);
  return {
    id: `${o.mode}-${q.de.nom}-${q.vers.nom}-${o.correspondances}-${o.nuit ? "n" : "j"}`,
    mode: o.mode,
    de: q.de.nom,
    vers: q.vers.nom,
    dureeMin: Math.round(o.dureeMin),
    correspondances: o.correspondances,
    nuit: o.nuit,
    co2Kg: Math.round(co2),
    confort: o.confort,
    prix: prix(o.montant, provider, opts),
    resume: o.resume,
  };
}

const graine = (q: GroundQuery, mode: string) => `${mode}${q.de.nom}${q.vers.nom}${q.date}`;
const saison = (q: GroundQuery) => coefSaison(destinationProche(q.vers), q.date);

export function creerVolsSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): FlightProvider {
  const nom = "Simulation Rêverie — vols";
  return {
    nom,
    async search(q) {
      await patienter(opts, graine(q, "vol"));
      const km = distanceKm(q.de, q.vers);
      if (km < 350) return [];
      const parAdulte = (55 + 0.11 * km) * saison(q) * entre(graine(q, "volp"), 0.85, 1.3);
      // Vol : 2 h 30 d'aéroport (arrivée en avance, bagages) + temps de vol.
      const vol = 40 + (km / 780) * 60;
      const direct = km < 3200;
      const res = [
        offre(q, nom, opts, {
          mode: "avion",
          km,
          dureeMin: 150 + vol + (direct ? 0 : 120),
          correspondances: direct ? 0 : 1,
          nuit: false,
          confort: 2,
          montant: parAdulte * equivalentsAdultes(q.passagers),
          resume: `Vol ${direct ? "direct" : "avec escale"} ${q.de.nom} → ${q.vers.nom}`,
        }),
      ];
      if (direct) {
        res.push(
          offre(q, nom, opts, {
            mode: "avion",
            km,
            dureeMin: 150 + vol + 150,
            correspondances: 1,
            nuit: false,
            confort: 1,
            montant: parAdulte * 0.78 * equivalentsAdultes(q.passagers),
            resume: `Vol avec escale ${q.de.nom} → ${q.vers.nom}`,
          }),
        );
      }
      return res;
    },
  };
}

export function creerTrainsSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): RailProvider {
  const nom = "Simulation Rêverie — trains";
  return {
    nom,
    async search(q) {
      await patienter(opts, graine(q, "train"));
      const km = distanceKm(q.de, q.vers) * 1.2;
      if (km < 30) return [];
      const correspondances = km > 900 ? 2 : km > 450 ? 1 : 0;
      const parAdulte = (20 + 0.1 * km) * saison(q) * entre(graine(q, "trainp"), 0.85, 1.25);
      const res = [
        offre(q, nom, opts, {
          mode: "train",
          km,
          dureeMin: 45 + (km / 170) * 60 + correspondances * 40,
          correspondances,
          nuit: false,
          confort: 3,
          montant: parAdulte * equivalentsAdultes(q.passagers),
          resume: `Train ${q.de.nom} → ${q.vers.nom}`,
        }),
      ];
      if (q.nuit && km > 700) {
        res.push(
          offre(q, nom, opts, {
            mode: "train",
            km,
            dureeMin: 30 + (km / 85) * 60,
            correspondances: 0,
            nuit: true,
            confort: 2,
            montant: (35 + 0.08 * km) * equivalentsAdultes(q.passagers),
            resume: `Train de nuit en couchette ${q.de.nom} → ${q.vers.nom}`,
          }),
        );
      }
      return res;
    },
  };
}

export function creerBusSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): BusProvider {
  const nom = "Simulation Rêverie — autocars";
  return {
    nom,
    async search(q) {
      await patienter(opts, graine(q, "bus"));
      const km = distanceKm(q.de, q.vers) * 1.3;
      if (km < 30 || km > 2200) return [];
      return [
        offre(q, nom, opts, {
          mode: "bus",
          km,
          dureeMin: 30 + (km / 70) * 60,
          correspondances: km > 900 ? 1 : 0,
          nuit: km > 900,
          confort: 1,
          montant: (12 + 0.045 * km) * entre(graine(q, "busp"), 0.85, 1.2) * equivalentsAdultes(q.passagers),
          resume: `Autocar ${q.de.nom} → ${q.vers.nom}`,
        }),
      ];
    },
  };
}

export function creerCovoiturageSimule(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): RideshareProvider {
  const nom = "Simulation Rêverie — covoiturage";
  return {
    nom,
    async search(q) {
      await patienter(opts, graine(q, "covoit"));
      const km = distanceKm(q.de, q.vers) * 1.3;
      // Au-delà de 4 passagers, trouver des places ensemble devient irréaliste.
      if (km < 30 || km > 1100 || nbPersonnes(q.passagers) > 4) return [];
      return [
        offre(q, nom, opts, {
          mode: "covoiturage",
          km,
          dureeMin: 20 + (km / 85) * 60,
          correspondances: 0,
          nuit: false,
          confort: 2,
          montant: 0.065 * km * 2 * nbPersonnes(q.passagers),
          resume: `Covoiturage ${q.de.nom} → ${q.vers.nom}`,
        }),
      ];
    },
  };
}

export function creerFerriesSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): FerryProvider {
  const nom = "Simulation Rêverie — ferries";
  return {
    nom,
    async search(q) {
      await patienter(opts, graine(q, "ferry"));
      const km = distanceKm(q.de, q.vers);
      const nuit = km > 250;
      const parAdulte = (60 + 0.25 * km) * saison(q) * entre(graine(q, "ferryp"), 0.9, 1.2);
      const vehicule = q.avecVehicule ? 180 * saison(q) : 0;
      return [
        offre(q, nom, opts, {
          mode: "ferry",
          km,
          dureeMin: 60 + (km / 38) * 60,
          correspondances: 0,
          nuit,
          confort: nuit ? 2 : 3,
          montant: parAdulte * equivalentsAdultes(q.passagers) + vehicule,
          resume: `Ferry ${q.de.nom} → ${q.vers.nom}${nuit ? " (traversée de nuit, cabine)" : ""}${q.avecVehicule ? ", avec la voiture" : ""}`,
        }),
      ];
    },
  };
}

export function creerLocationVoitureSimulee(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): CarRentalProvider {
  const nom = "Simulation Rêverie — location de voitures";
  return {
    nom,
    async search(q) {
      await patienter(opts, `loc${q.lieu.nom}${q.du}`);
      const grand = nbPersonnes(q.passagers) > 5;
      const parJour = (grand ? 75 : 38) * coefSaison(destinationProche(q.lieu), q.du) * entre(`locp${q.lieu.nom}${q.du}`, 0.85, 1.3);
      return [
        {
          id: `location-${q.lieu.nom}`,
          type: "voiture",
          description: grand ? "Minibus 9 places" : nbPersonnes(q.passagers) > 4 ? "Monospace 7 places" : "Citadine 5 places",
          jours: q.jours,
          prix: prix(parJour * q.jours, nom, opts),
        },
      ];
    },
  };
}

export function creerVelosSimules(opts: OptionsSimulation = OPTIONS_PAR_DEFAUT): BikeProvider {
  const nom = "Simulation Rêverie — location de vélos";
  return {
    nom,
    async rentals(q) {
      await patienter(opts, `velo${q.lieu.nom}${q.du}`);
      const velos = nbPersonnes(q.passagers);
      return [
        {
          id: `velos-${q.lieu.nom}`,
          type: "velo",
          description: `${velos} vélo${velos > 1 ? "s" : ""} de randonnée avec sacoches`,
          jours: q.jours,
          prix: prix(16 * velos * q.jours, nom, opts),
        },
      ];
    },
  };
}
