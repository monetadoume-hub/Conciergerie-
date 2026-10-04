// Pipeline de recherche (cahier des charges §4) :
//  1 validation (route) → 2 compréhension → 3 candidates → 4 météo → 5 transports → 6 hébergements
//  → 7 activités → 8 formules → 9 score → 10 rédaction.
// Chaque proposition est émise dès qu'elle est prête ; le classement final arrive à la fin.

import { DESTINATIONS, type Destination } from "@/donnees/destinations";
import { CENTRE_FRANCE, VILLES } from "@/donnees/villes";
import type { Demande } from "@/lib/demande";
import { normaliser } from "@/lib/texte";
import { DUREES_CACHE, journal } from "@/providers/outils";
import type { Fournisseurs } from "@/providers/types";
import { selectionnerCandidates } from "./candidats";
import { comprendre, type Criteres } from "./comprehension";
import { Contexte, type OptionsContexte } from "./contexte";
import { budgetTotal, composerFormules, formuleDeReference } from "./formules";
import { chercherActivites, chercherHebergements, etapesDuVoyage, lieuxDeSejour, TYPES_INSOLITES } from "./hebergements";
import { choisirPeriode } from "./meteo";
import { accroche, compromis, refusEvites, reponses } from "./redaction";
import { calculerScore, POINTS, refusPresents, satisfaction, scoreTotal } from "./score";
import { construireTrajets, trajetEstime, type Depart } from "./transports";
import type { Evenement, MetaRecherche, Proposition } from "./types";

export const NB_PROPOSITIONS = 4;

export interface OptionsRecherche extends OptionsContexte {
  fournisseurs: Fournisseurs;
  emettre?: (e: Evenement) => void;
  signal?: AbortSignal;
}

async function localiserDepart(ctx: Contexte, d: Demande): Promise<Depart> {
  const geo = ctx.fournisseurs.geo;
  const lieux = await ctx.appeler(geo.nom, `geocode${normaliser(d.depart.lieu)}`, DUREES_CACHE.lieux, () => geo.geocode(d.depart.lieu), []);
  const place = lieux[0];
  if (!place) return { place: CENTRE_FRANCE, reconnu: false, rayonKm: Math.max(d.depart.rayonKm, 150) };
  const ville = VILLES.find((v) => normaliser(v.nom) === normaliser(place.nom));
  return { place, ville, reconnu: true, rayonKm: d.depart.rayonKm };
}

async function evaluerDestination(
  ctx: Contexte,
  dest: Destination,
  d: Demande,
  criteres: Criteres,
  depart: Depart,
): Promise<Proposition | { exclue: string }> {
  const choix = await choisirPeriode(dest, d, criteres, ctx.fournisseurs.meteo, ctx.maintenant);
  if (!choix) return { exclue: "pas de données météo pour cette destination" };
  const { periode } = choix;

  const sejours = lieuxDeSejour(dest, d, periode);
  const itinerant = d.type === "roadtrip" || d.type === "velo";
  const [rt, hebergements, activites, etapes] = await Promise.all([
    construireTrajets(ctx, depart, dest, periode, d, criteres),
    chercherHebergements(ctx, sejours, d, criteres, periode),
    chercherActivites(ctx, dest, d, criteres, periode),
    itinerant ? etapesDuVoyage(ctx, sejours, d.type === "velo" ? "velo" : "voiture") : Promise.resolve(undefined),
  ]);

  let trajets = rt.trajets;
  if (trajets.length === 0) {
    const f = ctx.fournisseurs;
    const transporteurs = [...f.vols, ...f.trains, ...f.bus, ...f.covoiturage, ...f.ferries].map((p) => p.nom);
    // Filet de secours : si les fournisseurs n'ont pas répondu, on estime au lieu d'exclure.
    if (transporteurs.some((n) => ctx.enEchec.has(n))) trajets = [trajetEstime(dest, d, ctx)];
    else return { exclue: rt.raison ?? "aucun trajet possible" };
  }

  const formules = composerFormules({ dest, d, criteres, periode, trajets, hebergements, activites, etapes, ctx });
  const reference = formuleDeReference(formules);
  const enviesActivites = new Set([...activites.payantes, ...activites.libres].flatMap((a) => (a.insolite ? [...a.envies, "insolite"] : a.envies)));
  if (hebergements.some((h) => h.offres.some((o) => TYPES_INSOLITES.includes(o.type)))) enviesActivites.add("insolite");
  const sat = satisfaction(dest, criteres, choix.meteo.climat, enviesActivites);
  const refus = refusPresents(dest, criteres);
  const budget = budgetTotal(d);
  const { detail, score, pourquoi } = calculerScore({
    satisfaction: sat,
    meteo: choix.evaluation,
    reference,
    budget,
    plafond: budget * (1 + d.budget.depassement / 100),
    trajetMin: Math.min(...trajets.map((t) => t.dureeMin)),
    refus,
    foule: criteres.eviterFoule && choix.affluence === 3,
  });

  const toutesActivites = formules.flatMap((f) => f.activites);
  const natures = formules.map((f) => f.total.nature);
  return {
    id: dest.id,
    destination: dest.nom,
    pays: dest.pays,
    score,
    detailScore: detail,
    satisfaction: sat.map((s) => ({ prenom: s.prenom, avatar: s.avatar, envies: s.servies.length, sur: s.servies.length + s.manquees.length })),
    meteo: choix.meteo,
    periode,
    reponses: reponses(sat, dest, choix.meteo.climat, toutesActivites),
    refusEvites: refusEvites(dest, criteres, choix.meteo.climat, choix.affluence, periode.mois),
    compromis: compromis(sat, refus, choix.evaluation.refusTouches, dest),
    accroche: accroche(dest, sat, reference.dansLaMarge),
    etapes,
    formules,
    pourquoi,
    donnees: natures.includes("simulation") ? "simulation" : natures.includes("estimation") ? "estimation" : "reel",
  };
}

/** Choix final : meilleur score, avec un bonus de diversité (pays et ambiance différents). */
export function choisirAvecDiversite(propositions: Proposition[], dominante: (id: string) => string, n = NB_PROPOSITIONS): Proposition[] {
  const restantes = [...propositions];
  const choisies: Proposition[] = [];
  while (choisies.length < n && restantes.length > 0) {
    const bonus = (p: Proposition) => {
      if (choisies.length === 0) return POINTS.diversite;
      const nouveauPays = !choisies.some((c) => c.pays === p.pays);
      const nouvelleAmbiance = !choisies.some((c) => dominante(c.id) === dominante(p.id));
      return (nouveauPays ? POINTS.diversite / 2 : 0) + (nouvelleAmbiance ? POINTS.diversite / 2 : 0);
    };
    restantes.sort((a, b) => b.score + bonus(b) - (a.score + bonus(a)));
    const p = restantes.shift()!;
    const detailScore = { ...p.detailScore, diversite: bonus(p) };
    const pourquoi = [...p.pourquoi, `Diversité de la sélection : ${detailScore.diversite}/${POINTS.diversite}.`];
    choisies.push({ ...p, detailScore, score: scoreTotal(detailScore), pourquoi });
  }
  return choisies.sort((a, b) => b.score - a.score);
}

export async function rechercher(d: Demande, opts: OptionsRecherche): Promise<{ propositions: Proposition[]; meta: MetaRecherche }> {
  const debut = Date.now();
  const ctx = new Contexte(opts.fournisseurs, opts);
  const emettre = (e: Evenement) => {
    if (!opts.signal?.aborted) opts.emettre?.(e);
  };

  emettre({ type: "etape", texte: "On lit les envies de chacun…" });
  const criteres = comprendre(d);

  const depart = await localiserDepart(ctx, d);
  emettre({
    type: "etape",
    texte: depart.reconnu ? `Départ : ${depart.place.nom}.` : `« ${d.depart.lieu} » n'est pas encore dans notre carte : on part du centre de la France.`,
  });

  const { candidates, exclues } = selectionnerCandidates(d, criteres, ctx.maintenant);
  emettre({ type: "etape", texte: `${candidates.length} destinations présélectionnées sur ${DESTINATIONS.length}, selon vos envies, vos refus et vos contraintes.` });
  emettre({
    type: "etape",
    texte: d.dates.mode === "auMieux" ? "On cherche la meilleure période sur les 12 prochains mois…" : "On vérifie la météo à vos dates…",
  });
  emettre({ type: "etape", texte: "On compare toutes les façons d'y aller, les hébergements et les activités…" });

  const propositions: Proposition[] = [];
  await Promise.all(
    candidates.map(async (dest) => {
      if (opts.signal?.aborted) return;
      try {
        const r = await evaluerDestination(ctx, dest, d, criteres, depart);
        if ("exclue" in r) exclues.push({ destination: dest.nom, raison: r.exclue });
        else {
          propositions.push(r);
          emettre({ type: "proposition", proposition: r });
        }
      } catch (e) {
        journal("erreur", "destination non évaluée", { destination: dest.id, erreur: String(e) });
        exclues.push({ destination: dest.nom, raison: "erreur interne pendant l'évaluation" });
      }
    }),
  );

  const dominante = (id: string) => candidates.find((c) => c.id === id)?.tagsForts[0] ?? id;
  const finales = choisirAvecDiversite(propositions, dominante);
  const meta: MetaRecherche = {
    genereLe: ctx.maintenant.toISOString(),
    dureeMs: Date.now() - debut,
    cout: { depenseEur: Math.round(ctx.compteur.depense * 1000) / 1000, plafondEur: ctx.compteur.plafond },
    fournisseursEnEchec: [...ctx.enEchec],
    depart: { nom: depart.place.nom, reconnu: depart.reconnu },
    compris: criteres.compris,
    exclues,
  };
  journal("info", "recherche terminée", {
    dureeMs: meta.dureeMs,
    coutEur: meta.cout.depenseEur,
    propositions: finales.length,
    enEchec: meta.fournisseursEnEchec,
  });
  emettre({ type: "fin", propositions: finales, meta });
  return { propositions: finales, meta };
}
