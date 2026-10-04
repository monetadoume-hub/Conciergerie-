// Contexte d'une recherche : appels aux fournisseurs protégés (délai, nouvelle tentative, cache,
// plafond de coût) et suivi des fournisseurs en échec pour signaler un résultat partiel.

import {
  avecDelai,
  avecReessais,
  cacheGlobal,
  CompteurCout,
  journal,
  plafondCoutParDefaut,
  type CacheMemoire,
} from "@/providers/outils";
import type { Fournisseurs } from "@/providers/types";

export const DELAI_FOURNISSEUR_MS = 8_000;

export interface OptionsContexte {
  maintenant?: Date;
  plafondEur?: number;
  cache?: CacheMemoire;
  delaiMs?: number;
  /** Coût d'un appel par fournisseur (euros) ; 0 pour les simulations. */
  couts?: Record<string, number>;
}

export class Contexte {
  readonly maintenant: Date;
  readonly compteur: CompteurCout;
  readonly enEchec = new Set<string>();
  private cache: CacheMemoire;
  private delaiMs: number;
  private couts: Record<string, number>;

  constructor(
    readonly fournisseurs: Fournisseurs,
    opts: OptionsContexte = {},
  ) {
    this.maintenant = opts.maintenant ?? new Date();
    this.compteur = new CompteurCout(opts.plafondEur ?? plafondCoutParDefaut());
    this.cache = opts.cache ?? cacheGlobal;
    this.delaiMs = opts.delaiMs ?? DELAI_FOURNISSEUR_MS;
    this.couts = opts.couts ?? {};
  }

  /**
   * Appelle un fournisseur. En cas d'échec (erreur, délai dépassé, plafond de coût atteint),
   * renvoie `secours` et note le fournisseur : la recherche continue sans lui.
   */
  async appeler<T>(nom: string, cle: string, dureeCacheMs: number, fn: () => Promise<T>, secours: T): Promise<T> {
    try {
      return await this.cache.obtenir(`${nom}|${cle}`, dureeCacheMs, async () => {
        if (!this.compteur.reserver(nom, this.couts[nom] ?? 0)) {
          throw new Error("plafond de coût de la recherche atteint");
        }
        return avecReessais(() => avecDelai(fn(), this.delaiMs, nom), 2);
      });
    } catch (e) {
      this.enEchec.add(nom);
      journal("avertissement", "fournisseur en échec", { fournisseur: nom, erreur: String(e) });
      return secours;
    }
  }
}
