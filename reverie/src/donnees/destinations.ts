// Base interne de destinations (cahier des charges §4.3).
// Rédigée à la main : climat = normales indicatives arrondies, prix = ordres de grandeur.
// Ces chiffres servent aux fournisseurs simulés et au filet de secours ; l'interface les présente
// toujours comme des simulations ou des estimations, jamais comme des données relevées.

export interface Lieu {
  nom: string;
  lat: number;
  lon: number;
}

export interface ActiviteCatalogue {
  id: string;
  nom: string;
  envies: string[];
  /** Prix par adulte en euros ; 0 = lieu gratuit (visite libre). */
  prix: number;
  dureeH: number;
  insolite?: boolean;
  ageMin?: number;
  /** Mois où l'activité est possible (1 à 12) ; absent = toute l'année. */
  mois?: number[];
}

/** 12 valeurs, de janvier à décembre. */
type Mensuel = [number, number, number, number, number, number, number, number, number, number, number, number];

export interface Destination {
  id: string;
  nom: string;
  pays: string;
  centre: Lieu;
  /** Envies satisfaites en permanence (les envies météo sont évaluées mois par mois). */
  tags: string[];
  /** Caractéristiques dominantes : un voyageur qui les refuse exclut la destination. */
  tagsForts: string[];
  accroche: string;
  /** Pour chaque envie, une réponse concrète. */
  reponses: Record<string, string>;
  ile: boolean;
  /** Accessible depuis la France par la route ou le rail, sans bateau. */
  continent: boolean;
  aeroport: Lieu;
  gare?: Lieu;
  /** Ports de départ (France continentale) et port d'arrivée, si un ferry dessert la destination. */
  ferry?: { depuis: Lieu[]; arrivee: Lieu };
  /** Étapes pour un road trip ou un itinéraire à vélo. */
  etapes: Lieu[];
  hebergements: string[];
  activites: ActiviteCatalogue[];
  climat: { tMax: Mensuel; tMin: Mensuel; soleilH: Mensuel; pluieJ: Mensuel; neige: number[] };
  /** 1 = calme, 2 = fréquenté, 3 = foule. */
  affluence: Mensuel;
  /** Niveau de prix sur place (1 = moyenne française). */
  indicePrix: number;
  /** Filet de secours : estimation hébergement + activités par adulte et par nuit (EUR). */
  estimationNuitParAdulte: number;
  /** Filet de secours : estimation aller-retour depuis la France, par adulte (EUR). */
  estimationTransportParAdulte: number;
}

const L = (nom: string, lat: number, lon: number): Lieu => ({ nom, lat, lon });

const BASE_HEBERGEMENTS = ["hotel", "chambre_hotes", "gite", "location", "chez_habitant"];

export const DESTINATIONS: Destination[] = [
  {
    id: "corse-sud",
    nom: "Corse du Sud",
    pays: "France",
    centre: L("Porto-Vecchio", 41.59, 9.28),
    tags: ["plage", "mer_iles", "montagne", "randonnee", "plongee", "cuisine_locale", "villages", "baignade_facile", "nautique", "grands_espaces"],
    tagsForts: ["plage", "mer_iles", "montagne"],
    accroche: "Mer turquoise le matin, aiguilles de granit l'après-midi.",
    reponses: {
      plage: "Palombaggia et Rondinara",
      mer_iles: "Îles Lavezzi en bateau",
      montagne: "Aiguilles de Bavella",
      randonnee: "Sentiers de Bavella et du Cuscionu",
      plongee: "Réserve des îles Lavezzi",
      villages: "Sartène et Bonifacio",
      cuisine_locale: "Charcuterie, brocciu et fromages de montagne",
      baignade_facile: "Criques peu profondes de Santa Giulia",
      nautique: "Kayak de mer dans le golfe de Porto-Vecchio",
      grands_espaces: "Plateau du Cuscionu",
    },
    ile: true,
    continent: false,
    aeroport: L("Aéroport de Figari", 41.5, 9.1),
    ferry: { depuis: [L("Marseille", 43.3, 5.37), L("Toulon", 43.12, 5.93), L("Nice", 43.7, 7.27)], arrivee: L("Ajaccio", 41.92, 8.74) },
    etapes: [L("Ajaccio", 41.92, 8.74), L("Sartène", 41.62, 8.97), L("Bonifacio", 41.39, 9.16), L("Porto-Vecchio", 41.59, 9.28)],
    hebergements: [...BASE_HEBERGEMENTS, "resort", "camping", "glamping", "cabane", "refuge"],
    activites: [
      { id: "lavezzi", nom: "Excursion en bateau aux îles Lavezzi", envies: ["mer_iles", "plongee", "nautique"], prix: 45, dureeH: 5, mois: [4, 5, 6, 7, 8, 9, 10] },
      { id: "snorkeling", nom: "Sortie snorkeling encadrée", envies: ["plongee", "nautique"], prix: 35, dureeH: 2, ageMin: 8, mois: [5, 6, 7, 8, 9, 10] },
      { id: "bavella", nom: "Randonnée aux aiguilles de Bavella", envies: ["montagne", "randonnee", "grands_espaces"], prix: 0, dureeH: 4 },
      { id: "canyoning", nom: "Canyoning dans la Purcaraccia", envies: ["aventure", "montagne"], prix: 60, dureeH: 4, ageMin: 10, insolite: true, mois: [5, 6, 7, 8, 9] },
      { id: "bonifacio", nom: "Citadelle et falaises de Bonifacio", envies: ["villages", "architecture"], prix: 0, dureeH: 3 },
      { id: "palombaggia", nom: "Journée plage à Palombaggia", envies: ["plage", "baignade_facile", "detente"], prix: 0, dureeH: 5 },
    ],
    climat: {
      tMax: [14, 14, 16, 18, 22, 26, 29, 29, 26, 22, 18, 15],
      tMin: [5, 5, 6, 8, 12, 15, 18, 18, 16, 12, 9, 6],
      soleilH: [5, 5.5, 6.5, 8, 9.5, 11, 12, 11, 9, 7, 5.5, 4.5],
      pluieJ: [8, 8, 7, 7, 5, 3, 1, 2, 5, 8, 9, 9],
      neige: [],
    },
    affluence: [1, 1, 1, 2, 2, 3, 3, 3, 2, 1, 1, 1],
    indicePrix: 1.1,
    estimationNuitParAdulte: 95,
    estimationTransportParAdulte: 180,
  },
  {
    id: "lisbonne",
    nom: "Lisbonne",
    pays: "Portugal",
    centre: L("Lisbonne", 38.72, -9.14),
    tags: ["shopping", "vie_nocturne", "street_art", "architecture", "musees", "street_food", "cuisine_locale", "pas_cher", "marches", "fete", "unesco"],
    tagsForts: ["shopping", "vie_nocturne"],
    accroche: "Tramways, azulejos et pastéis de nata au soleil de l'Atlantique.",
    reponses: {
      street_art: "Quartiers de Graça et LX Factory",
      vie_nocturne: "Bairro Alto et Cais do Sodré",
      architecture: "Monastère des Hiéronymites à Belém",
      street_food: "Time Out Market et bifanas",
      marches: "Feira da Ladra",
      musees: "Musée national de l'azulejo",
      unesco: "Tour de Belém et monastère des Hiéronymites",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport Humberto Delgado", 38.77, -9.13),
    gare: L("Gare Santa Apolónia", 38.71, -9.12),
    etapes: [L("Lisbonne", 38.72, -9.14), L("Sintra", 38.8, -9.38), L("Setúbal", 38.52, -8.89), L("Évora", 38.57, -7.91)],
    hebergements: [...BASE_HEBERGEMENTS, "auberge_jeunesse"],
    activites: [
      { id: "tram28", nom: "Tram 28 à travers l'Alfama", envies: ["architecture", "villages"], prix: 3, dureeH: 1 },
      { id: "fado", nom: "Soirée fado dans l'Alfama", envies: ["festivals", "vie_nocturne", "romantique"], prix: 40, dureeH: 3, ageMin: 12 },
      { id: "streetart-tour", nom: "Visite street-art guidée", envies: ["street_art"], prix: 20, dureeH: 2 },
      { id: "belem", nom: "Belém : tour et monastère", envies: ["musees", "unesco", "architecture"], prix: 18, dureeH: 3 },
      { id: "cours-nata", nom: "Atelier pastéis de nata", envies: ["cours_cuisine", "cuisine_locale"], prix: 45, dureeH: 2, insolite: true },
      { id: "ladra", nom: "Marché aux puces de la Feira da Ladra", envies: ["marches", "shopping"], prix: 0, dureeH: 2 },
    ],
    climat: {
      tMax: [15, 16, 19, 20, 22, 26, 28, 29, 27, 23, 18, 16],
      tMin: [8, 9, 11, 12, 14, 17, 18, 19, 18, 15, 12, 9],
      soleilH: [5, 6, 7, 8.5, 10, 11, 12, 11.5, 9, 7, 5.5, 5],
      pluieJ: [10, 9, 7, 9, 6, 2, 1, 1, 4, 8, 10, 11],
      neige: [],
    },
    affluence: [1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 1, 2],
    indicePrix: 0.85,
    estimationNuitParAdulte: 80,
    estimationTransportParAdulte: 150,
  },
  {
    id: "alpes-chamonix",
    nom: "Chamonix-Mont-Blanc",
    pays: "France",
    centre: L("Chamonix", 45.92, 6.87),
    tags: ["montagne", "randonnee", "escalade", "grands_espaces", "aventure", "lacs", "ski"],
    tagsForts: ["montagne"],
    accroche: "Face au Mont-Blanc, l'air vif et les sommets à portée de main.",
    reponses: {
      montagne: "Aiguille du Midi et Mer de Glace",
      randonnee: "Grand Balcon Nord, lac Blanc",
      escalade: "Voies des Gaillands",
      ski: "Domaines des Grands Montets et de Brévent-Flégère",
      lacs: "Lac Blanc et lac des Chéserys",
      grands_espaces: "Vallée Blanche",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport de Genève", 46.24, 6.11),
    gare: L("Gare de Chamonix", 45.92, 6.87),
    etapes: [L("Annecy", 45.9, 6.13), L("Megève", 45.86, 6.62), L("Chamonix", 45.92, 6.87), L("Évian", 46.4, 6.59)],
    hebergements: [...BASE_HEBERGEMENTS, "resort", "auberge_jeunesse", "camping", "refuge", "cabane"],
    activites: [
      { id: "aiguille-midi", nom: "Téléphérique de l'Aiguille du Midi", envies: ["montagne", "grands_espaces"], prix: 75, dureeH: 3 },
      { id: "lac-blanc", nom: "Randonnée au lac Blanc", envies: ["randonnee", "lacs", "montagne"], prix: 0, dureeH: 5, mois: [6, 7, 8, 9] },
      { id: "escalade-initiation", nom: "Initiation escalade avec guide", envies: ["escalade", "aventure"], prix: 70, dureeH: 3, ageMin: 8, mois: [5, 6, 7, 8, 9, 10] },
      { id: "forfait-ski", nom: "Forfait de ski (journée)", envies: ["ski"], prix: 62, dureeH: 6, mois: [12, 1, 2, 3, 4] },
      { id: "mer-glace", nom: "Train du Montenvers et Mer de Glace", envies: ["montagne", "activites_enfants"], prix: 38, dureeH: 3 },
      { id: "refuge-nuit", nom: "Dîner et nuit en refuge d'altitude", envies: ["aventure", "hors_sentiers"], prix: 65, dureeH: 14, insolite: true, mois: [6, 7, 8, 9] },
    ],
    climat: {
      tMax: [1, 3, 7, 11, 15, 19, 22, 21, 17, 12, 6, 2],
      tMin: [-7, -6, -3, 0, 4, 7, 9, 9, 6, 2, -3, -6],
      soleilH: [3, 4, 5, 6, 6.5, 7.5, 8, 7, 6, 5, 3, 2.5],
      pluieJ: [11, 10, 11, 12, 14, 13, 12, 12, 10, 11, 11, 11],
      neige: [1, 2, 3, 4, 12],
    },
    affluence: [3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 3],
    indicePrix: 1.3,
    estimationNuitParAdulte: 120,
    estimationTransportParAdulte: 110,
  },
  {
    id: "perigord",
    nom: "Périgord noir",
    pays: "France",
    centre: L("Sarlat-la-Canéda", 44.89, 1.22),
    tags: ["chateaux", "villages", "gastronomie", "cuisine_locale", "campagne", "foret", "musees", "calme", "velo", "unesco", "activites_enfants", "marches"],
    tagsForts: ["campagne"],
    accroche: "Châteaux sur falaises, grottes préhistoriques et tables généreuses.",
    reponses: {
      chateaux: "Beynac, Castelnaud et les jardins de Marqueyssac",
      musees: "Lascaux IV, centre international de l'art pariétal",
      villages: "Sarlat, La Roque-Gageac",
      gastronomie: "Truffe, noix et marchés de Sarlat",
      velo: "Voie verte de la vallée de la Dordogne",
      unesco: "Grottes ornées de la vallée de la Vézère",
      marches: "Marché de Sarlat le samedi",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport de Bergerac", 44.82, 0.52),
    gare: L("Gare de Sarlat", 44.88, 1.21),
    etapes: [L("Périgueux", 45.18, 0.72), L("Les Eyzies", 44.94, 1.01), L("Sarlat", 44.89, 1.22), L("Rocamadour", 44.8, 1.62)],
    hebergements: [...BASE_HEBERGEMENTS, "camping", "glamping", "cabane_perchee", "roulotte", "yourte"],
    activites: [
      { id: "lascaux", nom: "Lascaux IV", envies: ["musees", "unesco", "activites_enfants"], prix: 22, dureeH: 3 },
      { id: "canoe-dordogne", nom: "Descente de la Dordogne en canoë", envies: ["nautique", "aventure", "activites_enfants"], prix: 25, dureeH: 3, ageMin: 6, mois: [5, 6, 7, 8, 9] },
      { id: "castelnaud", nom: "Château de Castelnaud", envies: ["chateaux", "activites_enfants"], prix: 12, dureeH: 2 },
      { id: "marche-sarlat", nom: "Marché de Sarlat", envies: ["marches", "gastronomie", "cuisine_locale"], prix: 0, dureeH: 2 },
      { id: "truffe", nom: "Cavage et dégustation de truffes", envies: ["gastronomie", "insolite"], prix: 35, dureeH: 2, insolite: true, mois: [12, 1, 2] },
      { id: "voie-verte", nom: "Voie verte à vélo", envies: ["velo", "campagne"], prix: 0, dureeH: 3 },
    ],
    climat: {
      tMax: [9, 11, 15, 17, 21, 25, 28, 28, 24, 19, 13, 10],
      tMin: [1, 1, 3, 5, 9, 12, 14, 14, 11, 8, 4, 2],
      soleilH: [3, 4, 5.5, 6.5, 7.5, 8.5, 9, 8.5, 7, 5, 3.5, 3],
      pluieJ: [12, 10, 10, 11, 11, 8, 7, 7, 8, 11, 12, 12],
      neige: [],
    },
    affluence: [1, 1, 1, 2, 2, 2, 3, 3, 2, 1, 1, 1],
    indicePrix: 0.85,
    estimationNuitParAdulte: 75,
    estimationTransportParAdulte: 90,
  },
  {
    id: "crete",
    nom: "Crète",
    pays: "Grèce",
    centre: L("Héraklion", 35.34, 25.13),
    tags: ["plage", "mer_iles", "randonnee", "musees", "cuisine_locale", "baignade_facile", "plongee", "detente", "unesco"],
    tagsForts: ["plage", "mer_iles"],
    accroche: "Gorges sauvages, sites minoens et criques aux eaux chaudes.",
    reponses: {
      plage: "Elafonissi et Balos",
      mer_iles: "Lagune de Balos",
      randonnee: "Gorges de Samaria",
      musees: "Palais de Knossos et musée d'Héraklion",
      cuisine_locale: "Dakos, huile d'olive et raki",
      baignade_facile: "Plage de sable rose d'Elafonissi",
    },
    ile: true,
    continent: false,
    aeroport: L("Aéroport d'Héraklion", 35.34, 25.18),
    etapes: [L("La Canée", 35.51, 24.02), L("Réthymnon", 35.37, 24.47), L("Héraklion", 35.34, 25.13), L("Agios Nikolaos", 35.19, 25.72)],
    hebergements: [...BASE_HEBERGEMENTS, "resort", "camping"],
    activites: [
      { id: "knossos", nom: "Palais de Knossos", envies: ["musees", "architecture"], prix: 20, dureeH: 3 },
      { id: "samaria", nom: "Gorges de Samaria", envies: ["randonnee", "grands_espaces", "aventure"], prix: 10, dureeH: 7, ageMin: 10, mois: [5, 6, 7, 8, 9, 10] },
      { id: "balos", nom: "Bateau pour la lagune de Balos", envies: ["mer_iles", "plage"], prix: 35, dureeH: 7, mois: [5, 6, 7, 8, 9, 10] },
      { id: "plongee-crete", nom: "Baptême de plongée", envies: ["plongee", "nautique"], prix: 65, dureeH: 3, ageMin: 10, mois: [5, 6, 7, 8, 9, 10] },
      { id: "elafonissi", nom: "Plage d'Elafonissi", envies: ["plage", "baignade_facile"], prix: 0, dureeH: 5 },
    ],
    climat: {
      tMax: [16, 16, 18, 21, 25, 28, 30, 30, 28, 24, 21, 18],
      tMin: [9, 9, 10, 12, 15, 19, 22, 22, 19, 16, 13, 11],
      soleilH: [4, 5, 6.5, 8.5, 10.5, 12.5, 13, 12, 10, 7.5, 5.5, 4],
      pluieJ: [12, 10, 8, 5, 3, 1, 0, 0, 2, 5, 8, 11],
      neige: [],
    },
    affluence: [1, 1, 1, 2, 2, 3, 3, 3, 3, 2, 1, 1],
    indicePrix: 0.8,
    estimationNuitParAdulte: 70,
    estimationTransportParAdulte: 230,
  },
  {
    id: "islande",
    nom: "Islande du Sud",
    pays: "Islande",
    centre: L("Vík", 63.42, -19.01),
    tags: ["volcans", "grands_espaces", "aventure", "randonnee", "hors_sentiers", "insolite", "detente", "calme"],
    tagsForts: ["volcans", "grands_espaces"],
    accroche: "Glaciers, cascades et sources chaudes au bout du monde.",
    reponses: {
      volcans: "Champs de lave et volcan Eyjafjallajökull",
      grands_espaces: "Plages noires de Reynisfjara",
      detente: "Bains géothermiques",
      insolite: "Balade sur le glacier Sólheimajökull",
      calme: "Fermes isolées du sud",
    },
    ile: true,
    continent: false,
    aeroport: L("Aéroport de Keflavík", 63.99, -22.62),
    etapes: [L("Reykjavik", 64.15, -21.94), L("Selfoss", 63.93, -20.99), L("Vík", 63.42, -19.01), L("Höfn", 64.25, -15.21)],
    hebergements: ["hotel", "chambre_hotes", "location", "chez_habitant", "auberge_jeunesse", "camping", "bulle", "refuge"],
    activites: [
      { id: "glacier", nom: "Marche guidée sur le glacier Sólheimajökull", envies: ["insolite", "aventure", "grands_espaces"], prix: 110, dureeH: 3, ageMin: 10, insolite: true },
      { id: "bains", nom: "Bains géothermiques", envies: ["detente"], prix: 60, dureeH: 3 },
      { id: "cascades", nom: "Cascades de Seljalandsfoss et Skógafoss", envies: ["grands_espaces", "randonnee"], prix: 0, dureeH: 3 },
      { id: "aurores", nom: "Chasse aux aurores boréales", envies: ["insolite", "romantique"], prix: 80, dureeH: 4, insolite: true, mois: [9, 10, 11, 12, 1, 2, 3] },
      { id: "reynisfjara", nom: "Plage noire de Reynisfjara", envies: ["volcans", "grands_espaces"], prix: 0, dureeH: 2 },
    ],
    climat: {
      tMax: [2, 3, 3, 6, 10, 12, 14, 14, 11, 7, 4, 3],
      tMin: [-3, -3, -2, 0, 4, 7, 9, 8, 5, 2, -1, -3],
      soleilH: [0.5, 2, 4, 5, 6, 5.5, 5.5, 5, 4, 3, 1.5, 0.3],
      pluieJ: [15, 14, 15, 13, 12, 12, 12, 13, 15, 16, 14, 15],
      neige: [1, 2, 3, 11, 12],
    },
    affluence: [1, 1, 1, 1, 2, 3, 3, 3, 2, 1, 1, 1],
    indicePrix: 1.8,
    estimationNuitParAdulte: 180,
    estimationTransportParAdulte: 320,
  },
  {
    id: "marrakech",
    nom: "Marrakech et l'Atlas",
    pays: "Maroc",
    centre: L("Marrakech", 31.63, -8.01),
    tags: ["desert", "marches", "street_food", "cuisine_locale", "architecture", "detente", "aventure", "pas_cher", "cours_cuisine", "unesco"],
    tagsForts: ["desert"],
    accroche: "Souks parfumés, riads paisibles et premières dunes à l'horizon.",
    reponses: {
      marches: "Souks de la médina et place Jemaa el-Fna",
      desert: "Désert d'Agafay",
      detente: "Hammams et riads",
      cours_cuisine: "Ateliers tajine en médina",
      architecture: "Médersa Ben Youssef",
      unesco: "Médina de Marrakech",
    },
    ile: false,
    continent: false,
    aeroport: L("Aéroport Marrakech-Ménara", 31.61, -8.04),
    etapes: [L("Marrakech", 31.63, -8.01), L("Aït-Ben-Haddou", 31.05, -7.13), L("Ouarzazate", 30.92, -6.89), L("Essaouira", 31.51, -9.77)],
    hebergements: ["hotel", "chambre_hotes", "location", "chez_habitant", "resort", "auberge_jeunesse", "glamping", "yourte", "tipi"],
    activites: [
      { id: "agafay", nom: "Nuit sous tente berbère dans le désert d'Agafay", envies: ["desert", "insolite", "aventure"], prix: 90, dureeH: 16, insolite: true },
      { id: "cours-tajine", nom: "Cours de cuisine tajine", envies: ["cours_cuisine", "cuisine_locale"], prix: 40, dureeH: 3 },
      { id: "hammam", nom: "Hammam traditionnel", envies: ["detente"], prix: 30, dureeH: 2, ageMin: 6 },
      { id: "souks", nom: "Souks et place Jemaa el-Fna", envies: ["marches", "street_food"], prix: 0, dureeH: 3 },
      { id: "majorelle", nom: "Jardin Majorelle", envies: ["architecture"], prix: 17, dureeH: 2 },
    ],
    climat: {
      tMax: [19, 21, 23, 25, 29, 33, 37, 37, 32, 28, 23, 20],
      tMin: [6, 8, 10, 12, 15, 18, 21, 21, 19, 15, 10, 7],
      soleilH: [7, 7.5, 8.5, 9, 10, 11, 11, 10.5, 9, 8, 7, 7],
      pluieJ: [4, 4, 4, 4, 2, 1, 0, 1, 2, 3, 4, 4],
      neige: [],
    },
    affluence: [2, 2, 3, 3, 2, 1, 1, 1, 2, 3, 2, 3],
    indicePrix: 0.65,
    estimationNuitParAdulte: 60,
    estimationTransportParAdulte: 200,
  },
  {
    id: "vallee-loire",
    nom: "Vallée de la Loire",
    pays: "France",
    centre: L("Amboise", 47.41, 0.98),
    tags: ["chateaux", "velo", "vins", "unesco", "campagne", "villages", "romantique", "activites_enfants", "calme"],
    tagsForts: ["chateaux", "campagne"],
    accroche: "La Loire à vélo, de château en château et de cave en cave.",
    reponses: {
      chateaux: "Chambord, Chenonceau, Amboise",
      velo: "Itinéraire La Loire à Vélo",
      vins: "Vouvray, Chinon, Saumur",
      unesco: "Val de Loire inscrit au patrimoine mondial",
      romantique: "Jardins de Villandry",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport de Tours", 47.43, 0.73),
    gare: L("Gare d'Amboise", 47.42, 0.98),
    etapes: [L("Blois", 47.59, 1.33), L("Amboise", 47.41, 0.98), L("Tours", 47.39, 0.69), L("Saumur", 47.26, -0.08)],
    hebergements: [...BASE_HEBERGEMENTS, "camping", "glamping", "cabane_perchee", "peniche", "roulotte", "bulle"],
    activites: [
      { id: "chambord", nom: "Château de Chambord", envies: ["chateaux", "unesco", "architecture"], prix: 16, dureeH: 3 },
      { id: "chenonceau", nom: "Château de Chenonceau", envies: ["chateaux", "romantique"], prix: 17, dureeH: 3 },
      { id: "loire-velo", nom: "Une étape de La Loire à Vélo", envies: ["velo", "campagne"], prix: 0, dureeH: 4 },
      { id: "caves", nom: "Dégustation dans les caves de Vouvray", envies: ["vins", "gastronomie"], prix: 15, dureeH: 2, ageMin: 18 },
      { id: "montgolfiere", nom: "Vol en montgolfière au-dessus des châteaux", envies: ["insolite", "romantique"], prix: 230, dureeH: 3, ageMin: 6, insolite: true, mois: [4, 5, 6, 7, 8, 9, 10] },
    ],
    climat: {
      tMax: [7, 9, 13, 16, 20, 23, 26, 26, 22, 17, 11, 8],
      tMin: [1, 1, 3, 5, 9, 12, 14, 14, 11, 8, 4, 2],
      soleilH: [2, 3, 5, 6.5, 7, 8, 8.5, 8, 6.5, 4.5, 2.5, 2],
      pluieJ: [11, 9, 10, 9, 10, 8, 6, 7, 8, 10, 11, 11],
      neige: [],
    },
    affluence: [1, 1, 1, 2, 2, 3, 3, 3, 2, 2, 1, 1],
    indicePrix: 0.95,
    estimationNuitParAdulte: 85,
    estimationTransportParAdulte: 60,
  },
  {
    id: "berlin",
    nom: "Berlin",
    pays: "Allemagne",
    centre: L("Berlin", 52.52, 13.4),
    tags: ["vie_nocturne", "fete", "street_art", "musees", "architecture", "festivals", "street_food", "shopping", "velo", "unesco"],
    tagsForts: ["vie_nocturne", "shopping"],
    accroche: "Histoire à chaque coin de rue et nuits qui ne finissent jamais.",
    reponses: {
      musees: "Île aux musées",
      street_art: "East Side Gallery",
      vie_nocturne: "Clubs de Friedrichshain et Kreuzberg",
      street_food: "Markthalle Neun",
      velo: "Pistes cyclables le long du Mur",
      unesco: "Île aux musées",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport de Berlin-Brandebourg", 52.37, 13.5),
    gare: L("Berlin Hauptbahnhof", 52.53, 13.37),
    etapes: [L("Berlin", 52.52, 13.4), L("Potsdam", 52.39, 13.06), L("Leipzig", 51.34, 12.37), L("Dresde", 51.05, 13.74)],
    hebergements: ["hotel", "location", "chez_habitant", "auberge_jeunesse", "peniche"],
    activites: [
      { id: "ile-musees", nom: "Île aux musées (pass journée)", envies: ["musees", "unesco"], prix: 24, dureeH: 5 },
      { id: "east-side", nom: "East Side Gallery", envies: ["street_art"], prix: 0, dureeH: 2 },
      { id: "velo-mur", nom: "Le Mur de Berlin à vélo", envies: ["velo", "musees"], prix: 30, dureeH: 4, ageMin: 10 },
      { id: "reichstag", nom: "Coupole du Reichstag", envies: ["architecture"], prix: 0, dureeH: 1 },
      { id: "berlin-souterrain", nom: "Berlin souterrain : bunkers et tunnels", envies: ["insolite", "musees"], prix: 16, dureeH: 2, ageMin: 7, insolite: true },
    ],
    climat: {
      tMax: [3, 5, 9, 15, 20, 23, 25, 24, 20, 14, 8, 4],
      tMin: [-2, -2, 1, 4, 9, 12, 14, 14, 10, 6, 2, -1],
      soleilH: [1.5, 2.5, 4, 6.5, 8, 8.5, 8, 7.5, 5.5, 4, 2, 1.5],
      pluieJ: [10, 8, 9, 8, 9, 9, 9, 8, 8, 8, 9, 10],
      neige: [],
    },
    affluence: [1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2],
    indicePrix: 1.0,
    estimationNuitParAdulte: 95,
    estimationTransportParAdulte: 160,
  },
  {
    id: "lacs-italiens",
    nom: "Lac de Côme",
    pays: "Italie",
    centre: L("Bellagio", 45.98, 9.26),
    tags: ["lacs", "romantique", "villages", "haut_de_gamme", "architecture", "gastronomie", "detente", "montagne", "nautique"],
    tagsForts: ["lacs"],
    accroche: "Villas, jardins suspendus et bateaux d'une rive à l'autre.",
    reponses: {
      lacs: "Tour du lac en bateau-bus",
      romantique: "Jardins de la villa del Balbianello",
      villages: "Bellagio et Varenna",
      gastronomie: "Risotto au poisson du lac",
      haut_de_gamme: "Hôtels-villas au bord de l'eau",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport de Milan-Malpensa", 45.63, 8.72),
    gare: L("Gare de Côme", 45.81, 9.07),
    etapes: [L("Côme", 45.81, 9.08), L("Bellagio", 45.98, 9.26), L("Varenna", 46.01, 9.28), L("Bergame", 45.7, 9.67)],
    hebergements: [...BASE_HEBERGEMENTS, "resort"],
    activites: [
      { id: "balbianello", nom: "Villa del Balbianello", envies: ["romantique", "architecture"], prix: 25, dureeH: 2 },
      { id: "bateau-lac", nom: "Pass bateau sur le lac", envies: ["lacs", "villages"], prix: 18, dureeH: 6 },
      { id: "riva", nom: "Balade en bateau Riva d'époque", envies: ["haut_de_gamme", "romantique", "insolite"], prix: 120, dureeH: 1, insolite: true, mois: [4, 5, 6, 7, 8, 9, 10] },
      { id: "greenway", nom: "Greenway del Lago", envies: ["randonnee", "lacs"], prix: 0, dureeH: 3 },
      { id: "kayak-come", nom: "Kayak au pied des villas", envies: ["nautique", "lacs"], prix: 35, dureeH: 2, ageMin: 8, mois: [5, 6, 7, 8, 9] },
    ],
    climat: {
      tMax: [7, 10, 14, 18, 22, 26, 29, 28, 24, 18, 12, 8],
      tMin: [0, 1, 4, 8, 12, 16, 18, 18, 14, 10, 5, 1],
      soleilH: [3.5, 4.5, 5.5, 6, 7, 8, 9, 8, 6.5, 4.5, 3, 3],
      pluieJ: [6, 5, 7, 10, 12, 10, 8, 9, 7, 9, 9, 7],
      neige: [],
    },
    affluence: [1, 1, 2, 2, 3, 3, 3, 3, 3, 2, 1, 1],
    indicePrix: 1.5,
    estimationNuitParAdulte: 150,
    estimationTransportParAdulte: 170,
  },
  {
    id: "jura",
    nom: "Jura",
    pays: "France",
    centre: L("Les Rousses", 46.49, 6.06),
    tags: ["foret", "lacs", "calme", "randonnee", "velo", "hors_sentiers", "cuisine_locale", "pas_cher", "insolite", "ski", "vins"],
    tagsForts: ["foret", "calme"],
    accroche: "Forêts profondes, lacs secrets et comté à l'affinage.",
    reponses: {
      foret: "Forêt du Risoux",
      lacs: "Cascades du Hérisson et lac de Vouglans",
      cuisine_locale: "Comté, morbier et vin jaune",
      insolite: "Nuit en cabane perchée",
      calme: "Hameaux du Haut-Jura",
      ski: "Ski de fond aux Rousses",
      vins: "Vin jaune d'Arbois",
    },
    ile: false,
    continent: true,
    aeroport: L("Aéroport de Genève", 46.24, 6.11),
    gare: L("Gare de Morez", 46.52, 6.02),
    etapes: [L("Arbois", 46.9, 5.77), L("Lons-le-Saunier", 46.67, 5.55), L("Clairvaux-les-Lacs", 46.57, 5.75), L("Les Rousses", 46.49, 6.06)],
    hebergements: [...BASE_HEBERGEMENTS, "camping", "cabane", "cabane_perchee", "yourte", "tipi", "refuge", "roulotte"],
    activites: [
      { id: "herisson", nom: "Cascades du Hérisson", envies: ["lacs", "randonnee", "foret"], prix: 0, dureeH: 4 },
      { id: "fromagerie", nom: "Fort des Rousses : caves d'affinage du comté", envies: ["cuisine_locale", "gastronomie", "insolite"], prix: 14, dureeH: 2 },
      { id: "chiens-traineau", nom: "Balade en chiens de traîneau", envies: ["insolite", "aventure", "activites_enfants"], prix: 85, dureeH: 2, ageMin: 4, insolite: true, mois: [12, 1, 2, 3] },
      { id: "ski-fond", nom: "Ski de fond (location et forfait)", envies: ["ski"], prix: 25, dureeH: 4, mois: [12, 1, 2, 3] },
      { id: "velo-jura", nom: "Grande traversée du Jura à vélo (une étape)", envies: ["velo", "foret"], prix: 0, dureeH: 4, mois: [5, 6, 7, 8, 9, 10] },
    ],
    climat: {
      tMax: [1, 2, 6, 10, 14, 18, 21, 20, 16, 12, 5, 2],
      tMin: [-7, -7, -4, -1, 3, 7, 9, 9, 6, 3, -2, -5],
      soleilH: [2.5, 3.5, 4.5, 5, 6, 7, 8, 7, 6, 4.5, 2.5, 2],
      pluieJ: [13, 11, 12, 13, 14, 13, 11, 12, 11, 12, 13, 13],
      neige: [1, 2, 3, 12],
    },
    affluence: [2, 2, 1, 1, 1, 2, 3, 3, 1, 1, 1, 2],
    indicePrix: 0.8,
    estimationNuitParAdulte: 65,
    estimationTransportParAdulte: 80,
  },
  {
    id: "canaries",
    nom: "Tenerife",
    pays: "Espagne",
    centre: L("Puerto de la Cruz", 28.41, -16.55),
    tags: ["volcans", "plage", "mer_iles", "randonnee", "plongee", "animaux", "parcs_attractions", "activites_enfants", "baignade_facile"],
    tagsForts: ["volcans", "plage"],
    accroche: "Le printemps toute l'année, entre le Teide et l'océan.",
    reponses: {
      volcans: "Parc national du Teide",
      plongee: "Tortues de mer à El Puertito",
      animaux: "Observation des cétacés",
      parcs_attractions: "Siam Park",
      plage: "Plage de Las Teresitas",
    },
    ile: true,
    continent: false,
    aeroport: L("Aéroport de Tenerife Sud", 28.04, -16.57),
    etapes: [L("Santa Cruz", 28.46, -16.25), L("La Laguna", 28.49, -16.32), L("Puerto de la Cruz", 28.41, -16.55), L("Los Gigantes", 28.24, -16.84)],
    hebergements: [...BASE_HEBERGEMENTS, "resort", "auberge_jeunesse", "glamping"],
    activites: [
      { id: "teide", nom: "Téléphérique du Teide", envies: ["volcans", "grands_espaces"], prix: 40, dureeH: 4 },
      { id: "cetaces", nom: "Sortie en mer avec les cétacés", envies: ["animaux", "mer_iles"], prix: 35, dureeH: 3 },
      { id: "tortues", nom: "Snorkeling avec les tortues à El Puertito", envies: ["plongee", "nautique"], prix: 40, dureeH: 3, ageMin: 8, insolite: true },
      { id: "siam", nom: "Siam Park", envies: ["parcs_attractions", "activites_enfants"], prix: 42, dureeH: 6 },
      { id: "teresitas", nom: "Plage de Las Teresitas", envies: ["plage", "baignade_facile"], prix: 0, dureeH: 4 },
    ],
    climat: {
      tMax: [21, 21, 22, 23, 24, 26, 28, 29, 28, 26, 24, 22],
      tMin: [15, 15, 15, 16, 17, 19, 20, 21, 21, 19, 17, 16],
      soleilH: [6, 6.5, 7.5, 8, 9.5, 10.5, 11, 10.5, 8.5, 7, 6, 5.5],
      pluieJ: [6, 5, 4, 2, 1, 0, 0, 0, 1, 3, 5, 6],
      neige: [],
    },
    affluence: [3, 3, 3, 2, 1, 2, 3, 3, 2, 2, 2, 3],
    indicePrix: 0.95,
    estimationNuitParAdulte: 90,
    estimationTransportParAdulte: 250,
  },
];

export const destinationParId = (id: string) => DESTINATIONS.find((d) => d.id === id);
