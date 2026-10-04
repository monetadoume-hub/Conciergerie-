import { demandeParDefaut } from "@/lib/brouillon";
import type { Demande } from "@/lib/demande";

/** Date de référence fixe pour que les tests de dates ne dépendent pas du jour où on les lance. */
export const MAINTENANT = new Date("2026-10-04T10:00:00Z");

export function demandeValide(maj: Partial<Demande> = {}): Demande {
  return {
    ...demandeParDefaut(),
    voyageurs: [
      { prenom: "Léa", envies: { plage: "aime", montagne: "aime", vie_nocturne: "naime_pas" } },
      { prenom: "Tom", envies: { randonnee: "aime" } },
    ],
    depart: { lieu: "Lyon", rayonKm: 50 },
    ...maj,
  };
}
