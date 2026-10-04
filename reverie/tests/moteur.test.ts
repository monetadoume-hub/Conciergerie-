import { describe, expect, it } from "vitest";
import type { Demande } from "@/lib/demande";
import { rechercher } from "@/moteur";
import { contrainteDure } from "@/moteur/candidats";
import { comprendre } from "@/moteur/comprehension";
import { budgetTotal } from "@/moteur/formules";
import { scoreTotal } from "@/moteur/score";
import type { Evenement } from "@/moteur/types";
import { destinationParId } from "@/donnees/destinations";
import { CacheMemoire } from "@/providers/outils";
import { creerFournisseursSimules } from "@/providers/registre";
import type { Fournisseurs } from "@/providers/types";
import { demandeValide, MAINTENANT } from "./exemples";

const fournisseurs = () => creerFournisseursSimules({ maintenant: () => MAINTENANT });
// Un cache neuf par recherche : les tests restent indépendants.
const lancer = (d: Demande, f: Fournisseurs = fournisseurs(), extra = {}) =>
  rechercher(d, { fournisseurs: f, maintenant: MAINTENANT, cache: new CacheMemoire(), ...extra });

const famille = (maj: Partial<Demande> = {}): Demande =>
  demandeValide({
    adultes: 2,
    enfants: 1,
    agesEnfants: [8],
    depart: { lieu: "Lyon", rayonKm: 50 },
    dates: { mode: "auMieux", nuitsMin: 6, nuitsMax: 8 },
    budget: { montant: 3500, par: "groupe", depassement: 10, inclut: ["transport", "hebergement", "activites", "repas"] },
    transports: { modes: ["avion", "train", "ferry", "location"], nuit: true, basCarbone: false },
    ...maj,
  });

describe("moteur v2 — recherche complète", () => {
  it("renvoie 4 propositions × 4 formules", async () => {
    const { propositions } = await lancer(famille());
    expect(propositions).toHaveLength(4);
    for (const p of propositions) {
      expect(p.formules.map((f) => f.nom)).toEqual(["economique", "equilibree", "confort", "insolite"]);
    }
  });

  it("des formules cohérentes avec le budget : total = somme des postes, drapeaux justes", async () => {
    const d = famille();
    const budget = budgetTotal(d);
    const { propositions } = await lancer(d);
    for (const p of propositions) {
      for (const f of p.formules) {
        const somme = Object.values(f.detail).reduce((t, q) => t + q!.amount, 0);
        expect(Math.abs(f.total.amount - somme)).toBeLessThanOrEqual(1);
        expect(f.dansLeBudget).toBe(f.totalBudget <= budget);
        expect(f.dansLaMarge).toBe(f.totalBudget <= budget * 1.1);
        if (!f.dansLaMarge) expect(f.notes.join(" ")).toMatch(/Dépasse votre budget/);
      }
      const eco = p.formules.find((f) => f.nom === "economique")!;
      const confort = p.formules.find((f) => f.nom === "confort")!;
      expect(eco.totalBudget).toBeLessThanOrEqual(confort.totalBudget);
    }
    // Avec un budget confortable, au moins la formule économique tient dans le budget.
    expect(propositions.every((p) => p.formules.find((f) => f.nom === "economique")!.dansLaMarge)).toBe(true);
  });

  it("signale honnêtement un budget trop serré au lieu de le cacher", async () => {
    const { propositions } = await lancer(famille({ budget: { montant: 400, par: "groupe", depassement: 0, inclut: ["transport", "hebergement"] } }));
    for (const p of propositions) {
      const eco = p.formules.find((f) => f.nom === "economique")!;
      if (!eco.dansLaMarge) expect(p.accroche).toContain("budget sera dépassé");
    }
  });

  it("chaque prix porte sa source, sa date de relevé et sa nature", async () => {
    const { propositions } = await lancer(famille());
    for (const f of propositions[0].formules) {
      for (const q of Object.values(f.detail)) {
        expect(q!.provider).toBeTruthy();
        expect(["simulation", "estimation", "reel"]).toContain(q!.nature);
        expect(Date.parse(q!.observedAt)).not.toBeNaN();
      }
    }
    expect(propositions[0].donnees).toBe("simulation");
  });

  it("un score explicable : la somme des points donne le score", async () => {
    const { propositions } = await lancer(famille());
    for (const p of propositions) {
      expect(scoreTotal(p.detailScore)).toBe(p.score);
      expect(p.pourquoi.some((l) => l.startsWith("Envies du groupe"))).toBe(true);
      expect(p.pourquoi.some((l) => l.startsWith("Budget"))).toBe(true);
      expect(p.pourquoi.some((l) => l.startsWith("Diversité"))).toBe(true);
    }
    const scores = propositions.map((p) => p.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("répond à chaque envie de chaque voyageur", async () => {
    const { propositions } = await lancer(famille());
    const p = propositions[0];
    const servies = p.satisfaction.reduce((t, s) => t + s.envies, 0);
    expect(p.reponses).toHaveLength(servies);
  });

  it("exclut une destination dont le cœur est refusé, et dit pourquoi", async () => {
    const d = famille();
    d.voyageurs[1].envies = { plage: "naime_pas" };
    const { propositions, meta } = await lancer(d);
    expect(propositions.map((p) => p.id)).not.toContain("corse-sud");
    expect(meta.exclues.find((e) => e.destination === "Corse du Sud")?.raison).toContain("Plage");
  });

  it("type « îles » : uniquement des îles", async () => {
    const { propositions } = await lancer(famille({ type: "iles" }));
    expect(propositions.length).toBeGreaterThan(0);
    for (const p of propositions) expect(destinationParId(p.id)!.ile).toBe(true);
  });

  it("respecte la durée de trajet maximale (formulaire ou texte libre)", async () => {
    const d = famille();
    d.voyageurs[0].refusLibre = "pas plus de 4 h de trajet";
    const { propositions, meta } = await lancer(d);
    for (const p of propositions) for (const f of p.formules) expect(f.dureeMin).toBeLessThanOrEqual(240);
    expect(meta.exclues.some((e) => e.raison.includes("moins de 4 h"))).toBe(true);
  });

  it("sans avion, les îles sans ferry disparaissent", async () => {
    const d = famille({ transports: { modes: ["train", "ferry"], nuit: true, basCarbone: false } });
    const { propositions } = await lancer(d);
    for (const p of propositions) {
      expect(["crete", "canaries", "islande", "marrakech"]).not.toContain(p.id);
      for (const f of p.formules) expect(f.trajet.segments.some((s) => s.mode === "avion")).toBe(false);
    }
  });

  it("combine plusieurs modes : train + ferry pour la Corse", async () => {
    const d = famille({ transports: { modes: ["train", "ferry", "location"], nuit: false, basCarbone: true } });
    d.voyageurs = [{ prenom: "Léa", envies: { plage: "aime", montagne: "aime", plongee: "aime" } }];
    const { propositions } = await lancer(d);
    const corse = propositions.find((p) => p.id === "corse-sud")!;
    const modes = corse.formules[0].trajet.segments.map((s) => s.mode);
    expect(modes).toContain("train");
    expect(modes).toContain("ferry");
  });

  it("road trip : des étapes, des nuits par étape et une voiture", async () => {
    const d = famille({ type: "roadtrip", transports: { modes: ["avion", "train", "location"], nuit: false, basCarbone: false } });
    const { propositions } = await lancer(d);
    expect(propositions.length).toBeGreaterThan(0);
    for (const p of propositions) {
      expect(p.etapes!.length).toBeGreaterThanOrEqual(2);
      expect(p.etapes!.reduce((t, e) => t + e.nuits, 0)).toBe(p.periode.nuits);
      expect(p.etapes!.slice(1).every((e) => e.depuisPrecedente?.mode === "voiture")).toBe(true);
      expect(p.formules[0].sejours).toHaveLength(p.etapes!.length);
      expect(p.formules[0].trajet.location?.type).toBe("voiture");
    }
  });

  it("itinérant à vélo : vélos loués et étapes à vélo", async () => {
    const d = famille({ type: "velo", transports: { modes: ["train", "velo_location"], nuit: false, basCarbone: false } });
    const { propositions } = await lancer(d);
    expect(propositions.length).toBeGreaterThan(0);
    for (const p of propositions) {
      expect(p.formules[0].trajet.location?.type).toBe("velo");
      expect(p.etapes!.slice(1).every((e) => e.depuisPrecedente?.mode === "velo")).toBe(true);
    }
  });

  it("un animal : seulement des hébergements qui l'acceptent", async () => {
    const d = famille({ groupe: { animal: true, accessibilite: [], regime: [], langues: ["fr"] } });
    const { propositions } = await lancer(d);
    for (const p of propositions)
      for (const f of p.formules)
        for (const s of f.sejours) if (s.hebergement.type !== "estimation") expect(s.hebergement.equipements).toContain("animaux");
  });

  it("le rêve d'une cabane apparaît dans la formule Insolite", async () => {
    const d = famille();
    d.voyageurs[0].reve = "dormir dans une cabane perchée";
    const { propositions } = await lancer(d);
    const avecCabane = propositions.filter((p) =>
      p.formules.find((f) => f.nom === "insolite")!.sejours.some((s) => s.hebergement.type.startsWith("cabane")),
    );
    expect(avecCabane.length).toBeGreaterThan(0);
    // Les autres formules ne proposent que les types cochés.
    for (const p of propositions)
      for (const f of p.formules.filter((x) => x.nom !== "insolite"))
        for (const s of f.sejours) expect([...d.hebergements.types, "estimation"]).toContain(s.hebergement.type);
  });

  it("diversité : pas plus de deux destinations du même pays", async () => {
    const { propositions } = await lancer(famille());
    const pays = propositions.map((p) => p.pays);
    for (const x of pays) expect(pays.filter((y) => y === x).length).toBeLessThanOrEqual(2);
  });

  it("émet les étapes, puis les propositions au fil de l'eau, puis la fin", async () => {
    const evenements: Evenement["type"][] = [];
    await lancer(famille(), fournisseurs(), { emettre: (e: Evenement) => evenements.push(e.type) });
    expect(evenements[0]).toBe("etape");
    expect(evenements.at(-1)).toBe("fin");
    expect(evenements.filter((e) => e === "proposition").length).toBeGreaterThanOrEqual(4);
  });

  it("un fournisseur en panne ne bloque pas la recherche : résultat partiel signalé", async () => {
    const f = fournisseurs();
    f.vols = [{ nom: "Vols en panne", search: async () => { throw new Error("503"); } }];
    f.hebergements = [{ nom: "Hébergements lents", search: () => new Promise(() => {}) }];
    const { propositions, meta } = await lancer(famille(), f, { delaiMs: 30 });
    expect(propositions.length).toBeGreaterThan(0);
    expect(meta.fournisseursEnEchec).toEqual(expect.arrayContaining(["Vols en panne", "Hébergements lents"]));
    // Hébergement estimé, clairement marqué.
    expect(propositions[0].formules[0].sejours[0].hebergement.prix.nature).toBe("estimation");
  });

  it("plafond de coût : un fournisseur payant est ignoré au-delà, et c'est signalé", async () => {
    const f = fournisseurs();
    const { meta } = await lancer(famille(), f, { plafondEur: 0, couts: { [f.vols[0].nom]: 0.02 } });
    expect(meta.fournisseursEnEchec).toContain(f.vols[0].nom);
    expect(meta.cout.depenseEur).toBe(0);
  });

  it("départ inconnu : on calcule depuis le centre de la France et on le dit", async () => {
    const { meta, propositions } = await lancer(famille({ depart: { lieu: "Trifouilly", rayonKm: 50 } }));
    expect(meta.depart.reconnu).toBe(false);
    expect(propositions.length).toBeGreaterThan(0);
  });

  it("une recherche identique donne le même résultat", async () => {
    const a = await lancer(famille());
    const b = await lancer(famille());
    expect(b.propositions.map((p) => [p.id, p.score])).toEqual(a.propositions.map((p) => [p.id, p.score]));
  });
});

describe("contraintes dures", () => {
  it("accès impossible avec les transports acceptés", () => {
    const d = famille({ transports: { modes: ["train"], nuit: false, basCarbone: false } });
    expect(contrainteDure(destinationParId("crete")!, d, comprendre(d))).toContain("avion");
    expect(contrainteDure(destinationParId("vallee-loire")!, d, comprendre(d))).toBeNull();
  });
});
