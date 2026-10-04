import { describe, expect, it } from "vitest";
import { libelleChemin, moisDisponibles, verifierDemande, type Demande } from "@/lib/demande";
import { MAINTENANT, demandeValide } from "./exemples";

const verifier = (d: unknown) => verifierDemande(d, MAINTENANT);
const erreursDe = (d: unknown) => {
  const r = verifier(d);
  return r.ok ? [] : r.erreurs;
};
const avecDates = (dates: Partial<Demande["dates"]>) =>
  demandeValide({ dates: { mode: "fixes", nuitsMin: 7, nuitsMax: 7, ...dates } as Demande["dates"] });

describe("verifierDemande — structure", () => {
  it("accepte la demande par défaut complétée", () => {
    expect(verifier(demandeValide())).toMatchObject({ ok: true });
  });

  it("refuse un champ inconnu, à tous les niveaux", () => {
    expect(verifier({ ...demandeValide(), pirate: true }).ok).toBe(false);
    const d = demandeValide();
    expect(verifier({ ...d, budget: { ...d.budget, paiement: "carte" } }).ok).toBe(false);
  });

  it("refuse ce qui n'est pas un objet", () => {
    expect(verifier("bonjour").ok).toBe(false);
    expect(verifier(null).ok).toBe(false);
  });

  it("donne des messages en français, avec le nom lisible du champ", () => {
    const erreurs = erreursDe(demandeValide({ depart: { lieu: "", rayonKm: 50 } }));
    expect(erreurs).toEqual(["Départ · ville de départ : Indiquez votre ville de départ."]);
  });
});

describe("verifierDemande — groupe et envies", () => {
  it("refuse une envie inconnue ou un état invalide", () => {
    const d = demandeValide();
    (d.voyageurs[0].envies as Record<string, string>).inconnue = "aime";
    expect(verifier(d).ok).toBe(false);
    const d2 = demandeValide();
    (d2.voyageurs[0].envies as Record<string, string>).plage = "adore";
    expect(verifier(d2).ok).toBe(false);
  });

  it("borne les textes libres à 220 caractères et les nettoie", () => {
    const long = demandeValide();
    long.voyageurs[0].reve = "a".repeat(221);
    expect(verifier(long).ok).toBe(false);
    const sale = demandeValide();
    sale.voyageurs[0].reve = "  nager\u0000avec des tortues ";
    const r = verifier(sale);
    expect(r.ok && r.demande.voyageurs[0].reve).toBe("nager avec des tortues");
  });

  it("refuse plus de profils que de voyageurs", () => {
    expect(erreursDe(demandeValide({ adultes: 1 }))).toContain("Profils : Il y a plus de profils que de voyageurs.");
  });

  it("borne adultes (1 à 12) et enfants (0 à 10)", () => {
    expect(verifier(demandeValide({ adultes: 13 })).ok).toBe(false);
    expect(verifier(demandeValide({ enfants: 11, agesEnfants: Array(11).fill(5) })).ok).toBe(false);
  });

  it("exige l'âge de chaque enfant, entre 0 et 17 ans", () => {
    expect(verifier(demandeValide({ enfants: 2, agesEnfants: [4, 9] })).ok).toBe(true);
    expect(erreursDe(demandeValide({ enfants: 2, agesEnfants: [4] }))).toContain(
      "Âges des enfants : Indiquez l'âge de chaque enfant.",
    );
    expect(verifier(demandeValide({ enfants: 1, agesEnfants: [18] })).ok).toBe(false);
  });

  it("n'accepte que les avatars, régimes et langues prévus", () => {
    const d = demandeValide();
    d.voyageurs[0].avatar = "🦊";
    expect(verifier(d).ok).toBe(true);
    expect(verifier({ ...d, voyageurs: [{ ...d.voyageurs[0], avatar: "<b>" }] }).ok).toBe(false);
    expect(verifier({ ...d, groupe: { ...d.groupe, regime: ["paleo"] } }).ok).toBe(false);
    expect(verifier({ ...d, groupe: { ...d.groupe, langues: ["fr", "fr"] } }).ok).toBe(false);
  });
});

describe("verifierDemande — dates", () => {
  it("accepte des dates fixes cohérentes", () => {
    expect(verifier(avecDates({ aller: "2026-11-01", retour: "2026-11-08" })).ok).toBe(true);
  });

  it("exige aller et retour en mode dates fixes", () => {
    expect(erreursDe(avecDates({ aller: "2026-11-01" }))).toContain("Dates · retour : Indiquez la date de retour.");
  });

  it("refuse un retour avant l'aller, un aller passé ou au-delà de 12 mois", () => {
    expect(verifier(avecDates({ aller: "2026-11-08", retour: "2026-11-01" })).ok).toBe(false);
    expect(erreursDe(avecDates({ aller: "2026-09-01", retour: "2026-09-08" }))).toContain(
      "Dates · aller : La date d'aller est déjà passée.",
    );
    expect(verifier(avecDates({ aller: "2027-11-01", retour: "2027-11-08" })).ok).toBe(false);
  });

  it("refuse une date qui n'existe pas", () => {
    expect(verifier(avecDates({ aller: "2026-02-30", retour: "2026-03-05" })).ok).toBe(false);
  });

  it("vérifie que le nombre de nuits correspond aux dates", () => {
    expect(erreursDe(avecDates({ aller: "2026-11-01", retour: "2026-11-05" }))).toContain(
      "Dates · nuits : Le nombre de nuits ne correspond pas aux dates.",
    );
  });

  it("exige la flexibilité en mode dates flexibles, parmi 1, 2, 3 ou 7 jours", () => {
    const base = { mode: "flexibles" as const, aller: "2026-11-01", retour: "2026-11-08" };
    expect(verifier(avecDates({ ...base, flexJours: 3 })).ok).toBe(true);
    expect(verifier(avecDates(base)).ok).toBe(false);
    expect(verifier(avecDates({ ...base, flexJours: 4 as 3 })).ok).toBe(false);
  });

  it("accepte un ou plusieurs mois parmi les 12 prochains", () => {
    const mois = (m: string[]) => demandeValide({ dates: { mode: "mois", mois: m, nuitsMin: 5, nuitsMax: 8 } });
    expect(verifier(mois(["2026-12", "2027-05"])).ok).toBe(true);
    expect(verifier(mois([])).ok).toBe(false);
    expect(verifier(mois(["2026-09"])).ok).toBe(false);
    expect(verifier(mois(["2027-10"])).ok).toBe(false);
  });

  it("accepte « quand c'est le mieux » avec une fourchette de nuits", () => {
    const d = demandeValide({ dates: { mode: "auMieux", nuitsMin: 5, nuitsMax: 8 } });
    expect(verifier(d).ok).toBe(true);
    expect(verifier({ ...d, dates: { ...d.dates, nuitsMin: 9 } }).ok).toBe(false);
    expect(verifier({ ...d, dates: { ...d.dates, aller: "2026-11-01" } }).ok).toBe(false);
  });

  it("liste les 12 mois à venir", () => {
    const m = moisDisponibles(MAINTENANT);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe("2026-10");
    expect(m[11]).toBe("2027-09");
  });
});

describe("verifierDemande — budget, transports, hébergements, rythme", () => {
  it("n'accepte que les dépassements 0, 5, 10 ou 20 %", () => {
    const d = demandeValide();
    expect(verifier({ ...d, budget: { ...d.budget, depassement: 10 } }).ok).toBe(true);
    expect(verifier({ ...d, budget: { ...d.budget, depassement: 15 } }).ok).toBe(false);
  });

  it("exige que le budget couvre au moins un poste", () => {
    const d = demandeValide();
    expect(verifier({ ...d, budget: { ...d.budget, inclut: [] } }).ok).toBe(false);
  });

  it("exige au moins un transport et un hébergement", () => {
    const d = demandeValide();
    expect(erreursDe({ ...d, transports: { ...d.transports, modes: [] } })).toEqual([
      "Transports · modes acceptés : Cochez au moins un moyen de transport.",
    ]);
    expect(verifier({ ...d, hebergements: { ...d.hebergements, types: [] } }).ok).toBe(false);
  });

  it("refuse un transport ou un hébergement inconnu", () => {
    const d = demandeValide();
    expect(verifier({ ...d, transports: { ...d.transports, modes: ["teleportation"] } }).ok).toBe(false);
    expect(verifier({ ...d, hebergements: { ...d.hebergements, types: ["chateau_hante"] } }).ok).toBe(false);
  });

  it("vérifie la cohérence des étoiles", () => {
    const d = demandeValide();
    expect(verifier({ ...d, hebergements: { ...d.hebergements, etoilesMin: 3, etoilesMax: 4 } }).ok).toBe(true);
    expect(verifier({ ...d, hebergements: { ...d.hebergements, etoilesMin: 4, etoilesMax: 2 } }).ok).toBe(false);
    expect(verifier({ ...d, hebergements: { ...d.hebergements, etoilesMin: 6 } }).ok).toBe(false);
  });

  it("borne les préférences de trajet", () => {
    const d = demandeValide();
    expect(verifier({ ...d, transports: { ...d.transports, dureeMaxH: 6, correspondancesMax: 1 } }).ok).toBe(true);
    expect(verifier({ ...d, transports: { ...d.transports, correspondancesMax: 9 } }).ok).toBe(false);
  });

  it("n'accepte que les trois rythmes et les quatre types de voyage", () => {
    expect(verifier({ ...demandeValide(), rythme: "frenetique" }).ok).toBe(false);
    expect(verifier({ ...demandeValide(), type: "roadtrip" }).ok).toBe(true);
    expect(verifier({ ...demandeValide(), type: "fusee" }).ok).toBe(false);
  });
});

describe("libelleChemin", () => {
  it("rend les chemins lisibles", () => {
    expect(libelleChemin(["voyageurs", 1, "prenom"])).toBe("Voyageur 2 · prénom");
    expect(libelleChemin([])).toBe("Demande");
  });
});
