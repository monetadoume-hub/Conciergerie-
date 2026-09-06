"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function sendManualResponse(messageId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  const response = String(formData.get("response") ?? "").trim();
  if (!response) return;

  await supabase
    .from("guest_messages")
    .update({ final_response: response, status: "resolu", answered_at: new Date().toISOString() })
    .eq("id", messageId);

  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
}

export async function markMessageResolved(messageId: string) {
  const supabase = await createClient();
  await supabase.from("guest_messages").update({ status: "resolu" }).eq("id", messageId);
  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("agency_id", user.agency_id)
    .is("read_at", null);
}
