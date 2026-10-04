// Types du résultat de recherche (cahier des charges §6).

import type { Climate, Forecast, LodgingOffer, Nature, PriceQuote, RentalOffer, TransportOffer } from "@/providers/types";

export type NomFormule = "economique" | "equilibree" | "confort" | "insolite";
export const NOMS_FORMULES: NomFormule[] = ["economique", "equilibree", "confort", "insolite"];

export type Poste = "transport" | "hebergement" | "activites" | "repas";

/** Un trajet aller (le retour est symétrique ; les prix couvrent l'aller-retour). */
export interface Trajet {
  id: string;
  segments: TransportOffer[];
  prix: PriceQuote;
  dureeMin: number;
  correspondances: number;
  co2Kg: number;
  nuit: boolean;
  confort: 1 | 2 | 3;
  resume: string;
  /** Location sur place (voiture ou vélos) nécessaire à ce trajet. */
  location?: RentalOffer;
}

export interface Sejour {
  lieu: string;
  nuits: number;
  hebergement: LodgingOffer;
  /** Équipements souhaités présents / absents. */
  equipementsOk: string[];
  equipementsManquants: string[];
}

export interface Activite {
  id: string;
  nom: string;
  envies: string[];
  insolite: boolean;
  /** null = visite libre, gratuite. */
  prix: PriceQuote | null;
  /** Prénoms des voyageurs dont une envie est servie. */
  pourQui: string[];
}

export interface Etape {
  lieu: string;
  nuits: number;
  /** Trajet depuis l'étape précédente. */
  depuisPrecedente?: { mode: "voiture" | "velo"; distanceKm: number; dureeMin: number };
}

export interface Formule {
  nom: NomFormule;
  trajet: Trajet;
  sejours: Sejour[];
  activites: Activite[];
  total: PriceQuote;
  detail: Partial<Record<Poste, PriceQuote>>;
  /** Somme des seuls postes couverts par le budget. */
  totalBudget: number;
  dansLeBudget: boolean;
  dansLaMarge: boolean;
  dureePorteAPorte: string;
  dureeMin: number;
  co2Kg: number;
  notes: string[];
}

export interface MeteoProposition {
  source: "normales" | "previsions";
  nature: Nature;
  mois: number;
  resume: string;
  climat: Climate;
  previsions?: Forecast[];
}

export interface Periode {
  mois: number;
  libelle: string;
  /** Date d'aller retenue pour interroger les fournisseurs. */
  aller: string;
  nuits: number;
}

export interface DetailScore {
  envies: number;
  meteo: number;
  budget: number;
  trajet: number;
  diversite: number;
  penalites: number;
}

export interface Proposition {
  id: string;
  destination: string;
  pays: string;
  score: number;
  detailScore: DetailScore;
  satisfaction: { prenom: string; avatar?: string; envies: number; sur: number }[];
  meteo: MeteoProposition;
  periode: Periode;
  reponses: { qui: string; envie: string; reponse: string }[];
  refusEvites: string[];
  compromis: string[];
  accroche: string;
  etapes?: Etape[];
  formules: Formule[];
  pourquoi: string[];
  /** Nature des données : « simulation » tant qu'aucun partenaire n'est branché. */
  donnees: Nature;
}

export interface MetaRecherche {
  genereLe: string;
  dureeMs: number;
  cout: { depenseEur: number; plafondEur: number };
  fournisseursEnEchec: string[];
  depart: { nom: string; reconnu: boolean };
  compris: string[];
  exclues: { destination: string; raison: string }[];
}

export type Evenement =
  | { type: "etape"; texte: string }
  | { type: "proposition"; proposition: Proposition }
  | { type: "fin"; propositions: Proposition[]; meta: MetaRecherche };
