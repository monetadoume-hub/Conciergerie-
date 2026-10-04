// Étapes 6 et 7 du pipeline : hébergements (par étape du voyage) et activités.

import type { Destination, Lieu } from "@/donnees/destinations";
import type { Demande } from "@/lib/demande";
import { DUREES_CACHE } from "@/providers/outils";
import type { ActivityOffer, LodgingOffer, Passagers, Poi } from "@/providers/types";
import type { Criteres } from "./comprehension";
import { enviesDuGroupe } from "./comprehension";
import type { Contexte } from "./contexte";
import type { Etape, Periode } from "./types";

export const TYPES_INSOLITES = ["cabane", "cabane_perchee", "yourte", "tipi", "bulle", "roulotte", "peniche", "glamping", "refuge"];

/** Équipements indispensables, déduits du groupe (et non de simples souhaits). */
export function equipementsObligatoires(d: Demande): string[] {
  const res: string[] = [];
  if (d.groupe.animal) res.push("animaux");
  if (d.groupe.accessibilite.includes("mobilite_reduite")) res.push("pmr");
  return res;
}

/** Équipements souhaités : ceux cochés, plus le lit bébé s'il y a un enfant de moins de 2 ans. */
export function equipementsSouhaites(d: Demande): string[] {
  const res = new Set(d.hebergements.equipements);
  if (d.agesEnfants.some((a) => a < 2)) res.add("lit_bebe");
  return [...res];
}

/** Types rêvés, élargis aux types proches (une cabane perchée introuvable → une cabane). */
export function typesReves(c: Criteres): string[] {
  const res = new Set(c.hebergementsReves);
  if (res.has("cabane_perchee")) res.add("cabane");
  if (res.has("cabane")) res.add("cabane_perchee");
  return [...res];
}

export interface LieuSejour {
  lieu: Lieu;
  nuits: number;
}

/** Où dort-on ? Un seul lieu pour un séjour, plusieurs étapes pour un road trip ou à vélo. */
export function lieuxDeSejour(dest: Destination, d: Demande, periode: Periode): LieuSejour[] {
  if (d.type !== "roadtrip" && d.type !== "velo") return [{ lieu: dest.centre, nuits: periode.nuits }];
  // 3 à 4 étapes selon la durée, au moins 2 nuits par étape quand c'est possible.
  const nbEtapes = Math.max(1, Math.min(dest.etapes.length, Math.floor(periode.nuits / 2), 4));
  const etapes = dest.etapes.slice(0, nbEtapes);
  const base = Math.floor(periode.nuits / nbEtapes);
  let reste = periode.nuits - base * nbEtapes;
  return etapes.map((lieu) => {
    const n = base + (reste > 0 ? 1 : 0);
    reste--;
    return { lieu, nuits: n };
  });
}

export async function etapesDuVoyage(ctx: Contexte, sejours: LieuSejour[], mode: "voiture" | "velo"): Promise<Etape[]> {
  const geo = ctx.fournisseurs.geo;
  return Promise.all(
    sejours.map(async (s, i) => {
      if (i === 0) return { lieu: s.lieu.nom, nuits: s.nuits };
      const prec = sejours[i - 1].lieu;
      const route = await ctx.appeler(geo.nom, `route${prec.nom}${s.lieu.nom}${mode}`, DUREES_CACHE.lieux, () => geo.route(prec, s.lieu, mode), null);
      return {
        lieu: s.lieu.nom,
        nuits: s.nuits,
        depuisPrecedente: route ? { mode, distanceKm: route.distanceKm, dureeMin: route.dureeMin } : undefined,
      };
    }),
  );
}

export interface HebergementsParLieu {
  lieu: LieuSejour;
  offres: LodgingOffer[];
}

export async function chercherHebergements(
  ctx: Contexte,
  sejours: LieuSejour[],
  d: Demande,
  criteres: Criteres,
  periode: Periode,
): Promise<HebergementsParLieu[]> {
  const passagers: Passagers = { adultes: d.adultes, agesEnfants: d.agesEnfants };
  const obligatoires = equipementsObligatoires(d);
  // Les hébergements rêvés dans le texte libre (« dormir dans une cabane perchée ») sont cherchés
  // en plus des types cochés ; la formule Insolite les signale comme ajoutés à votre demande.
  const types = [...new Set([...d.hebergements.types, ...typesReves(criteres)])];
  let arrivee = periode.aller;

  const res: HebergementsParLieu[] = [];
  for (const s of sejours) {
    const date = arrivee;
    const offres = (
      await Promise.all(
        ctx.fournisseurs.hebergements.map((p) =>
          ctx.appeler(
            p.nom,
            `heb${s.lieu.nom}${date}${s.nuits}${d.adultes}${d.agesEnfants.join()}${types.join()}${d.hebergements.etoilesMin}${d.hebergements.etoilesMax}`,
            DUREES_CACHE.prix,
            () =>
              p.search({
                lieu: { nom: s.lieu.nom, lat: s.lieu.lat, lon: s.lieu.lon },
                arrivee: date,
                nuits: s.nuits,
                passagers,
                types,
                etoilesMin: d.hebergements.etoilesMin,
                etoilesMax: d.hebergements.etoilesMax,
                equipements: d.hebergements.equipements,
              }),
            [],
          ),
        ),
      )
    )
      .flat()
      .filter((o) => obligatoires.every((e) => o.equipements.includes(e)));
    res.push({ lieu: s, offres });
    arrivee = new Date(Date.parse(arrivee) + s.nuits * 86_400_000).toISOString().slice(0, 10);
  }
  return res;
}

export interface ActivitesTrouvees {
  payantes: ActivityOffer[];
  libres: Poi[];
}

export async function chercherActivites(ctx: Contexte, dest: Destination, d: Demande, criteres: Criteres, periode: Periode): Promise<ActivitesTrouvees> {
  const interets = [...enviesDuGroupe(criteres).keys()];
  const passagers: Passagers = { adultes: d.adultes, agesEnfants: d.agesEnfants };
  const f = ctx.fournisseurs;
  const [payantes, libres] = await Promise.all([
    Promise.all(
      f.activites.map((p) =>
        ctx.appeler(
          p.nom,
          `act${dest.id}${periode.aller}${d.adultes}${d.agesEnfants.join()}`,
          DUREES_CACHE.prix,
          () => p.search({ lieu: { nom: dest.centre.nom, lat: dest.centre.lat, lon: dest.centre.lon }, destinationId: dest.id, interets, date: periode.aller, passagers }),
          [],
        ),
      ),
    ),
    Promise.all(
      f.lieux.map((p) =>
        ctx.appeler(p.nom, `poi${dest.id}`, DUREES_CACHE.lieux, () => p.attractions(dest.id, dest.centre.lat, dest.centre.lon, interets), []),
      ),
    ),
  ]);
  // Les refus du groupe écartent les activités qui les touchent.
  const refus = new Set(criteres.voyageurs.flatMap((v) => [...v.refus]));
  const sansRefus = <T extends { envies: string[] }>(l: T[]) => l.filter((a) => !a.envies.some((e) => refus.has(e)));
  return { payantes: sansRefus(payantes.flat()), libres: sansRefus(libres.flat()) };
}
