// Tests des adaptateurs simulés : leurs réponses sont reproductibles, ce qui en fait
// des « réponses enregistrées » pour les étapes suivantes.
import { describe, expect, it } from "vitest";
import { creerFournisseursSimules } from "@/providers/registre";

const MAINTENANT = new Date("2026-10-04T10:00:00Z");
const f = creerFournisseursSimules({ maintenant: () => MAINTENANT });
const passagers = { adultes: 2, agesEnfants: [7] };
const paris = { nom: "Paris", lat: 48.86, lon: 2.35 };
const lyon = { nom: "Lyon", lat: 45.76, lon: 4.84 };
const figari = { nom: "Figari", lat: 41.5, lon: 9.1 };

describe("fournisseurs simulés", () => {
  it("géocode les villes connues et rien d'autre", async () => {
    expect((await f.geo.geocode("Lyon"))[0]).toMatchObject({ nom: "Lyon" });
    expect((await f.geo.geocode("12 rue des Lilas, Lille"))[0]).toMatchObject({ nom: "Lille" });
    expect(await f.geo.geocode("Trifouilly-les-Oies")).toEqual([]);
  });

  it("calcule un itinéraire plus long à vélo qu'en voiture", async () => {
    const voiture = await f.geo.route(paris, lyon, "voiture");
    const velo = await f.geo.route(paris, lyon, "velo");
    expect(velo.dureeMin).toBeGreaterThan(voiture.dureeMin * 4);
  });

  it("donne les normales d'une destination connue, et rien ailleurs", async () => {
    const c = await f.meteo.climate(41.59, 9.28, 7);
    expect(c).toMatchObject({ mois: 7, tMax: 29, nature: "simulation" });
    expect(await f.meteo.climate(0, 0, 7)).toBeNull();
  });

  it("propose des vols seulement au-delà de 350 km, marqués comme simulés", async () => {
    expect(await f.vols[0].search({ de: paris, vers: { nom: "Orléans", lat: 47.9, lon: 1.9 }, date: "2026-11-15", passagers })).toEqual([]);
    const vols = await f.vols[0].search({ de: paris, vers: figari, date: "2026-11-15", passagers });
    expect(vols.length).toBeGreaterThan(0);
    for (const v of vols) {
      expect(v.prix).toMatchObject({ currency: "EUR", nature: "simulation", observedAt: MAINTENANT.toISOString() });
      expect(v.prix.amount).toBeGreaterThan(0);
      expect(v.co2Kg).toBeGreaterThan(0);
    }
  });

  it("répond toujours la même chose à la même question", async () => {
    const q = { de: paris, vers: figari, date: "2026-11-15", passagers };
    expect(await f.vols[0].search(q)).toEqual(await f.vols[0].search(q));
  });

  it("propose un train de nuit seulement si on l'accepte", async () => {
    const loin = { nom: "Berlin", lat: 52.52, lon: 13.4 };
    const sans = await f.trains[0].search({ de: paris, vers: loin, date: "2026-11-15", passagers, nuit: false });
    const avec = await f.trains[0].search({ de: paris, vers: loin, date: "2026-11-15", passagers, nuit: true });
    expect(sans.some((t) => t.nuit)).toBe(false);
    expect(avec.some((t) => t.nuit)).toBe(true);
  });

  it("fait payer le véhicule sur le ferry", async () => {
    const q = { de: { nom: "Marseille", lat: 43.3, lon: 5.37 }, vers: { nom: "Ajaccio", lat: 41.92, lon: 8.74 }, date: "2026-11-15", passagers };
    const pieton = await f.ferries[0].search({ ...q, avecVehicule: false });
    const voiture = await f.ferries[0].search({ ...q, avecVehicule: true });
    expect(voiture[0].prix.amount).toBeGreaterThan(pieton[0].prix.amount);
  });

  it("ne propose que les types d'hébergement demandés et disponibles, dans la gamme d'étoiles", async () => {
    const offres = await f.hebergements[0].search({
      lieu: { nom: "Porto-Vecchio", lat: 41.59, lon: 9.28 },
      arrivee: "2027-06-15",
      nuits: 7,
      passagers,
      types: ["hotel", "yourte", "cabane"],
      etoilesMin: 3,
      etoilesMax: 4,
      equipements: [],
    });
    expect(new Set(offres.map((o) => o.type))).toEqual(new Set(["hotel", "cabane"])); // pas de yourte en Corse
    expect(offres.filter((o) => o.type === "hotel").map((o) => o.etoiles)).toEqual([3, 4]);
    expect(offres.every((o) => o.prix.amount > 0 && o.unites >= 1)).toBe(true);
  });

  it("coûte plus cher en haute saison", async () => {
    const q = (arrivee: string) =>
      f.hebergements[0].search({ lieu: { nom: "Porto-Vecchio", lat: 41.59, lon: 9.28 }, arrivee, nuits: 7, passagers, types: ["gite"], equipements: [] });
    const [hiver] = await q("2027-01-15");
    const [ete] = await q("2027-08-15");
    expect(ete.prix.amount).toBeGreaterThan(hiver.prix.amount);
  });

  it("ne vend que les activités de saison et ne fait pas payer les enfants trop jeunes", async () => {
    const lieu = { nom: "Porto-Vecchio", lat: 41.59, lon: 9.28 };
    const hiver = await f.activites[0].search({ lieu, destinationId: "corse-sud", interets: [], date: "2027-01-15", passagers });
    expect(hiver.map((a) => a.id)).not.toContain("lavezzi");
    const ete = await f.activites[0].search({ lieu, destinationId: "corse-sud", interets: [], date: "2027-07-15", passagers: { adultes: 2, agesEnfants: [5] } });
    const canyoning = ete.find((a) => a.id === "canyoning")!; // dès 10 ans
    const lavezzi = ete.find((a) => a.id === "lavezzi")!; // tous âges
    expect(canyoning.prix.amount / 60).toBeLessThan(2.3); // ~2 adultes seulement
    expect(lavezzi.prix.amount / 45).toBeGreaterThan(2.4); // 2 adultes + 0,7 enfant
  });

  it("liste les lieux gratuits à visiter", async () => {
    const lieux = await f.lieux[0].attractions("corse-sud", 41.59, 9.28, []);
    expect(lieux.map((l) => l.id)).toContain("bavella");
  });
});
