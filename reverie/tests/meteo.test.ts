import { describe, expect, it } from "vitest";
import { destinationParId } from "@/donnees/destinations";
import { comprendre } from "@/moteur/comprehension";
import { choisirPeriode, envieMeteoSatisfaite, evaluerMeteo } from "@/moteur/meteo";
import { creerMeteoSimulee } from "@/providers/mock/meteo";
import type { Climate } from "@/providers/types";
import { demandeValide, MAINTENANT } from "./exemples";

const climat = (c: Partial<Climate>): Climate => ({ mois: 7, tMax: 25, tMin: 15, soleilH: 9, pluieJ: 3, neige: false, source: "test", nature: "simulation", ...c });
const meteo = creerMeteoSimulee({ latenceMs: 0, maintenant: () => MAINTENANT });

describe("météo", () => {
  it("évalue chaque envie météo", () => {
    expect(envieMeteoSatisfaite("chaleur", climat({ tMax: 30 }))).toBe(true);
    expect(envieMeteoSatisfaite("chaleur", climat({ tMax: 20 }))).toBe(false);
    expect(envieMeteoSatisfaite("douceur", climat({ tMax: 22 }))).toBe(true);
    expect(envieMeteoSatisfaite("soleil", climat({ soleilH: 4 }))).toBe(false);
    expect(envieMeteoSatisfaite("neige", climat({ neige: true }))).toBe(true);
    expect(envieMeteoSatisfaite("plage", climat({}))).toBeNull();
  });

  it("« neige en juillet » : aucune station n'est enneigée", () => {
    const chamonix = destinationParId("alpes-chamonix")!;
    const juillet = climat({ mois: 7, neige: chamonix.climat.neige.includes(7) });
    expect(envieMeteoSatisfaite("neige", juillet, chamonix)).toBe(false);
    expect(envieMeteoSatisfaite("ski", juillet, chamonix)).toBe(false);
  });

  it("pénalise un refus météo touché", () => {
    const d = demandeValide();
    d.voyageurs[1].envies = { chaleur: "naime_pas" };
    const c = comprendre(d);
    const chaud = evaluerMeteo(climat({ tMax: 33 }), c);
    const doux = evaluerMeteo(climat({ tMax: 22 }), c);
    expect(chaud.refusTouches).toHaveLength(1);
    expect(chaud.score).toBeLessThan(doux.score);
  });

  it("« quand c'est le mieux » : trouve la bonne saison pour la plage", async () => {
    const d = demandeValide({ dates: { mode: "auMieux", nuitsMin: 7, nuitsMax: 7 } });
    d.voyageurs = [{ prenom: "Léa", envies: { plage: "aime", chaleur: "aime" } }];
    const r = await choisirPeriode(destinationParId("corse-sud")!, d, comprendre(d), meteo, MAINTENANT);
    expect([6, 7, 8, 9]).toContain(r!.periode.mois);
    expect(r!.meteo.source).toBe("normales");
  });

  it("« quand c'est le mieux » : trouve la neige en hiver", async () => {
    const d = demandeValide({ dates: { mode: "auMieux", nuitsMin: 7, nuitsMax: 7 } });
    d.voyageurs = [{ prenom: "Léa", envies: { ski: "aime", neige: "aime" } }];
    const r = await choisirPeriode(destinationParId("alpes-chamonix")!, d, comprendre(d), meteo, MAINTENANT);
    expect([12, 1, 2, 3, 4]).toContain(r!.periode.mois);
  });

  it("évite la haute saison quand on refuse la foule", async () => {
    const d = demandeValide({ dates: { mode: "auMieux", nuitsMin: 7, nuitsMax: 7 } });
    d.voyageurs = [{ prenom: "Léa", envies: { plage: "aime" }, refusLibre: "pas de foule" }];
    const r = await choisirPeriode(destinationParId("corse-sud")!, d, comprendre(d), meteo, MAINTENANT);
    expect([7, 8]).not.toContain(r!.periode.mois);
  });

  it("respecte les mois choisis", async () => {
    const d = demandeValide({ dates: { mode: "mois", mois: ["2027-04", "2027-05"], nuitsMin: 5, nuitsMax: 7 } });
    const r = await choisirPeriode(destinationParId("crete")!, d, comprendre(d), meteo, MAINTENANT);
    expect([4, 5]).toContain(r!.periode.mois);
    expect(r!.periode.nuits).toBe(6);
  });

  it("utilise les prévisions quand le départ est dans moins de 14 jours", async () => {
    const d = demandeValide({ dates: { mode: "fixes", aller: "2026-10-10", retour: "2026-10-15", nuitsMin: 5, nuitsMax: 5 } });
    const r = await choisirPeriode(destinationParId("crete")!, d, comprendre(d), meteo, MAINTENANT);
    expect(r!.meteo.source).toBe("previsions");
    expect(r!.meteo.previsions).toHaveLength(6);
  });
});
