import { expect, test } from "@playwright/test";

const dansNJours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

test("parcours principal : accueil → groupe → envies → cadre → résultats", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dites vos envies");
  await page.getByRole("link", { name: "Commencer mon voyage" }).click();

  // Écran 1 : le groupe.
  await expect(page.getByRole("heading", { name: "Qui part en voyage ?" })).toBeVisible();
  await page.getByRole("button", { name: "Enfants : un de plus" }).click();
  await page.getByLabel("Âge de l'enfant 1").selectOption("6");
  await page.getByLabel("Prénom").fill("Léa");
  await page.getByRole("button", { name: "+ Ajouter un profil" }).click();
  await page.getByLabel("Prénom 2").fill("Tom");
  await page.getByLabel("Avatar 🦊 pour Tom").check({ force: true });
  await page.getByText("Nous voyageons avec un animal").click();
  await page.getByText("Végétarien").click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Écran 2 : les envies, un onglet par voyageur.
  await expect(page.getByRole("heading", { name: "Qu'avez-vous envie de vivre ?" })).toBeVisible();
  await page.getByRole("button", { name: "Plage : Neutre" }).click();
  await expect(page.getByRole("button", { name: "Plage : J'aime" })).toBeVisible();
  await page.getByRole("button", { name: "Montagne : Neutre" }).click();
  await page.getByRole("button", { name: "Vie nocturne : Neutre" }).click();
  await page.getByRole("button", { name: "Vie nocturne : J'aime" }).click();
  await expect(page.getByRole("button", { name: "Vie nocturne : Je n'aime pas" })).toBeVisible();
  await page.getByLabel("Mon rêve en quelques mots").fill("Nager avec des tortues");
  await page.getByRole("tab", { name: /Tom/ }).click();
  await page.getByRole("button", { name: "Randonnée : Neutre" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Écran 3 : le cadre. Sans ville de départ, le formulaire le signale.
  await expect(page.getByRole("heading", { name: "Le cadre du voyage" })).toBeVisible();
  await page.getByRole("button", { name: "Trouver nos voyages" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Quelques points à corriger" })).toContainText("ville de départ");

  await page.getByLabel("Ville ou adresse de départ").fill("Lyon");
  await page.getByText("Dates fixes").click();
  await page.getByLabel("Date d'aller").fill(dansNJours(30));
  await page.getByLabel("Date de retour").fill(dansNJours(37));
  await expect(page.getByText("7 nuits sur place")).toBeVisible();
  await page.getByText("+10 %").click();
  await page.getByText("Yourte").click();
  await page.getByText("Le plus bas carbone possible").click();
  await page.getByText("Tranquille").click();
  await page.getByRole("button", { name: "Trouver nos voyages" }).click();

  await expect(page.getByRole("heading", { name: /voyages qui vous ressemblent/ })).toBeVisible();
  await expect(page.getByText("Corse du Sud")).toBeVisible();
  await expect(page.getByText("Léa : 2 envies sur 2").first()).toBeVisible();
  await expect(page.getByText(/Estimation pour 7 nuits/).first()).toBeVisible();
  await expect(page.getByText(/catalogue hors ligne/)).toBeVisible();

  // Revenir au formulaire conserve toutes les saisies.
  await page.getByRole("button", { name: "Modifier ma recherche" }).click();
  await expect(page.getByLabel("Ville ou adresse de départ")).toHaveValue("Lyon");
  await page.getByRole("button", { name: "Le groupe" }).click();
  await expect(page.getByLabel("Âge de l'enfant 1")).toHaveValue("6");
});

test("le serveur refuse une demande invalide même si le navigateur est contourné", async ({ request }) => {
  const rep = await request.post("/api/recherche", { data: { voyageurs: [], adultes: 99 } });
  expect(rep.status()).toBe(400);
  expect((await rep.json()).erreurs.length).toBeGreaterThan(0);
});
