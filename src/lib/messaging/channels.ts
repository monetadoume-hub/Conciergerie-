import { sendEmail } from "@/lib/messaging/resend";
import type { BookingSource } from "@/types/database";

export interface ChannelMessage {
  guestEmail: string | null;
  subject: string;
  text: string;
}

export interface ChannelSendResult {
  channelUsed: "airbnb_inbox" | "abritel_inbox" | "booking_inbox" | "email";
}

/**
 * Where a message SHOULD go, ideally: the guest's own inbox on the platform
 * they booked through (cahier des charges — this file). Airbnb, Abritel/Vrbo
 * and Booking.com only expose that messaging inbox to applications approved
 * through their official partner programs (Airbnb Partner API, Expedia/Vrbo
 * Partner Central, Booking.com Connectivity API) — a months-long business
 * application, not an API key you generate yourself. Until this agency holds
 * such credentials (env vars below), every channel silently falls back to
 * email so guests are never left without a reply; `channelUsed` in the
 * result always records what actually happened, never what was intended.
 */
function partnerCredentialsFor(source: BookingSource): boolean {
  switch (source) {
    case "airbnb":
      return Boolean(process.env.AIRBNB_PARTNER_API_TOKEN);
    case "abritel":
      return Boolean(process.env.ABRITEL_PARTNER_API_TOKEN);
    case "booking":
      return Boolean(process.env.BOOKING_PARTNER_API_TOKEN);
    default:
      return false;
  }
}

/**
 * Sends a guest-facing message through the most appropriate channel for the
 * booking's source, falling back to email whenever the platform inbox isn't
 * actually reachable (no partner credentials configured — true for every
 * agency today, cf. cahier des charges §5.2/§11/§21).
 */
export async function sendGuestChannelMessage(
  source: BookingSource,
  message: ChannelMessage
): Promise<ChannelSendResult> {
  if (source !== "direct" && partnerCredentialsFor(source)) {
    // A partner token is configured, but the real API call still needs to be
    // written against that platform's actual documentation once access is
    // granted (see the module comment) — this is intentionally not stubbed
    // out with a fake request that would look like it works and doesn't.
    throw new Error(
      `Jeton API partenaire ${source} détecté mais l'appel d'envoi n'est pas encore implémenté dans channels.ts.`
    );
  }

  if (!message.guestEmail) {
    throw new Error("Aucun email locataire connu et aucun accès à la messagerie de la plateforme");
  }

  await sendEmail({ to: message.guestEmail, subject: message.subject, text: message.text });
  return { channelUsed: "email" };
}
