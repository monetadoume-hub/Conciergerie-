import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";

// Fetches the signed-in user's profile row (agency_id, role) rather than just
// the auth session — every dashboard page needs the former, not the latter.
export async function requireUser(): Promise<AppUser> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return profile as AppUser;
}
