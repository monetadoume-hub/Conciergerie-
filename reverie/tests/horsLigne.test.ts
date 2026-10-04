import { describe, expect, it } from "vitest";
import { CATALOGUE } from "@/lib/catalogue";
import type { Demande } from "@/lib/demande";
import { budgetTotal, estimerCout, evaluer, rechercherHorsLigne } from "@/lib/recherche/horsLigne";

const base = (maj: Partial<Demande> = {}): Demande => ({
  voyageurs: [{ prenom: "Léa", envies: { plage: "aime", montagne: "aime" } }],
  adultes: 2,
  enfants: 0,
  nuits: 7,
  budget: { montant: 3000, par: "groupe" },
  ...maj,
});

const corse = CATALOGUE.find((d) => d.id === "corse-sud")!;

describe("recherche hors ligne", () => {
  it("renvoie 4 propositions au plus, triées par score", () => {
    const r = rechercherHorsLigne(base());
    expect(r.source).toBe("catalogue_hors_ligne");
    expect(r.propositions).toHaveLength(4);
    const scores = r.propositions.map((p) => p.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("place en tête une destination qui satisfait toutes les envies", () => {
    const r = rechercherHorsLigne(base());
    expect(r.propositions[0].satisfaction[0]).toEqual({ prenom: "Léa", envies: 2, sur: 2 });
  });

  it("exclut une destination dont une caractéristique dominante est refusée", () => {
    const d = base({ voyageurs: [{ prenom: "Tom", envies: { plage: "naime_pas" } }] });
    expect(evaluer(corse, d)).toBeNull();
    const ids = rechercherHorsLigne(d).propositions.map((p) => p.id);
    expect(ids).not.toContain("corse-sud");
    expect(ids).not.toContain("crete");
  });

  it("pénalise un refus secondaire et le signale dans les compromis", () => {
    const sans = evaluer(corse, base())!;
    const avec = evaluer(corse, base({ voyageurs: [{ prenom: "Léa", envies: { plage: "aime", montagne: "aime", plongee: "naime_pas" } }] }))!;
    expect(avec.score).toBe(sans.score - 15);
    expect(avec.compromis.join(" ")).toContain("Plongée");
  });

  it("liste les refus évités", () => {
    const p = evaluer(corse, base({ voyageurs: [{ prenom: "Léa", envies: { vie_nocturne: "naime_pas" } }] }))!;
    expect(p.refusEvites).toContain("Vie nocturne");
  });

  it("répond à chaque envie de chaque voyageur", () => {
    const p = evaluer(corse, base())!;
    expect(p.reponses).toContainEqual({ qui: "Léa", envie: "Montagne", reponse: "Aiguilles de Bavella" });
  });

  it("calcule le budget total par personne ou par groupe", () => {
    expect(budgetTotal(base({ budget: { montant: 500, par: "personne" }, enfants: 2 }))).toBe(2000);
    expect(budgetTotal(base({ budget: { montant: 500, par: "groupe" } }))).toBe(500);
  });

  it("compte un enfant à 70 % d'un adulte dans l'estimation", () => {
    const deuxAdultes = estimerCout(corse, base());
    const avecEnfant = estimerCout(corse, base({ enfants: 1 }));
    expect(avecEnfant - deuxAdultes).toBe(Math.round((deuxAdultes / 2) * 0.7));
  });

  it("signale le dépassement de budget et baisse le score", () => {
    const large = evaluer(corse, base({ budget: { montant: 10000, par: "groupe" } }))!;
    const serre = evaluer(corse, base({ budget: { montant: 800, par: "groupe" } }))!;
    expect(large.estimation.dansLeBudget).toBe(true);
    expect(serre.estimation.dansLeBudget).toBe(false);
    expect(serre.score).toBeLessThan(large.score);
  });

  it("garde au plus deux destinations du même pays", () => {
    const d = base({ voyageurs: [{ prenom: "Léa", envies: { campagne: "aime", calme: "aime", foret: "aime" } }] });
    const pays = rechercherHorsLigne(d).propositions.map((p) => p.pays);
    expect(pays.filter((p) => p === "France").length).toBeLessThanOrEqual(2);
  });

  it("explique le score", () => {
    const p = evaluer(corse, base())!;
    expect(p.pourquoi.some((l) => l.startsWith("Envies"))).toBe(true);
    expect(p.pourquoi.some((l) => l.startsWith("Budget"))).toBe(true);
  });
});
