// Interfaces communes des fournisseurs (cahier des charges §5.1).
// Une interface par famille ; chaque partenaire est un adaptateur interchangeable.
// Tous les montants sont en euros, pour TOUT le groupe et en ALLER-RETOUR pour les transports.

/** D'où vient une donnée : jamais de prix inventé présenté comme réel. */
export type Nature = "reel" | "simulation" | "estimation";

export interface PriceQuote {
  amount: number;
  currency: "EUR";
  /** Date et heure du relevé (ISO). */
  observedAt: string;
  provider: string;
  nature: Nature;
  deepLink?: string;
}

export interface Place {
  nom: string;
  lat: number;
  lon: number;
  pays?: string;
}

export interface Passagers {
  adultes: number;
  agesEnfants: number[];
}

// ——— Météo ———

export interface Climate {
  mois: number; // 1 à 12
  tMax: number;
  tMin: number;
  /** Heures de soleil par jour, en moyenne. */
  soleilH: number;
  /** Jours de pluie dans le mois. */
  pluieJ: number;
  /** Enneigement suffisant pour skier ou jouer dans la neige. */
  neige: boolean;
  source: string;
  nature: Nature;
}

export interface Forecast {
  date: string;
  tMax: number;
  tMin: number;
  pluieMm: number;
  neigeCm: number;
  source: string;
  nature: Nature;
}

export interface WeatherProvider {
  nom: string;
  climate(lat: number, lon: number, mois: number): Promise<Climate | null>;
  forecast(lat: number, lon: number, du: string, au: string): Promise<Forecast[]>;
}

// ——— Géographie ———

export type ModeRoute = "voiture" | "velo" | "pied";

export interface Route {
  mode: ModeRoute;
  distanceKm: number;
  dureeMin: number;
  source: string;
}

export interface GeoProvider {
  nom: string;
  geocode(texte: string): Promise<Place[]>;
  route(de: Place, vers: Place, mode: ModeRoute): Promise<Route>;
}

// ——— Transports ———

export type ModeTransport =
  | "avion"
  | "train"
  | "bus"
  | "covoiturage"
  | "ferry"
  | "voiture" // sa propre voiture ou un van
  | "location"
  | "velo";

export interface TransportOffer {
  id: string;
  mode: ModeTransport;
  de: string;
  vers: string;
  dureeMin: number;
  correspondances: number;
  nuit: boolean;
  /** CO₂ pour tout le groupe, aller-retour. */
  co2Kg: number;
  /** 1 = rudimentaire, 3 = très confortable. */
  confort: 1 | 2 | 3;
  prix: PriceQuote;
  resume: string;
}

export interface GroundQuery {
  de: Place;
  vers: Place;
  date: string;
  passagers: Passagers;
  /** Trajet de nuit accepté. */
  nuit?: boolean;
}

export type FlightQuery = GroundQuery;

export interface FerryQuery extends GroundQuery {
  avecVehicule: boolean;
}

export interface RentalQuery {
  lieu: Place;
  du: string;
  jours: number;
  passagers: Passagers;
}

export interface RentalOffer {
  id: string;
  type: "voiture" | "velo";
  description: string;
  jours: number;
  prix: PriceQuote;
}

export interface FlightProvider {
  nom: string;
  search(q: FlightQuery): Promise<TransportOffer[]>;
}
export interface RailProvider {
  nom: string;
  search(q: GroundQuery): Promise<TransportOffer[]>;
}
export interface BusProvider {
  nom: string;
  search(q: GroundQuery): Promise<TransportOffer[]>;
}
export interface RideshareProvider {
  nom: string;
  search(q: GroundQuery): Promise<TransportOffer[]>;
}
export interface FerryProvider {
  nom: string;
  search(q: FerryQuery): Promise<TransportOffer[]>;
}
export interface CarRentalProvider {
  nom: string;
  search(q: RentalQuery): Promise<RentalOffer[]>;
}
export interface BikeProvider {
  nom: string;
  rentals(q: RentalQuery): Promise<RentalOffer[]>;
}

// ——— Hébergements ———

export interface LodgingQuery {
  lieu: Place;
  arrivee: string;
  nuits: number;
  passagers: Passagers;
  types: string[];
  etoilesMin?: number;
  etoilesMax?: number;
  equipements: string[];
}

export interface LodgingOffer {
  id: string;
  nom: string;
  type: string;
  etoiles?: number;
  /** Nombre de chambres ou de logements réservés pour loger tout le groupe. */
  unites: number;
  equipements: string[];
  /** Note sur 10. */
  note: number;
  prix: PriceQuote;
}

export interface LodgingProvider {
  nom: string;
  search(q: LodgingQuery): Promise<LodgingOffer[]>;
}

// ——— Activités et lieux ———

export interface ActivityQuery {
  lieu: Place;
  destinationId: string;
  interets: string[];
  date: string;
  passagers: Passagers;
}

export interface ActivityOffer {
  id: string;
  nom: string;
  envies: string[];
  dureeH: number;
  insolite: boolean;
  /** Âge minimum conseillé. */
  ageMin: number;
  prix: PriceQuote;
}

export interface Poi {
  id: string;
  nom: string;
  envies: string[];
  insolite: boolean;
  source: string;
}

export interface ActivityProvider {
  nom: string;
  search(q: ActivityQuery): Promise<ActivityOffer[]>;
}

export interface PoiProvider {
  nom: string;
  attractions(destinationId: string, lat: number, lon: number, interets: string[]): Promise<Poi[]>;
}

// ——— Ensemble des fournisseurs actifs ———

export interface Fournisseurs {
  meteo: WeatherProvider;
  geo: GeoProvider;
  vols: FlightProvider[];
  trains: RailProvider[];
  bus: BusProvider[];
  covoiturage: RideshareProvider[];
  ferries: FerryProvider[];
  locationVoiture: CarRentalProvider[];
  velos: BikeProvider[];
  hebergements: LodgingProvider[];
  activites: ActivityProvider[];
  lieux: PoiProvider[];
}
