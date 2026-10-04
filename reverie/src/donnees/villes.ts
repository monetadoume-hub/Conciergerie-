// Villes de départ connues du géocodeur simulé. Le vrai géocodage (OpenStreetMap) arrive à l'étape 4.

import type { Lieu } from "./destinations";

export interface Ville extends Lieu {
  pays: string;
  aeroport: boolean;
  /** Gare desservie par les trains à grande vitesse. */
  gareTGV: boolean;
  port?: boolean;
}

const V = (nom: string, lat: number, lon: number, aeroport: boolean, gareTGV: boolean, port = false, pays = "France"): Ville => ({
  nom,
  lat,
  lon,
  aeroport,
  gareTGV,
  port,
  pays,
});

export const VILLES: Ville[] = [
  V("Paris", 48.86, 2.35, true, true),
  V("Lyon", 45.76, 4.84, true, true),
  V("Marseille", 43.3, 5.37, true, true, true),
  V("Toulouse", 43.6, 1.44, true, true),
  V("Nice", 43.7, 7.27, true, true, true),
  V("Nantes", 47.22, -1.55, true, true),
  V("Strasbourg", 48.57, 7.75, true, true),
  V("Montpellier", 43.61, 3.88, true, true),
  V("Bordeaux", 44.84, -0.58, true, true),
  V("Lille", 50.63, 3.06, true, true),
  V("Rennes", 48.11, -1.68, true, true),
  V("Grenoble", 45.19, 5.72, false, true),
  V("Dijon", 47.32, 5.04, false, true),
  V("Toulon", 43.12, 5.93, true, true, true),
  V("Clermont-Ferrand", 45.78, 3.08, true, false),
  V("Tours", 47.39, 0.69, false, true),
  V("Limoges", 45.83, 1.26, true, false),
  V("Brest", 48.39, -4.49, true, false),
  V("Rouen", 49.44, 1.1, false, false),
  V("Bruxelles", 50.85, 4.35, true, true, false, "Belgique"),
  V("Genève", 46.2, 6.14, true, true, false, "Suisse"),
  V("Luxembourg", 49.61, 6.13, true, false, false, "Luxembourg"),
];

/** Centre de la France : utilisé (et signalé) quand la ville de départ n'est pas reconnue. */
export const CENTRE_FRANCE: Ville = V("Centre de la France", 46.6, 2.4, false, false);
