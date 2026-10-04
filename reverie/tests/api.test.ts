import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/recherche/route";
import { creerLimiteur } from "@/lib/limiteur";
import type { Evenement } from "@/moteur/types";
import { demandeValide } from "./exemples";

const requete = (corps: string, type = "application/json", ip = "1.2.3.4") =>
  new Request("http://localhost/api/recherche", {
    method: "POST",
    headers: { "content-type": type, "x-forwarded-for": ip },
    body: corps,
  });

const demande = demandeValide();

describe("POST /api/recherche", () => {
  it("renvoie les événements en flux, une ligne JSON par événement, terminés par « fin »", async () => {
    const rep = await POST(requete(JSON.stringify(demande), undefined, "10.0.0.1"));
    expect(rep.status).toBe(200);
    expect(rep.headers.get("content-type")).toContain("application/x-ndjson");
    const lignes = (await rep.text()).trim().split("\n").map((l) => JSON.parse(l) as Evenement);
    expect(lignes[0].type).toBe("etape");
    const fin = lignes.at(-1)!;
    expect(fin.type).toBe("fin");
    if (fin.type === "fin") {
      expect(fin.propositions.length).toBeGreaterThan(0);
      expect(fin.propositions.length).toBeLessThanOrEqual(4);
    }
  });

  it("refuse une demande invalide avec des messages lisibles", async () => {
    const rep = await POST(requete(JSON.stringify({ ...demande, adultes: 0 }), undefined, "10.0.0.2"));
    expect(rep.status).toBe(400);
    const json = await rep.json();
    expect(json.erreurs).toContain("Adultes : Trop petit : nombre doit être >=1");
    expect(json.champs[0].chemin).toBe("adultes");
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
      // Requête invalide : la limite s'applique avant même la validation.
      dernier = (await POST(requete("{}", undefined, "10.0.0.6"))).status;
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
