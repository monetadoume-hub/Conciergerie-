import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/recherche/route";
import { creerLimiteur } from "@/lib/limiteur";

const requete = (corps: string, type = "application/json", ip = "1.2.3.4") =>
  new Request("http://localhost/api/recherche", {
    method: "POST",
    headers: { "content-type": type, "x-forwarded-for": ip },
    body: corps,
  });

const demande = {
  voyageurs: [{ prenom: "Léa", envies: { plage: "aime" } }],
  adultes: 2,
  enfants: 0,
  nuits: 5,
  budget: { montant: 1500, par: "groupe" },
};

describe("POST /api/recherche", () => {
  it("renvoie des propositions pour une demande valide", async () => {
    const rep = await POST(requete(JSON.stringify(demande), undefined, "10.0.0.1"));
    expect(rep.status).toBe(200);
    const json = await rep.json();
    expect(json.propositions.length).toBeGreaterThan(0);
    expect(json.source).toBe("catalogue_hors_ligne");
  });

  it("refuse une demande invalide avec des messages lisibles", async () => {
    const rep = await POST(requete(JSON.stringify({ ...demande, adultes: 0 }), undefined, "10.0.0.2"));
    expect(rep.status).toBe(400);
    expect((await rep.json()).erreurs.length).toBeGreaterThan(0);
  });

  it("refuse un JSON mal formé", async () => {
    expect((await POST(requete("{pas du json", undefined, "10.0.0.3"))).status).toBe(400);
  });

  it("refuse un autre format que JSON", async () => {
    expect((await POST(requete("a=b", "text/plain", "10.0.0.4"))).status).toBe(415);
  });

  it("refuse une demande trop volumineuse", async () => {
    expect((await POST(requete("x".repeat(20_000), undefined, "10.0.0.5"))).status).toBe(413);
  });

  it("limite le nombre de recherches par visiteur", async () => {
    let dernier = 0;
    for (let i = 0; i < 21; i++) {
      dernier = (await POST(requete(JSON.stringify(demande), undefined, "10.0.0.6"))).status;
    }
    expect(dernier).toBe(429);
  });
});

describe("limiteur", () => {
  it("autorise de nouveau après la fenêtre de temps", () => {
    const l = creerLimiteur(1, 1000);
    expect(l.autoriser("a", 0)).toBe(true);
    expect(l.autoriser("a", 500)).toBe(false);
    expect(l.autoriser("a", 1500)).toBe(true);
  });
});
