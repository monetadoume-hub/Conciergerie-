import { describe, expect, it } from "vitest";
import { changerPersonnes, demandeParDefaut, ecranDuChamp, nouveauVoyageur } from "@/lib/brouillon";

describe("brouillon du formulaire", () => {
  it("ajoute un âge par défaut pour chaque nouvel enfant et garde les âges saisis", () => {
    let d = changerPersonnes(demandeParDefaut(), 2, 2);
    expect(d.agesEnfants).toEqual([8, 8]);
    d = { ...d, agesEnfants: [3, 12] };
    expect(changerPersonnes(d, 2, 3).agesEnfants).toEqual([3, 12, 8]);
    expect(changerPersonnes(d, 2, 1).agesEnfants).toEqual([3]);
  });

  it("retire les profils en trop quand le groupe rétrécit", () => {
    const d = { ...demandeParDefaut(), voyageurs: [1, 2, 3].map(nouveauVoyageur), adultes: 3 };
    expect(changerPersonnes(d, 2, 0).voyageurs).toHaveLength(2);
  });

  it("range chaque erreur sur le bon écran", () => {
    expect(ecranDuChamp("voyageurs.0.prenom")).toBe("groupe");
    expect(ecranDuChamp("voyageurs.1.envies.plage")).toBe("envies");
    expect(ecranDuChamp("voyageurs.0.reve")).toBe("envies");
    expect(ecranDuChamp("agesEnfants")).toBe("groupe");
    expect(ecranDuChamp("groupe.regime.0")).toBe("groupe");
    expect(ecranDuChamp("dates.aller")).toBe("cadre");
    expect(ecranDuChamp("budget.montant")).toBe("cadre");
  });
});
