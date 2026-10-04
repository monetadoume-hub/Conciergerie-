// Catalogue hors ligne : le filet de secours quand aucune donnée réelle n'est disponible.
// Les prix ci-dessous sont des ORDRES DE GRANDEUR rédigés à la main, pas des prix relevés
// chez un partenaire. L'interface doit toujours les présenter comme des estimations.

export interface DestinationCatalogue {
  id: string;
  nom: string;
  pays: string;
  /** Envies que la destination satisfait bien. */
  tags: string[];
  /** Caractéristiques dominantes : un voyageur qui les refuse exclut la destination. */
  tagsForts: string[];
  accroche: string;
  /** Pour chaque envie, ce que le voyageur y trouvera. */
  reponses: Record<string, string>;
  /** Estimation hébergement + activités, par adulte et par nuit (EUR). */
  estimationNuitParAdulte: number;
  /** Estimation aller-retour depuis la France, par adulte (EUR). */
  estimationTransportParAdulte: number;
}

export const CATALOGUE: DestinationCatalogue[] = [
  {
    id: "corse-sud",
    nom: "Corse du Sud",
    pays: "France",
    tags: ["plage", "mer_iles", "montagne", "randonnee", "soleil", "chaleur", "plongee", "cuisine_locale", "villages", "baignade_facile"],
    tagsForts: ["plage", "mer_iles", "montagne"],
    accroche: "Mer turquoise le matin, aiguilles de granit l'après-midi.",
    reponses: {
      plage: "Palombaggia et Rondinara",
      montagne: "Aiguilles de Bavella",
      randonnee: "Sentiers de Bavella et du Cuscionu",
      plongee: "Réserve des îles Lavezzi",
      villages: "Sartène et Bonifacio",
      cuisine_locale: "Charcuterie, brocciu et fromages de montagne",
    },
    estimationNuitParAdulte: 95,
    estimationTransportParAdulte: 180,
  },
  {
    id: "lisbonne",
    nom: "Lisbonne",
    pays: "Portugal",
    tags: ["shopping", "vie_nocturne", "street_art", "architecture", "musees", "street_food", "cuisine_locale", "douceur", "soleil", "pas_cher", "marches"],
    tagsForts: ["shopping", "vie_nocturne"],
    accroche: "Tramways, azulejos et pastéis de nata au soleil de l'Atlantique.",
    reponses: {
      street_art: "Quartiers de Graça et LX Factory",
      vie_nocturne: "Bairro Alto et Cais do Sodré",
      architecture: "Monastère des Hiéronymites à Belém",
      street_food: "Time Out Market et bifanas",
      marches: "Feira da Ladra",
    },
    estimationNuitParAdulte: 80,
    estimationTransportParAdulte: 150,
  },
  {
    id: "alpes-chamonix",
    nom: "Chamonix-Mont-Blanc",
    pays: "France",
    tags: ["montagne", "randonnee", "escalade", "ski", "neige", "fraicheur", "grands_espaces", "aventure", "lacs"],
    tagsForts: ["montagne"],
    accroche: "Face au Mont-Blanc, l'air vif et les sommets à portée de main.",
    reponses: {
      montagne: "Aiguille du Midi et Mer de Glace",
      randonnee: "Grand Balcon Nord, lac Blanc",
      escalade: "Voies des Gaillands",
      ski: "Domaines des Grands Montets et de Brévent-Flégère (en saison)",
      lacs: "Lac Blanc et lac des Chéserys",
    },
    estimationNuitParAdulte: 120,
    estimationTransportParAdulte: 110,
  },
  {
    id: "perigord",
    nom: "Périgord noir",
    pays: "France",
    tags: ["chateaux", "villages", "gastronomie", "cuisine_locale", "campagne", "foret", "musees", "calme", "velo", "unesco", "activites_enfants"],
    tagsForts: ["campagne"],
    accroche: "Châteaux sur falaises, grottes préhistoriques et tables généreuses.",
    reponses: {
      chateaux: "Beynac, Castelnaud et les jardins de Marqueyssac",
      musees: "Lascaux IV, centre international de l'art pariétal",
      villages: "Sarlat, La Roque-Gageac",
      gastronomie: "Truffe, noix et marchés de Sarlat",
      velo: "Voie verte de la vallée de la Dordogne",
      unesco: "Grottes ornées de la vallée de la Vézère",
    },
    estimationNuitParAdulte: 75,
    estimationTransportParAdulte: 90,
  },
  {
    id: "crete",
    nom: "Crète",
    pays: "Grèce",
    tags: ["plage", "mer_iles", "soleil", "chaleur", "randonnee", "musees", "cuisine_locale", "baignade_facile", "plongee", "detente"],
    tagsForts: ["plage", "mer_iles"],
    accroche: "Gorges sauvages, sites minoens et criques aux eaux chaudes.",
    reponses: {
      plage: "Elafonissi et Balos",
      randonnee: "Gorges de Samaria",
      musees: "Palais de Knossos et musée d'Héraklion",
      cuisine_locale: "Dakos, huile d'olive et raki",
    },
    estimationNuitParAdulte: 70,
    estimationTransportParAdulte: 230,
  },
  {
    id: "islande",
    nom: "Islande du Sud",
    pays: "Islande",
    tags: ["volcans", "grands_espaces", "aventure", "randonnee", "fraicheur", "hors_sentiers", "insolite", "detente"],
    tagsForts: ["volcans", "grands_espaces", "fraicheur"],
    accroche: "Glaciers, cascades et sources chaudes au bout du monde.",
    reponses: {
      volcans: "Champs de lave et volcan Eyjafjallajökull",
      grands_espaces: "Plages noires de Reynisfjara",
      detente: "Bains géothermiques",
      insolite: "Balade sur le glacier Sólheimajökull",
    },
    estimationNuitParAdulte: 180,
    estimationTransportParAdulte: 320,
  },
  {
    id: "marrakech",
    nom: "Marrakech et l'Atlas",
    pays: "Maroc",
    tags: ["desert", "marches", "street_food", "cuisine_locale", "chaleur", "soleil", "architecture", "detente", "aventure", "pas_cher", "cours_cuisine"],
    tagsForts: ["desert", "chaleur"],
    accroche: "Souks parfumés, riads paisibles et premières dunes à l'horizon.",
    reponses: {
      marches: "Souks de la médina et place Jemaa el-Fna",
      desert: "Désert d'Agafay",
      detente: "Hammams et riads",
      cours_cuisine: "Ateliers tajine en médina",
    },
    estimationNuitParAdulte: 60,
    estimationTransportParAdulte: 200,
  },
  {
    id: "vallee-loire",
    nom: "Vallée de la Loire",
    pays: "France",
    tags: ["chateaux", "velo", "vins", "unesco", "campagne", "douceur", "villages", "romantique", "activites_enfants", "calme"],
    tagsForts: ["chateaux", "campagne"],
    accroche: "La Loire à vélo, de château en château et de cave en cave.",
    reponses: {
      chateaux: "Chambord, Chenonceau, Amboise",
      velo: "Itinéraire La Loire à Vélo",
      vins: "Vouvray, Chinon, Saumur",
      unesco: "Val de Loire inscrit au patrimoine mondial",
    },
    estimationNuitParAdulte: 85,
    estimationTransportParAdulte: 60,
  },
  {
    id: "berlin",
    nom: "Berlin",
    pays: "Allemagne",
    tags: ["vie_nocturne", "fete", "street_art", "musees", "architecture", "festivals", "street_food", "shopping"],
    tagsForts: ["vie_nocturne", "shopping"],
    accroche: "Histoire à chaque coin de rue et nuits qui ne finissent jamais.",
    reponses: {
      musees: "Île aux musées",
      street_art: "East Side Gallery",
      vie_nocturne: "Clubs de Friedrichshain et Kreuzberg",
      street_food: "Markthalle Neun",
    },
    estimationNuitParAdulte: 95,
    estimationTransportParAdulte: 160,
  },
  {
    id: "lacs-italiens",
    nom: "Lac de Côme",
    pays: "Italie",
    tags: ["lacs", "romantique", "villages", "haut_de_gamme", "douceur", "architecture", "gastronomie", "detente", "montagne"],
    tagsForts: ["lacs"],
    accroche: "Villas, jardins suspendus et bateaux d'une rive à l'autre.",
    reponses: {
      lacs: "Tour du lac en bateau-bus",
      romantique: "Jardins de la villa del Balbianello",
      villages: "Bellagio et Varenna",
      gastronomie: "Risotto au poisson du lac",
    },
    estimationNuitParAdulte: 150,
    estimationTransportParAdulte: 170,
  },
  {
    id: "jura",
    nom: "Jura",
    pays: "France",
    tags: ["foret", "lacs", "calme", "randonnee", "velo", "fraicheur", "hors_sentiers", "cuisine_locale", "pas_cher", "neige", "insolite"],
    tagsForts: ["foret", "calme"],
    accroche: "Forêts profondes, lacs secrets et comté à l'affinage.",
    reponses: {
      foret: "Forêt du Risoux",
      lacs: "Cascades du Hérisson et lac de Vouglans",
      cuisine_locale: "Comté, morbier et vin jaune",
      insolite: "Nuit en cabane perchée",
      calme: "Hameaux du Haut-Jura",
    },
    estimationNuitParAdulte: 65,
    estimationTransportParAdulte: 80,
  },
  {
    id: "canaries",
    nom: "Tenerife",
    pays: "Espagne",
    tags: ["volcans", "plage", "soleil", "douceur", "randonnee", "plongee", "animaux", "parcs_attractions", "activites_enfants", "baignade_facile"],
    tagsForts: ["volcans", "plage"],
    accroche: "Le printemps toute l'année, entre le Teide et l'océan.",
    reponses: {
      volcans: "Parc national du Teide",
      plongee: "Tortues de mer à El Puertito",
      animaux: "Observation des cétacés",
      parcs_attractions: "Siam Park",
    },
    estimationNuitParAdulte: 90,
    estimationTransportParAdulte: 250,
  },
];
