import { describe, expect, it } from "vitest";
import { avecDelai, avecReessais, CacheMemoire, CompteurCout, DelaiDepasse, distanceKm, entre, hasard } from "@/providers/outils";

describe("outils des fournisseurs", () => {
  it("coupe un appel trop lent", async () => {
    const lent = new Promise((r) => setTimeout(() => r("trop tard"), 200));
    await expect(avecDelai(lent, 20, "lent")).rejects.toBeInstanceOf(DelaiDepasse);
    await expect(avecDelai(Promise.resolve("ok"), 20, "rapide")).resolves.toBe("ok");
  });

  it("retente une fois après une erreur, mais pas après un délai dépassé", async () => {
    let n = 0;
    const capricieux = async () => {
      n++;
      if (n === 1) throw new Error("panne passagère");
      return "ok";
    };
    await expect(avecReessais(capricieux, 2)).resolves.toBe("ok");
    expect(n).toBe(2);

    let m = 0;
    const lent = async () => {
      m++;
      throw new DelaiDepasse("x", 1);
    };
    await expect(avecReessais(lent, 3)).rejects.toBeInstanceOf(DelaiDepasse);
    expect(m).toBe(1);
  });

  it("met en cache pendant la durée prévue, puis recalcule", async () => {
    const cache = new CacheMemoire();
    let appels = 0;
    const calcul = async () => ++appels;
    expect(await cache.obtenir("k", 1000, calcul, 0)).toBe(1);
    expect(await cache.obtenir("k", 1000, calcul, 500)).toBe(1);
    expect(await cache.obtenir("k", 1000, calcul, 1500)).toBe(2);
  });

  it("ne met pas en cache un échec", async () => {
    const cache = new CacheMemoire();
    await expect(cache.obtenir("k", 1000, () => Promise.reject(new Error("x")))).rejects.toThrow();
    expect(await cache.obtenir("k", 1000, async () => "ok")).toBe("ok");
  });

  it("refuse un appel qui ferait dépasser le plafond de coût", () => {
    const c = new CompteurCout(0.05);
    expect(c.reserver("a", 0.03)).toBe(true);
    expect(c.reserver("b", 0.03)).toBe(false);
    expect(c.refus).toEqual(["b"]);
    expect(c.depense).toBeCloseTo(0.03);
  });

  it("produit un hasard reproductible", () => {
    expect(hasard("graine")).toBe(hasard("graine"));
    expect(hasard("graine")).not.toBe(hasard("autre"));
    const v = entre("x", 10, 20);
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThan(20);
  });

  it("calcule les distances à vol d'oiseau", () => {
    // Paris – Lyon : environ 390 km.
    expect(distanceKm({ lat: 48.86, lon: 2.35 }, { lat: 45.76, lon: 4.84 })).toBeGreaterThan(380);
    expect(distanceKm({ lat: 48.86, lon: 2.35 }, { lat: 45.76, lon: 4.84 })).toBeLessThan(400);
  });
});
