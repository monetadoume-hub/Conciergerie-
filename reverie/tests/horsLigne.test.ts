import { describe, expect, it } from "vitest";
import { CATALOGUE } from "@/lib/catalogue";
import type { Demande } from "@/lib/demande";
import { budgetTotal, coefEnfant, estimerCout, evaluer, rechercherHorsLigne } from "@/lib/recherche/horsLigne";
import { demandeValide } from "./exemples";

const budget = (montant: number, par: "groupe" | "personne" = "groupe", depassement: 0 | 5 | 10 | 20 = 0) => ({
  montant,
  par,
  depassement,
  inclut: ["transport" as const, "hebergement" as const],
});

const base = (maj: Partial<Demande> = {}): Demande =>
  demandeValide({
    voyageurs: [{ prenom: "Léa", envies: { plage: "aime", montagne: "aime" } }],
    dates: { mode: "auMieux", nuitsMin: 7, nuitsMax: 7 },
    budget: budget(3000),
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
    expect(budgetTotal(base({ budget: budget(500, "personne"), enfants: 2, agesEnfants: [5, 9] }))).toBe(2000);
    expect(budgetTotal(base({ budget: budget(500) }))).toBe(500);
  });

  it("tient compte de l'âge des enfants dans l'estimation", () => {
    expect([0, 1, 2, 11, 12, 17].map(coefEnfant)).toEqual([0.1, 0.1, 0.7, 0.7, 1, 1]);
    const deuxAdultes = estimerCout(corse, base());
    const avecEnfant = estimerCout(corse, base({ enfants: 1, agesEnfants: [6] }));
    expect(avecEnfant - deuxAdultes).toBe(Math.round((deuxAdultes / 2) * 0.7));
    const avecAdo = estimerCout(corse, base({ enfants: 1, agesEnfants: [14] }));
    expect(avecAdo).toBe(Math.round((deuxAdultes * 3) / 2));
  });

  it("estime sur le milieu de la fourchette de nuits", () => {
    const sept = estimerCout(corse, base());
    const fourchette = estimerCout(corse, base({ dates: { mode: "auMieux", nuitsMin: 5, nuitsMax: 9 } }));
    expect(fourchette).toBe(sept);
  });

  it("distingue « dans le budget », « dans la marge acceptée » et « au-dessus »", () => {
    const cout = estimerCout(corse, base());
    const juste = Math.floor((cout / 1.08) / 50) * 50; // ~8 % sous l'estimation
    const strict = evaluer(corse, base({ budget: budget(juste) }))!;
    const marge = evaluer(corse, base({ budget: budget(juste, "groupe", 10) }))!;
    expect(strict.estimation).toMatchObject({ dansLeBudget: false, dansLaMarge: false });
    expect(marge.estimation).toMatchObject({ dansLeBudget: false, dansLaMarge: true });
    expect(marge.score).toBeGreaterThan(strict.score);
    expect(marge.compromis.join(" ")).toContain("dans la marge que vous acceptez");
  });

  it("signale le dépassement de budget et baisse le score", () => {
    const large = evaluer(corse, base({ budget: budget(10000) }))!;
    const serre = evaluer(corse, base({ budget: budget(800) }))!;
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
