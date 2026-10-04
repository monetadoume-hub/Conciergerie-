// Listes partagées entre la page (navigateur) et le serveur.
// Le serveur s'en sert pour vérifier que ce que la page envoie est valide.

export const ENVIES = [
  { id: "plage", e: "🏖️", t: "Plage", l: ["sea", "palm"] },
  { id: "chateaux", e: "🏰", t: "Châteaux", l: ["castle"] },
  { id: "montagne", e: "⛰️", t: "Montagne", l: ["mountains"] },
  { id: "nature", e: "🌲", t: "Nature", l: ["trees"] },
  { id: "ville", e: "🏙️", t: "Ville & shopping", l: ["city"] },
  { id: "culture", e: "🏛️", t: "Musées & histoire", l: ["city", "castle"] },
  { id: "gastronomie", e: "🍽️", t: "Gastronomie", l: [] },
  { id: "detente", e: "🧘", t: "Détente", l: ["sea"] },
  { id: "aventure", e: "🧗", t: "Aventure", l: ["mountains", "trees"] },
  { id: "parcs", e: "🎢", t: "Parcs d'attractions", l: ["wheel"] },
  { id: "neige", e: "❄️", t: "Neige", l: ["mountains", "snow"] },
  { id: "fete", e: "🎉", t: "Faire la fête", l: ["city"] },
  { id: "pascher", e: "💸", t: "Pas cher", l: [] },
  { id: "soleil", e: "☀️", t: "Soleil garanti", l: [] },
];

export const TRANSPORTS = [
  { id: "avion", e: "✈️", t: "Avion" },
  { id: "train", e: "🚆", t: "Train" },
  { id: "bateau", e: "⛴️", t: "Bateau" },
  { id: "bus", e: "🚌", t: "Bus" },
  { id: "covoiturage", e: "🚗", t: "Covoiturage" },
  { id: "voiture", e: "🚙", t: "Ma voiture" },
];

export const LODGINGS = [
  { id: "hotel", e: "🏨", t: "Hôtel", k: 1.1 },
  { id: "hotes", e: "🏡", t: "Chambre d'hôtes", k: 1 },
  { id: "habitant", e: "🔑", t: "Chez l'habitant", k: 0.7 },
  { id: "resort", e: "🌴", t: "Resort", k: 2 },
  { id: "gite", e: "🛖", t: "Gîte", k: 0.9 },
  { id: "camping", e: "⛺", t: "Camping", k: 0.5 },
];

export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Bornes des compteurs et du budget (utilisées par la page ET par le serveur).
export const LIMITES = {
  adults: [1, 12],
  children: [0, 10],
  nights: [1, 30],
  budget: [200, 6000],
  voyageurs: 6,
  prenom: 24,
  reve: 220,
  ville: 60,
};
