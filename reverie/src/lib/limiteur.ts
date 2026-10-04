// Limite simple du nombre de recherches par visiteur, en mémoire.
// Suffisant pour un seul serveur ; à remplacer par un cache partagé (étape 8) en production.

export interface Limiteur {
  autoriser(cle: string, maintenant?: number): boolean;
}

export function creerLimiteur(max: number, fenetreMs: number): Limiteur {
  const appels = new Map<string, number[]>();
  return {
    autoriser(cle, maintenant = Date.now()) {
      const recents = (appels.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
      if (recents.length >= max) {
        appels.set(cle, recents);
        return false;
      }
      recents.push(maintenant);
      appels.set(cle, recents);
      if (appels.size > 10_000) appels.clear(); // garde-fou mémoire
      return true;
    },
  };
}
