import type { MessageChannel, MessageTrigger } from "@/types/database";

export interface DefaultTemplate {
  trigger: MessageTrigger;
  channel: MessageChannel;
  subject: string | null;
  body: string;
}

// Seeded into every new agency (see signup/actions.ts) so message sequences
// work out of the box; each agency can then customise wording per §5.6.
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    trigger: "booking_confirmed",
    channel: "email",
    subject: "Votre réservation à {{property_name}} est confirmée",
    body: "Bonjour {{guest_name}},\n\nVotre séjour à {{property_name}} du {{checkin}} au {{checkout}} est confirmé.\nVous recevrez toutes les instructions pratiques quelques jours avant votre arrivée.\n\nÀ bientôt,\n{{agency_name}}",
  },
  {
    trigger: "before_checkin",
    channel: "email",
    subject: "Votre arrivée à {{property_name}} approche",
    body: "Bonjour {{guest_name}},\n\nVotre arrivée à {{property_name}} est prévue le {{checkin}}. Voici votre guide digital avec toutes les informations utiles (accès, wifi, équipements) :\n{{guide_url}}\n\nÀ très vite,\n{{agency_name}}",
  },
  {
    trigger: "welcome_day",
    channel: "email",
    subject: "Bienvenue à {{property_name}}",
    body: "Bonjour {{guest_name}},\n\nBienvenue ! Retrouvez le guide complet du logement (accès, wifi, recommandations) ici :\n{{guide_url}}\n\nBon séjour,\n{{agency_name}}",
  },
  {
    trigger: "after_checkout",
    channel: "email",
    subject: "Merci pour votre séjour à {{property_name}}",
    body: "Bonjour {{guest_name}},\n\nMerci d'avoir séjourné à {{property_name}}. Nous espérons que tout s'est bien passé !\nSi vous avez un instant, un avis nous aiderait beaucoup.\n\n{{agency_name}}",
  },
];

export interface TemplateVars {
  guest_name?: string | null;
  property_name?: string;
  checkin?: string;
  checkout?: string;
  guide_url?: string;
  agency_name?: string;
}

export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const value = vars[key as keyof TemplateVars];
    return value ?? "";
  });
}
