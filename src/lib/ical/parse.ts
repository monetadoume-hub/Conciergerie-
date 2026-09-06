import ical, { type VEvent } from "node-ical";
import type { BookingSource } from "@/types/database";

export interface ParsedIcalEvent {
  ical_uid: string;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  summary: string;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Fetches and parses a single platform's iCal feed into a normalised list of
 * events. Airbnb/Abritel/Booking feeds only ever expose UID + date range —
 * never price or guest contact details (cahier des charges §5.2) — so this
 * intentionally does not try to extract more than that.
 */
export async function fetchIcalEvents(url: string): Promise<ParsedIcalEvent[]> {
  const data = await ical.async.fromURL(url);

  return Object.values(data)
    .filter((entry): entry is VEvent => entry?.type === "VEVENT")
    .filter((event) => event.start && event.end)
    .map((event) => ({
      ical_uid: event.uid,
      checkin: toDateOnly(event.start),
      checkout: toDateOnly(event.end!),
      summary: typeof event.summary === "string" ? event.summary : (event.summary?.val ?? ""),
    }));
}

export const PLATFORM_SOURCES: { field: "ical_url_airbnb" | "ical_url_abritel" | "ical_url_booking"; source: BookingSource }[] = [
  { field: "ical_url_airbnb", source: "airbnb" },
  { field: "ical_url_abritel", source: "abritel" },
  { field: "ical_url_booking", source: "booking" },
];
