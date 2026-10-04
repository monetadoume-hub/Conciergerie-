// Listes fermées du formulaire (cahier des charges §3.2 à §3.4).
// Les identifiants sont stables ; les noms sont affichés à l'écran.

export interface Option {
  id: string;
  nom: string;
}

const ids = (opts: readonly Option[]) => opts.map((o) => o.id) as [string, ...string[]];

export const AVATARS = ["🧭", "🌞", "🏔️", "🌊", "🌿", "🦊", "🐢", "🚲", "📷", "🎒"] as const;

export const ACCESSIBILITE: Option[] = [
  { id: "mobilite_reduite", nom: "Mobilité réduite" },
  { id: "poussette", nom: "Poussette" },
];

export const REGIMES: Option[] = [
  { id: "vegetarien", nom: "Végétarien" },
  { id: "vegan", nom: "Végan" },
  { id: "sans_porc", nom: "Sans porc" },
  { id: "halal", nom: "Halal" },
  { id: "casher", nom: "Casher" },
  { id: "sans_gluten", nom: "Sans gluten" },
];

export const LANGUES: Option[] = [
  { id: "fr", nom: "Français" },
  { id: "en", nom: "Anglais" },
  { id: "es", nom: "Espagnol" },
  { id: "de", nom: "Allemand" },
  { id: "it", nom: "Italien" },
  { id: "pt", nom: "Portugais" },
];

export const TYPES_VOYAGE: (Option & { aide: string })[] = [
  { id: "sejour", nom: "Séjour", aide: "Un point de chute" },
  { id: "roadtrip", nom: "Road trip", aide: "3 à 8 étapes" },
  { id: "velo", nom: "Itinérant à vélo", aide: "D'étape en étape à vélo" },
  { id: "iles", nom: "Croisière / îles", aide: "D'île en île" },
];

export const MODES_DATES: (Option & { aide: string })[] = [
  { id: "fixes", nom: "Dates fixes", aide: "Aller et retour précis" },
  { id: "flexibles", nom: "Dates flexibles", aide: "À quelques jours près" },
  { id: "mois", nom: "Un mois", aide: "Ou plusieurs, au choix" },
  { id: "auMieux", nom: "Quand c'est le mieux", aide: "Rêverie choisit la meilleure période sur 12 mois" },
];

export const FLEX_JOURS = [1, 2, 3, 7] as const;
export const DEPASSEMENTS = [0, 5, 10, 20] as const;

export const POSTES_BUDGET: Option[] = [
  { id: "transport", nom: "Transport" },
  { id: "hebergement", nom: "Hébergement" },
  { id: "activites", nom: "Activités" },
  { id: "repas", nom: "Repas sur place (estimation)" },
];

export const TRANSPORTS: Option[] = [
  { id: "avion", nom: "Avion" },
  { id: "train", nom: "Train" },
  { id: "bus", nom: "Bus" },
  { id: "covoiturage", nom: "Covoiturage" },
  { id: "ferry", nom: "Bateau / ferry" },
  { id: "location", nom: "Voiture de location" },
  { id: "ma_voiture", nom: "Ma voiture" },
  { id: "velo_perso", nom: "Mon vélo" },
  { id: "velo_location", nom: "Vélo de location" },
  { id: "van", nom: "Van ou camping-car" },
];

export const HEBERGEMENTS: Option[] = [
  { id: "hotel", nom: "Hôtel" },
  { id: "resort", nom: "Resort / club" },
  { id: "chambre_hotes", nom: "Chambre d'hôtes" },
  { id: "gite", nom: "Gîte" },
  { id: "location", nom: "Location (appartement / maison)" },
  { id: "chez_habitant", nom: "Chez l'habitant" },
  { id: "auberge_jeunesse", nom: "Auberge de jeunesse" },
  { id: "camping", nom: "Camping" },
  { id: "glamping", nom: "Glamping" },
  { id: "yourte", nom: "Yourte" },
  { id: "cabane", nom: "Cabane" },
  { id: "cabane_perchee", nom: "Cabane perchée" },
  { id: "tipi", nom: "Tipi" },
  { id: "bulle", nom: "Bulle" },
  { id: "roulotte", nom: "Roulotte" },
  { id: "peniche", nom: "Péniche" },
  { id: "refuge", nom: "Refuge de montagne" },
];

export const EQUIPEMENTS: Option[] = [
  { id: "piscine", nom: "Piscine" },
  { id: "cuisine", nom: "Cuisine" },
  { id: "parking", nom: "Parking" },
  { id: "wifi", nom: "Wifi" },
  { id: "animaux", nom: "Animaux acceptés" },
  { id: "pmr", nom: "Accessible PMR" },
  { id: "vue_mer", nom: "Vue mer" },
  { id: "climatisation", nom: "Climatisation" },
  { id: "lit_bebe", nom: "Lit bébé" },
];

export const RYTHMES: (Option & { aide: string })[] = [
  { id: "tranquille", nom: "Tranquille", aide: "Une activité par jour, du temps libre" },
  { id: "equilibre", nom: "Équilibré", aide: "Deux activités par jour" },
  { id: "intense", nom: "Intense", aide: "On profite de chaque minute" },
];

export const IDS = {
  accessibilite: ids(ACCESSIBILITE),
  regimes: ids(REGIMES),
  langues: ids(LANGUES),
  postes: ids(POSTES_BUDGET),
  transports: ids(TRANSPORTS),
  hebergements: ids(HEBERGEMENTS),
  equipements: ids(EQUIPEMENTS),
};
