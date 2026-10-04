// Étape 5 du pipeline : construire les trajets porte à porte, puis demander les prix aux fournisseurs.
// Un trajet = un ou plusieurs segments enchaînés (ex. train + ferry + voiture de location).

import type { Destination, Lieu } from "@/donnees/destinations";
import { VILLES, type Ville } from "@/donnees/villes";
import type { Demande } from "@/lib/demande";
import { DUREES_CACHE, distanceKm, nbPersonnes } from "@/providers/outils";
import { CO2_KG_PAR_KM } from "@/providers/mock/transports";
import type { Passagers, Place, PriceQuote, RentalOffer, TransportOffer } from "@/providers/types";
import type { Criteres } from "./comprehension";
import type { Contexte } from "./contexte";
import type { Periode, Trajet } from "./types";

export interface Depart {
  place: Place;
  ville?: Ville;
  reconnu: boolean;
  rayonKm: number;
}

const CALCUL = "Calcul Rêverie (estimation)";
/** Carburant et péages, par km et par voiture. */
export const COUT_VOITURE_KM = 0.2;
/** Taxi ou navette, par km, pour le groupe. */
const COUT_TAXI_KM = 1.6;

const estimation = (montant: number, ctx: Contexte): PriceQuote => ({
  amount: Math.round(montant),
  currency: "EUR",
  observedAt: ctx.maintenant.toISOString(),
  provider: CALCUL,
  nature: "estimation",
});

const place = (l: Lieu): Place => ({ nom: l.nom, lat: l.lat, lon: l.lon });

/** Segment en voiture calculé par Rêverie (sa voiture, taxi ou trajet d'accès). */
async function segmentRoute(
  ctx: Contexte,
  de: Place,
  vers: Place,
  passagers: Passagers,
  genre: "voiture" | "taxi" | "acces",
  compterCout = true,
): Promise<TransportOffer> {
  const route = await ctx.appeler(
    ctx.fournisseurs.geo.nom,
    `route${de.nom}${vers.nom}`,
    DUREES_CACHE.lieux,
    () => ctx.fournisseurs.geo.route(de, vers, "voiture"),
    { mode: "voiture" as const, distanceKm: Math.round(distanceKm(de, vers) * 1.3), dureeMin: Math.round(distanceKm(de, vers) * 1.3), source: CALCUL },
  );
  const km = route.distanceKm;
  // Une pause de 15 min toutes les 2 h de conduite.
  const pauses = genre === "voiture" ? Math.floor(route.dureeMin / 120) * 15 : 0;
  const cout = !compterCout ? 0 : genre === "taxi" ? Math.max(30, km * COUT_TAXI_KM) * 2 : km * COUT_VOITURE_KM * 2;
  const libelle = genre === "taxi" ? "Taxi ou navette" : genre === "acces" ? "Accès" : "En voiture";
  return {
    id: `${genre}-${de.nom}-${vers.nom}`,
    mode: "voiture",
    de: de.nom,
    vers: vers.nom,
    dureeMin: route.dureeMin + pauses,
    correspondances: 0,
    nuit: false,
    co2Kg: Math.round(CO2_KG_PAR_KM.voiture * km * 2 * (genre === "taxi" ? 1 : 1)),
    confort: 2,
    prix: estimation(cout, ctx),
    resume: `${libelle} ${de.nom} → ${vers.nom} (${km} km)`,
  };
}

/** Villes de départ possibles pour un type de point d'accès, dans le rayon accepté. */
function hubsDepart(depart: Depart, critere: (v: Ville) => boolean): Ville[] {
  const rayon = Math.max(depart.rayonKm, 5);
  return VILLES.filter(critere)
    .map((v) => ({ v, km: distanceKm(depart.place, v) }))
    .filter((x) => x.km <= rayon)
    .sort((a, b) => a.km - b.km)
    .map((x) => x.v);
}

function assembler(segments: TransportOffer[], location?: RentalOffer): Omit<Trajet, "id"> {
  const principaux = segments.filter((s) => s.prix.provider !== CALCUL || s.mode !== "voiture");
  const montant = segments.reduce((t, s) => t + s.prix.amount, 0) + (location?.prix.amount ?? 0);
  const natures = [...segments.map((s) => s.prix.nature), ...(location ? [location.prix.nature] : [])];
  const observe = [...segments.map((s) => s.prix.observedAt), ...(location ? [location.prix.observedAt] : [])].sort().at(-1)!;
  return {
    segments,
    location,
    prix: {
      amount: Math.round(montant),
      currency: "EUR",
      observedAt: observe,
      provider: [...new Set([...segments.map((s) => s.prix.provider), ...(location ? [location.prix.provider] : [])])].join(" + "),
      nature: natures.includes("simulation") ? "simulation" : natures.includes("estimation") ? "estimation" : "reel",
    },
    dureeMin: segments.reduce((t, s) => t + s.dureeMin, 0),
    correspondances: segments.reduce((t, s) => t + s.correspondances, 0) + Math.max(0, principaux.length - 1),
    co2Kg: segments.reduce((t, s) => t + s.co2Kg, 0),
    nuit: segments.some((s) => s.nuit),
    confort: Math.min(...segments.map((s) => s.confort)) as 1 | 2 | 3,
    resume: segments.map((s) => s.resume).join(" · "),
  };
}

export interface ResultatTrajets {
  trajets: Trajet[];
  /** Raison lisible si aucun trajet ne convient. */
  raison?: string;
}

export async function construireTrajets(
  ctx: Contexte,
  depart: Depart,
  dest: Destination,
  periode: Periode,
  d: Demande,
  criteres: Criteres,
): Promise<ResultatTrajets> {
  const f = ctx.fournisseurs;
  const modes = criteres.modes;
  const passagers: Passagers = { adultes: d.adultes, agesEnfants: d.agesEnfants };
  const date = periode.aller;
  const jours = periode.nuits + 1;
  const roadtrip = d.type === "roadtrip";
  const itinerantVelo = d.type === "velo";
  const aSaVoiture = modes.has("ma_voiture") || modes.has("van");
  const centre = place(dest.centre);
  const q = (de: Place, vers: Place) => ({ de, vers, date, passagers, nuit: criteres.nuit });
  const cle = (nom: string, de: Place, vers: Place) => `${nom}${de.nom}${vers.nom}${date}${d.adultes}${d.agesEnfants.join()}`;

  const chercher = async <T extends { nom: string }>(liste: T[], de: Place, vers: Place, fn: (p: T) => Promise<TransportOffer[]>) =>
    (await Promise.all(liste.map((p) => ctx.appeler(p.nom, cle(p.nom, de, vers), DUREES_CACHE.prix, () => fn(p), [])))).flat();

  /** Location de voiture pour tout le séjour. */
  const louerVoiture = async (lieu: Place): Promise<RentalOffer | undefined> => {
    const offres = (
      await Promise.all(
        f.locationVoiture.map((p) =>
          ctx.appeler(p.nom, `loc${lieu.nom}${date}${jours}`, DUREES_CACHE.prix, () => p.search({ lieu, du: date, jours, passagers }), []),
        ),
      )
    ).flat();
    return offres.sort((a, b) => a.prix.amount - b.prix.amount)[0];
  };

  const louerVelos = async (lieu: Place): Promise<RentalOffer | undefined> => {
    const offres = (
      await Promise.all(
        f.velos.map((p) => ctx.appeler(p.nom, `velos${lieu.nom}${date}${jours}`, DUREES_CACHE.prix, () => p.rentals({ lieu, du: date, jours, passagers }), [])),
      )
    ).flat();
    return offres.sort((a, b) => a.prix.amount - b.prix.amount)[0];
  };

  /** Du point d'arrivée (aéroport, gare, port) au centre : location si acceptée, sinon taxi. */
  const finDeParcours = async (hub: Place): Promise<{ segments: TransportOffer[]; location?: RentalOffer }> => {
    const loin = distanceKm(hub, centre) > 3;
    if (modes.has("location") && (loin || roadtrip)) {
      const location = await louerVoiture(hub);
      if (location) {
        return { segments: loin ? [await segmentRoute(ctx, hub, centre, passagers, "voiture", false)] : [], location };
      }
    }
    return { segments: loin ? [await segmentRoute(ctx, hub, centre, passagers, "taxi")] : [] };
  };

  /** Accès depuis le domicile jusqu'au point de départ (aéroport, gare, port). */
  const acces = async (hub: Ville): Promise<TransportOffer[]> =>
    distanceKm(depart.place, hub) > 3 ? [await segmentRoute(ctx, depart.place, hub, passagers, "acces")] : [];

  const brouillons: Promise<Omit<Trajet, "id"> | null>[] = [];

  // 1. Avion (+ transfert ou location).
  if (modes.has("avion")) {
    const hub = hubsDepart(depart, (v) => v.aeroport)[0];
    if (hub) {
      const aeroport = place(dest.aeroport);
      brouillons.push(
        (async () => {
          const vols = (await chercher(f.vols, hub, aeroport, (p) => p.search(q(hub, aeroport)))).sort((a, b) => a.prix.amount - b.prix.amount);
          if (vols.length === 0) return null;
          const [debut, fin] = await Promise.all([acces(hub), finDeParcours(aeroport)]);
          return vols.slice(0, 2).map((v) => assembler([...debut, v, ...fin.segments], fin.location));
        })().then((x) => x?.[0] ?? null),
      );
      // Deuxième vol (souvent moins cher, avec escale) comme option distincte.
      brouillons.push(
        (async () => {
          const vols = (await chercher(f.vols, hub, aeroport, (p) => p.search(q(hub, aeroport)))).sort((a, b) => a.prix.amount - b.prix.amount);
          if (vols.length < 2) return null;
          const [debut, fin] = await Promise.all([acces(hub), finDeParcours(aeroport)]);
          return assembler([...debut, vols[1], ...fin.segments], fin.location);
        })(),
      );
    }
  }

  // 2. Train (+ transfert ou location).
  if (modes.has("train") && dest.continent && dest.gare) {
    const hub = hubsDepart(depart, () => true)[0];
    const gare = place(dest.gare);
    if (hub) {
      brouillons.push(
        (async () => {
          const trains = await chercher(f.trains, hub, gare, (p) => p.search(q(hub, gare)));
          if (trains.length === 0) return null;
          const [debut, fin] = await Promise.all([acces(hub), finDeParcours(gare)]);
          // Toutes les offres de train (jour, nuit) deviennent des trajets possibles.
          return trains.map((t) => assembler([...debut, t, ...fin.segments], fin.location));
        })().then((liste) => liste?.sort((a, b) => a.prix.amount - b.prix.amount)[0] ?? null),
      );
      if (criteres.nuit) {
        brouillons.push(
          (async () => {
            const trains = (await chercher(f.trains, hub, gare, (p) => p.search(q(hub, gare)))).filter((t) => t.nuit);
            if (trains.length === 0) return null;
            const [debut, fin] = await Promise.all([acces(hub), finDeParcours(gare)]);
            return assembler([...debut, trains[0], ...fin.segments], fin.location);
          })(),
        );
      }
    }
  }

  // 3. Autocar et 4. covoiturage, jusqu'au centre.
  for (const [mode, liste] of [["bus", f.bus], ["covoiturage", f.covoiturage]] as const) {
    if (!modes.has(mode) || !dest.continent) continue;
    brouillons.push(
      (async () => {
        const offres = (await chercher(liste, depart.place, centre, (p) => p.search(q(depart.place, centre)))).sort((a, b) => a.prix.amount - b.prix.amount);
        if (offres.length === 0) return null;
        const location = roadtrip && modes.has("location") ? await louerVoiture(centre) : undefined;
        return assembler([offres[0]], location);
      })(),
    );
  }

  // 5. Sa voiture (ou son van), directement.
  if (aSaVoiture && dest.continent) {
    brouillons.push(segmentRoute(ctx, depart.place, centre, passagers, "voiture").then((s) => assembler([s])));
  }

  // 6. Ferry : avec sa voiture, ou à pied après un train (puis location ou taxi).
  if (modes.has("ferry") && dest.ferry) {
    const arrivee = place(dest.ferry.arrivee);
    const ports = [...dest.ferry.depuis].sort((a, b) => distanceKm(depart.place, a) - distanceKm(depart.place, b));
    for (const port of ports.slice(0, 2).map(place)) {
      const ferries = (avecVehicule: boolean) =>
        Promise.all(
          f.ferries.map((p) =>
            ctx.appeler(p.nom, `${cle(p.nom, port, arrivee)}${avecVehicule}`, DUREES_CACHE.prix, () => p.search({ ...q(port, arrivee), avecVehicule }), []),
          ),
        ).then((x) => x.flat().sort((a, b) => a.prix.amount - b.prix.amount));

      if (aSaVoiture) {
        brouillons.push(
          (async () => {
            const [aller, traversees, fin] = await Promise.all([
              segmentRoute(ctx, depart.place, port, passagers, "voiture"),
              ferries(true),
              segmentRoute(ctx, arrivee, centre, passagers, "voiture"),
            ]);
            return traversees[0] ? assembler([aller, traversees[0], fin]) : null;
          })(),
        );
      }
      if (modes.has("train")) {
        brouillons.push(
          (async () => {
            const hub = hubsDepart(depart, () => true)[0];
            if (!hub) return null;
            const [trains, traversees, debut, fin] = await Promise.all([
              chercher(f.trains, hub, port, (p) => p.search(q(hub, port))),
              ferries(false),
              acces(hub),
              finDeParcours(arrivee),
            ]);
            const train = trains.filter((t) => !t.nuit).sort((a, b) => a.prix.amount - b.prix.amount)[0];
            if (!train || !traversees[0]) return null;
            return assembler([...debut, train, traversees[0], ...fin.segments], fin.location);
          })(),
        );
      }
    }
  }

  let trajets = (await Promise.all(brouillons))
    .filter((t): t is Omit<Trajet, "id"> => t !== null)
    .map((t, i) => ({ ...t, id: `${dest.id}-t${i}` }));

  // Dédoublonnage : même suite de segments = même trajet.
  const vus = new Set<string>();
  trajets = trajets.filter((t) => {
    const k = t.segments.map((s) => s.id).join("|");
    if (vus.has(k)) return false;
    vus.add(k);
    return true;
  });

  if (trajets.length === 0) {
    return { trajets, raison: "aucun des transports acceptés ne dessert cette destination" };
  }

  // Road trip : il faut une voiture sur place (la sienne ou une location).
  if (roadtrip) {
    trajets = trajets.filter((t) => t.location?.type === "voiture" || t.segments.some((s) => s.resume.startsWith("En voiture")));
    if (trajets.length === 0) return { trajets, raison: "un road trip demande une voiture (la vôtre, un van ou une location)" };
  }

  // Itinérant à vélo : ses vélos (transportables en train ou en voiture) ou une location sur place.
  if (itinerantVelo) {
    const velos = modes.has("velo_location") ? await louerVelos(centre) : undefined;
    trajets = trajets
      .map((t) => {
        if (t.location?.type === "voiture") return { ...t, location: undefined };
        return t;
      })
      .flatMap((t) => {
        const transportable = t.segments.every((s) => ["train", "voiture", "ferry"].includes(s.mode));
        if (modes.has("velo_perso") && transportable) return [t];
        if (velos) {
          const sansLoc = assembler(t.segments, velos);
          return [{ ...sansLoc, id: t.id }];
        }
        return [];
      });
    if (trajets.length === 0) return { trajets, raison: "pas de solution pour avoir des vélos sur place (cochez « Vélo de location »)" };
  }

  // Préférences de trajet.
  const avant = trajets.length;
  if (!criteres.nuit) trajets = trajets.filter((t) => !t.nuit);
  if (trajets.length === 0) return { trajets, raison: "seuls des trajets de nuit desservent cette destination" };
  if (criteres.dureeMaxH !== undefined) {
    trajets = trajets.filter((t) => t.dureeMin <= criteres.dureeMaxH! * 60);
    if (trajets.length === 0) return { trajets, raison: `aucun trajet de moins de ${criteres.dureeMaxH} h` };
  }
  if (criteres.correspondancesMax !== undefined) {
    trajets = trajets.filter((t) => t.correspondances <= criteres.correspondancesMax!);
    if (trajets.length === 0) return { trajets, raison: `aucun trajet avec ${criteres.correspondancesMax} correspondance(s) au plus` };
  }
  void avant;

  return { trajets: trajets.sort((a, b) => a.prix.amount - b.prix.amount) };
}

/** Pour les tests et le filet de secours : trajet estimé depuis la base interne. */
export function trajetEstime(dest: Destination, d: Demande, ctx: Contexte): Trajet {
  const personnes = nbPersonnes({ adultes: d.adultes, agesEnfants: d.agesEnfants });
  const montant = dest.estimationTransportParAdulte * (d.adultes + d.agesEnfants.length * 0.7);
  return {
    id: `${dest.id}-estime`,
    segments: [],
    prix: estimation(montant, ctx),
    dureeMin: 0,
    correspondances: 0,
    co2Kg: 0,
    nuit: false,
    confort: 2,
    resume: `Trajet estimé (aucun fournisseur de transport n'a répondu) pour ${personnes} personne${personnes > 1 ? "s" : ""}`,
  };
}
