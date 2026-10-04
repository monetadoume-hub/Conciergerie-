import { describe, expect, it } from "vitest";
import { verifierDemande } from "@/lib/demande";

const demandeValide = () => ({
  voyageurs: [
    { prenom: "Léa", envies: { plage: "aime", montagne: "aime", vie_nocturne: "naime_pas" } },
    { prenom: "Tom", envies: { randonnee: "aime" } },
  ],
  adultes: 2,
  enfants: 0,
  nuits: 7,
  budget: { montant: 2500, par: "groupe" },
});

describe("verifierDemande", () => {
  it("accepte une demande correcte", () => {
    expect(verifierDemande(demandeValide()).ok).toBe(true);
  });

  it("refuse un champ inconnu", () => {
    const r = verifierDemande({ ...demandeValide(), pirate: true });
    expect(r.ok).toBe(false);
  });

  it("refuse une envie qui n'existe pas", () => {
    const d = demandeValide();
    (d.voyageurs[0].envies as unknown as Record<string, string>).inconnue = "aime";
    expect(verifierDemande(d).ok).toBe(false);
  });

  it("refuse un état d'envie invalide", () => {
    const d = demandeValide();
    (d.voyageurs[0].envies as unknown as Record<string, string>).plage = "adore";
    expect(verifierDemande(d).ok).toBe(false);
  });

  it("refuse un texte libre de plus de 220 caractères", () => {
    const d = demandeValide();
    Object.assign(d.voyageurs[0], { reve: "a".repeat(221) });
    expect(verifierDemande(d).ok).toBe(false);
  });

  it("nettoie les caractères de contrôle du texte libre", () => {
    const d = demandeValide();
    Object.assign(d.voyageurs[0], { reve: "  nager\u0000avec des tortues " });
    const r = verifierDemande(d);
    expect(r.ok && r.demande.voyageurs[0].reve).toBe("nager avec des tortues");
  });

  it("refuse plus de profils que de voyageurs", () => {
    const d = demandeValide();
    d.adultes = 1;
    expect(verifierDemande(d).ok).toBe(false);
  });

  it("refuse plus de 12 adultes ou de 10 enfants", () => {
    expect(verifierDemande({ ...demandeValide(), adultes: 13 }).ok).toBe(false);
    expect(verifierDemande({ ...demandeValide(), enfants: 11 }).ok).toBe(false);
  });

  it("refuse ce qui n'est pas un objet", () => {
    expect(verifierDemande("bonjour").ok).toBe(false);
    expect(verifierDemande(null).ok).toBe(false);
  });
});
