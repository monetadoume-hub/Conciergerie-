// Étape 8 du pipeline : assembler 4 formules par destination, en respectant le budget
// ou en signalant clairement le dépassement.

import type { Destination } from "@/donnees/destinations";
import type { Demande } from "@/lib/demande";
import { formatDuree } from "@/lib/texte";
import { equivalentsAdultes, nbPersonnes } from "@/providers/outils";
import type { ActivityOffer, LodgingOffer, Nature, Poi, PriceQuote } from "@/providers/types";
import type { Criteres } from "./comprehension";
import type { Contexte } from "./contexte";
import { equipementsSouhaites, TYPES_INSOLITES, typesReves, type ActivitesTrouvees, type HebergementsParLieu } from "./hebergements";
import { COUT_VOITURE_KM } from "./transports";
import type { Activite, Etape, Formule, NomFormule, Periode, Poste, Sejour, Trajet } from "./types";

const CALCUL = "Calcul Rêverie (estimation)";
const ACTIVITES_PAR_JOUR = { tranquille: 1, equilibre: 2, intense: 3 } as const;
/** Repas sur place, par adulte et par jour (moyenne française). */
const REPAS_PAR_JOUR: Record<NomFormule, number> = { economique: 22, equilibree: 32, confort: 50, insolite: 35 };

export function budgetTotal(d: Demande): number {
  return d.budget.par === "groupe" ? d.budget.montant : d.budget.montant * (d.adultes + d.enfants);
}

export function sommer(quotes: PriceQuote[], provider = "Rêverie (total)"): PriceQuote {
  const natures = quotes.map((q) => q.nature);
  const nature: Nature = natures.includes("simulation") ? "simulation" : natures.includes("estimation") ? "estimation" : "reel";
  return {
    amount: Math.round(quotes.reduce((t, q) => t + q.amount, 0)),
    currency: "EUR",
    observedAt: quotes.map((q) => q.observedAt).sort().at(-1) ?? new Date(0).toISOString(),
    provider,
    nature,
  };
}

interface Entrees {
  dest: Destination;
  d: Demande;
  criteres: Criteres;
  periode: Periode;
  trajets: Trajet[];
  hebergements: HebergementsParLieu[];
  activites: ActivitesTrouvees;
  etapes?: Etape[];
  ctx: Contexte;
}

// ——— Choix du trajet ———

function choisirTrajet(nom: NomFormule, trajets: Trajet[], c: Criteres, personnes: number): Trajet {
  const carbone = (t: Trajet) => (c.basCarbone ? t.co2Kg * 1.5 : 0);
  const min = (f: (t: Trajet) => number, liste = trajets) => [...liste].sort((a, b) => f(a) - f(b))[0];
  const valeur = (t: Trajet) => t.prix.amount + (t.dureeMin / 60) * 10 * personnes + t.correspondances * 20 + carbone(t);
  switch (nom) {
    case "economique":
      return min((t) => t.prix.amount + carbone(t));
    case "equilibree":
      return min(valeur);
    case "confort":
      return min((t) => t.dureeMin + t.correspondances * 60 - t.confort * 30 + (c.basCarbone ? t.co2Kg / 5 : 0));
    case "insolite": {
      // Le voyage fait partie de l'aventure : train de nuit, ferry…
      const lents = trajets.filter((t) => t.nuit || t.segments.some((s) => s.mode === "ferry" || s.mode === "train"));
      return lents.length > 0 ? min(valeur, lents) : min(valeur);
    }
  }
}

// ——— Choix de l'hébergement ———

function choisirHebergement(nom: NomFormule, offres: LodgingOffer[], souhaites: string[], c: Criteres, personnes: number, nuits: number): { offre: LodgingOffer; insoliteTrouve: boolean } | null {
  if (offres.length === 0) return null;
  const atouts = (o: LodgingOffer) => souhaites.filter((e) => o.equipements.includes(e)).length;
  const parNuitParPers = (o: LodgingOffer) => o.prix.amount / Math.max(1, nuits) / personnes;
  const tri = (f: (o: LodgingOffer) => number, liste = offres) => [...liste].sort((a, b) => f(a) - f(b))[0];

  switch (nom) {
    case "economique":
      return { offre: tri((o) => o.prix.amount - o.note), insoliteTrouve: false };
    case "equilibree":
      return { offre: tri((o) => parNuitParPers(o) * (9 / o.note) - atouts(o) * 4), insoliteTrouve: false };
    case "confort":
      return { offre: tri((o) => -(o.note + (o.etoiles ?? (o.type === "resort" ? 4.5 : 3)) * 0.6 + atouts(o) * 0.4)), insoliteTrouve: false };
    case "insolite": {
      const reves = offres.filter((o) => typesReves(c).includes(o.type));
      const insolites = offres.filter((o) => TYPES_INSOLITES.includes(o.type));
      const liste = reves.length > 0 ? reves : insolites;
      if (liste.length === 0) return { offre: tri((o) => parNuitParPers(o) * (9 / o.note) - atouts(o) * 4), insoliteTrouve: false };
      return { offre: tri((o) => -o.note + parNuitParPers(o) / 100, liste), insoliteTrouve: true };
    }
  }
}

// ——— Choix des activités ———

type Candidate = { id: string; nom: string; envies: string[]; insolite: boolean; prix: PriceQuote | null; ageMin: number };

function pertinence(a: { envies: string[] }, c: Criteres): number {
  let p = 0;
  for (const v of c.voyageurs) for (const e of a.envies) p += v.envies.get(e) ?? 0;
  return p;
}

function choisirActivites(nom: NomFormule, act: ActivitesTrouvees, c: Criteres, d: Demande, nuits: number): Activite[] {
  const candidates: Candidate[] = [
    ...act.libres.map((p: Poi) => ({ id: p.id, nom: p.nom, envies: p.envies, insolite: p.insolite, prix: null, ageMin: 0 })),
    ...act.payantes.map((a: ActivityOffer) => ({ id: a.id, nom: a.nom, envies: a.envies, insolite: a.insolite, prix: a.prix, ageMin: a.ageMin })),
  ];
  const max = Math.max(1, Math.min(ACTIVITES_PAR_JOUR[d.rythme] * nuits, 8));
  const utiles = candidates.filter((a) => pertinence(a, c) > 0);
  const parPertinence = (l: Candidate[]) => [...l].sort((a, b) => pertinence(b, c) - pertinence(a, c) || (a.prix?.amount ?? 0) - (b.prix?.amount ?? 0));

  let choix: Candidate[];
  switch (nom) {
    case "economique": {
      const libres = parPertinence(utiles.filter((a) => !a.prix));
      const payante = parPertinence(utiles.filter((a) => a.prix))[0];
      choix = [...libres, ...(payante ? [payante] : [])];
      break;
    }
    case "equilibree":
    case "confort":
      choix = parPertinence(utiles);
      break;
    case "insolite":
      choix = [...parPertinence(candidates.filter((a) => a.insolite)), ...parPertinence(utiles.filter((a) => !a.insolite))];
      break;
  }
  // L'équilibrée garde au plus la moitié d'activités payantes ; le confort les prend toutes.
  if (nom === "equilibree") {
    const payantes = choix.filter((a) => a.prix);
    const garder = new Set(payantes.slice(0, Math.max(2, Math.ceil(max / 2))).map((a) => a.id));
    choix = choix.filter((a) => !a.prix || garder.has(a.id));
  }

  return choix.slice(0, max).map((a) => ({
    id: a.id,
    nom: a.ageMin > 0 && d.agesEnfants.some((x) => x < a.ageMin) ? `${a.nom} (dès ${a.ageMin} ans)` : a.nom,
    envies: a.envies,
    insolite: a.insolite,
    prix: a.prix,
    pourQui: c.voyageurs.filter((v) => a.envies.some((e) => v.envies.has(e))).map((v) => v.prenom),
  }));
}

// ——— Assemblage ———

export function composerFormules(e: Entrees): Formule[] {
  const { dest, d, criteres, periode, ctx } = e;
  const personnes = nbPersonnes({ adultes: d.adultes, agesEnfants: d.agesEnfants });
  const equiv = equivalentsAdultes({ adultes: d.adultes, agesEnfants: d.agesEnfants });
  const souhaites = equipementsSouhaites(d);
  const budget = budgetTotal(d);
  const plafond = budget * (1 + d.budget.depassement / 100);
  const estimation = (montant: number): PriceQuote => ({
    amount: Math.round(montant),
    currency: "EUR",
    observedAt: ctx.maintenant.toISOString(),
    provider: CALCUL,
    nature: "estimation",
  });

  // Road trip : carburant entre les étapes (pas pour le vélo).
  const kmEtapes = (e.etapes ?? []).reduce((t, x) => t + (x.depuisPrecedente?.mode === "voiture" ? x.depuisPrecedente.distanceKm : 0), 0);

  return (["economique", "equilibree", "confort", "insolite"] as NomFormule[]).map((nom) => {
    const notes: string[] = [];
    const trajet = choisirTrajet(nom, e.trajets, criteres, personnes);

    const activites = choisirActivites(nom, e.activites, criteres, d, periode.nuits);
    const repas = d.budget.inclut.includes("repas") ? estimation(REPAS_PAR_JOUR[nom] * dest.indicePrix * equiv * periode.nuits) : undefined;

    // Confort : le plus confortable QUI TIENT dans le budget (ce qui reste après les autres postes).
    const autresPostes =
      (d.budget.inclut.includes("transport") ? trajet.prix.amount + kmEtapes * COUT_VOITURE_KM : 0) +
      (d.budget.inclut.includes("activites") ? activites.reduce((t, a) => t + (a.prix?.amount ?? 0), 0) : 0) +
      (repas?.amount ?? 0);
    const resteHebergement = d.budget.inclut.includes("hebergement") ? plafond - autresPostes : Infinity;

    const sejours: Sejour[] = e.hebergements.map(({ lieu, offres: toutes }) => {
      // Seule la formule Insolite peut proposer un type rêvé qui n'était pas coché.
      let offres = nom === "insolite" ? toutes : toutes.filter((o) => d.hebergements.types.includes(o.type));
      if (nom === "confort") {
        const part = (resteHebergement * lieu.nuits) / Math.max(1, periode.nuits);
        const abordables = offres.filter((o) => o.prix.amount <= part);
        if (abordables.length > 0) offres = abordables;
        else if (offres.length > 0) notes.push(`À ${lieu.lieu.nom}, aucun hébergement confortable ne tient dans le budget.`);
      }
      const choix = choisirHebergement(nom, offres, souhaites, criteres, personnes, lieu.nuits);
      const offre: LodgingOffer = choix?.offre ?? {
        id: `estime-${lieu.lieu.nom}`,
        nom: "Hébergement estimé (aucune offre trouvée)",
        type: "estimation",
        unites: 1,
        equipements: [],
        note: 0,
        prix: estimation(dest.estimationNuitParAdulte * 0.6 * lieu.nuits * equiv),
      };
      if (!choix) notes.push(`À ${lieu.lieu.nom}, aucune offre ne correspond : montant estimé.`);
      if (nom === "insolite" && choix && !choix.insoliteTrouve) {
        notes.push(`Pas d'hébergement insolite disponible parmi vos choix à ${lieu.lieu.nom}.`);
      }
      if (choix && !d.hebergements.types.includes(choix.offre.type)) {
        notes.push(`« ${choix.offre.nom} » : type ajouté parce que vous en rêvez dans votre texte.`);
      }
      return {
        lieu: lieu.lieu.nom,
        nuits: lieu.nuits,
        hebergement: offre,
        equipementsOk: souhaites.filter((x) => offre.equipements.includes(x)),
        equipementsManquants: souhaites.filter((x) => !offre.equipements.includes(x)),
      };
    });

    // Postes de dépense.
    const transportQuotes = [trajet.prix];
    if (kmEtapes > 0) {
      transportQuotes.push(estimation(kmEtapes * COUT_VOITURE_KM));
      notes.push(`Carburant entre les étapes (${kmEtapes} km) : estimation.`);
    }
    const detail: Partial<Record<Poste, PriceQuote>> = {
      transport: sommer(transportQuotes, trajet.prix.provider),
      hebergement: sommer(sejours.map((s) => s.hebergement.prix), sejours.map((s) => s.hebergement.prix.provider).join(" + ")),
      activites: sommer(activites.flatMap((a) => (a.prix ? [a.prix] : [])), "Activités"),
    };
    if (repas) detail.repas = repas;
    if (detail.activites!.amount === 0) detail.activites = { ...detail.activites!, nature: "estimation", provider: "Visites libres" };

    const postes = Object.entries(detail) as [Poste, PriceQuote][];
    const total = sommer(postes.map(([, q]) => q));
    const totalBudget = Math.round(postes.filter(([p]) => d.budget.inclut.includes(p)).reduce((t, [, q]) => t + q.amount, 0));
    const horsBudget = postes.filter(([p]) => !d.budget.inclut.includes(p)).map(([p]) => p);
    if (horsBudget.length > 0) notes.push(`Non compté dans votre budget : ${horsBudget.join(", ")}.`);
    if (trajet.segments.some((s) => s.prix.nature === "estimation")) notes.push("Accès, transferts et trajets en voiture : estimations Rêverie.");
    if (trajet.location) notes.push(`Location incluse : ${trajet.location.description}.`);

    const dansLeBudget = totalBudget <= budget;
    const dansLaMarge = totalBudget <= plafond;
    if (!dansLaMarge) notes.push(`Dépasse votre budget de ${Math.round(((totalBudget - budget) / budget) * 100)} %.`);

    return {
      nom,
      trajet,
      sejours,
      activites,
      total,
      detail,
      totalBudget,
      dansLeBudget,
      dansLaMarge,
      dureeMin: trajet.dureeMin,
      dureePorteAPorte: trajet.dureeMin > 0 ? formatDuree(trajet.dureeMin) : "non calculée",
      co2Kg: Math.round(trajet.co2Kg + kmEtapes * 0.2),
      notes,
    };
  });
}

/** Formule de référence pour le score : la moins chère qui tient dans la marge, sinon l'économique. */
export function formuleDeReference(formules: Formule[]): Formule {
  const ordre: NomFormule[] = ["equilibree", "economique", "insolite", "confort"];
  for (const n of ordre) {
    const f = formules.find((x) => x.nom === n);
    if (f?.dansLaMarge) return f;
  }
  return formules.find((x) => x.nom === "economique")!;
}
