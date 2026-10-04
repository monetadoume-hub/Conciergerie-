// Liste officielle des envies (cahier des charges §3.3).
// L'identifiant (clé) est stable : il circule entre le navigateur, le serveur et le catalogue.

export interface FamilleEnvies {
  id: string;
  nom: string;
  envies: { id: string; nom: string }[];
}

export const FAMILLES_ENVIES: FamilleEnvies[] = [
  {
    id: "nature",
    nom: "Nature & paysages",
    envies: [
      { id: "plage", nom: "Plage" },
      { id: "mer_iles", nom: "Mer & îles" },
      { id: "montagne", nom: "Montagne" },
      { id: "lacs", nom: "Lacs" },
      { id: "foret", nom: "Forêt" },
      { id: "campagne", nom: "Campagne" },
      { id: "desert", nom: "Désert" },
      { id: "volcans", nom: "Volcans" },
      { id: "grands_espaces", nom: "Grands espaces" },
    ],
  },
  {
    id: "meteo",
    nom: "Météo",
    envies: [
      { id: "soleil", nom: "Soleil garanti" },
      { id: "chaleur", nom: "Chaleur" },
      { id: "douceur", nom: "Douceur" },
      { id: "fraicheur", nom: "Fraîcheur" },
      { id: "neige", nom: "Neige" },
    ],
  },
  {
    id: "culture",
    nom: "Culture",
    envies: [
      { id: "chateaux", nom: "Châteaux" },
      { id: "musees", nom: "Musées & histoire" },
      { id: "villages", nom: "Villages de caractère" },
      { id: "architecture", nom: "Architecture" },
      { id: "unesco", nom: "Patrimoine UNESCO" },
      { id: "festivals", nom: "Spectacles & festivals" },
    ],
  },
  {
    id: "ville",
    nom: "Ville",
    envies: [
      { id: "shopping", nom: "Ville & shopping" },
      { id: "vie_nocturne", nom: "Vie nocturne" },
      { id: "marches", nom: "Marchés" },
      { id: "street_art", nom: "Street-art" },
    ],
  },
  {
    id: "gastronomie",
    nom: "Gastronomie",
    envies: [
      { id: "gastronomie", nom: "Gastronomie" },
      { id: "vins", nom: "Vins & spiritueux" },
      { id: "street_food", nom: "Street-food" },
      { id: "cuisine_locale", nom: "Cuisine locale" },
      { id: "cours_cuisine", nom: "Cours de cuisine" },
    ],
  },
  {
    id: "activites",
    nom: "Activités",
    envies: [
      { id: "randonnee", nom: "Randonnée" },
      { id: "velo", nom: "Vélo" },
      { id: "nautique", nom: "Sports nautiques" },
      { id: "plongee", nom: "Plongée & snorkeling" },
      { id: "ski", nom: "Ski & glisse" },
      { id: "escalade", nom: "Escalade" },
      { id: "golf", nom: "Golf" },
      { id: "peche", nom: "Pêche" },
    ],
  },
  {
    id: "ambiance",
    nom: "Ambiance",
    envies: [
      { id: "detente", nom: "Détente & bien-être" },
      { id: "aventure", nom: "Aventure" },
      { id: "insolite", nom: "Insolite" },
      { id: "romantique", nom: "Romantique" },
      { id: "fete", nom: "Fête" },
      { id: "calme", nom: "Calme absolu" },
      { id: "hors_sentiers", nom: "Hors des sentiers battus" },
    ],
  },
  {
    id: "famille",
    nom: "Famille",
    envies: [
      { id: "parcs_attractions", nom: "Parcs d'attractions" },
      { id: "animaux", nom: "Animaux & zoos" },
      { id: "activites_enfants", nom: "Activités enfants" },
      { id: "baignade_facile", nom: "Baignade facile" },
    ],
  },
  {
    id: "budget",
    nom: "Budget",
    envies: [
      { id: "pas_cher", nom: "Pas cher" },
      { id: "haut_de_gamme", nom: "Haut de gamme" },
    ],
  },
];

export const NOMS_ENVIES: Record<string, string> = Object.fromEntries(
  FAMILLES_ENVIES.flatMap((f) => f.envies.map((e) => [e.id, e.nom])),
);

export const IDS_ENVIES = Object.keys(NOMS_ENVIES);

export type EtatEnvie = "aime" | "naime_pas";
