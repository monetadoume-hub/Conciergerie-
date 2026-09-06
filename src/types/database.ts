export type UserRole = "admin" | "staff" | "cleaner";
export type BookingSource = "airbnb" | "abritel" | "booking" | "direct";
export type BookingStatus = "confirmed" | "cancelled";
export type CleaningStatus = "todo" | "in_progress" | "done";
export type MessageTrigger =
  | "booking_confirmed"
  | "before_checkin"
  | "welcome_day"
  | "after_checkout"
  | "custom";
export type MessageChannel = "email" | "whatsapp" | "sms";
export type ScheduledMessageStatus = "pending" | "sent" | "failed" | "cancelled";

export interface Agency {
  id: string;
  name: string;
  plan: "starter" | "pro" | "agence_plus";
  commission_rate_default: number;
  logo_url: string | null;
  brand_color: string | null;
  whatsapp_number: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  agency_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Owner {
  id: string;
  agency_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_rate: number | null;
  created_at: string;
}

export interface GuidebookContent {
  access?: string;
  wifi_network?: string;
  wifi_password?: string;
  equipment?: string;
  around?: string;
}

export interface Property {
  id: string;
  agency_id: string;
  owner_id: string | null;
  name: string;
  address: string | null;
  photos: string[];
  ical_url_airbnb: string | null;
  ical_url_abritel: string | null;
  ical_url_booking: string | null;
  access_code: string | null;
  guidebook_content: GuidebookContent;
  cleaning_checklist: string[];
  created_at: string;
}

export interface Booking {
  id: string;
  agency_id: string;
  property_id: string;
  source: BookingSource;
  ical_uid: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  checkin: string;
  checkout: string;
  price: number | null;
  deposit_amount: number | null;
  status: BookingStatus;
  guide_token: string;
  created_at: string;
  updated_at: string;
}

export interface CleaningTask {
  id: string;
  agency_id: string;
  property_id: string;
  booking_id: string | null;
  scheduled_date: string;
  assigned_to: string | null;
  status: CleaningStatus;
  linen_checklist: { item_type: string; quantity: number }[];
  extra_checklist_items: string[];
  checklist_done: string[];
  photos_after: string[];
  created_at: string;
}

export interface Incident {
  id: string;
  agency_id: string;
  property_id: string;
  booking_id: string | null;
  reported_by: string | null;
  description: string;
  photos: string[];
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  repair_needed: boolean;
  repair_company: string | null;
  repair_cost: number | null;
  recovery_source: "caution_locataire" | "assurance" | "agence" | "proprietaire" | null;
  recovery_status: "en_attente" | "reclame" | "recupere" | "perdu" | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  agency_id: string;
  trigger: MessageTrigger;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  active: boolean;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  agency_id: string;
  booking_id: string;
  template_id: string;
  send_at: string;
  status: ScheduledMessageStatus;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}
