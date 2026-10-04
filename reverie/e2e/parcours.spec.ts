import { expect, test } from "@playwright/test";

test("parcours principal : accueil → envies → résultats", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dites vos envies");
  await page.getByRole("link", { name: "Commencer mon voyage" }).click();

  await expect(page.getByRole("heading", { name: "Qu'avez-vous envie de vivre ?" })).toBeVisible();
  await page.getByLabel("Prénom").fill("Léa");

  // Pastille à trois états : un appui = J'aime, deux appuis = Je n'aime pas.
  await page.getByRole("button", { name: "Plage : Neutre" }).click();
  await expect(page.getByRole("button", { name: "Plage : J'aime" })).toBeVisible();
  await page.getByRole("button", { name: "Montagne : Neutre" }).click();
  await page.getByRole("button", { name: "Vie nocturne : Neutre" }).click();
  await page.getByRole("button", { name: "Vie nocturne : J'aime" }).click();
  await expect(page.getByRole("button", { name: "Vie nocturne : Je n'aime pas" })).toBeVisible();

  // Deuxième voyageur.
  await page.getByRole("button", { name: "Ajouter un voyageur" }).click();
  await page.getByLabel("Prénom").fill("Tom");
  await page.getByRole("button", { name: "Randonnée : Neutre" }).click();

  await page.getByRole("button", { name: "Trouver nos voyages" }).click();

  await expect(page.getByRole("heading", { name: /voyages qui vous ressemblent/ })).toBeVisible();
  await expect(page.getByText("Corse du Sud")).toBeVisible();
  await expect(page.getByText("Léa : 2 envies sur 2").first()).toBeVisible();
  await expect(page.getByText(/catalogue hors ligne/)).toBeVisible();
  await page.screenshot({ path: "e2e/captures/resultats.png", fullPage: true });

  // Les envies saisies sont conservées quand on revient au formulaire.
  await page.getByRole("button", { name: "Modifier mes envies" }).click();
  await page.getByRole("tab", { name: "Léa" }).click();
  await expect(page.getByRole("button", { name: "Plage : J'aime" })).toBeVisible();
});
