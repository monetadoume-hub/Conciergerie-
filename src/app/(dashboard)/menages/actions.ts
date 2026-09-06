"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignCleaningTask(taskId: string, userId: string | null) {
  const supabase = await createClient();
  await supabase.from("cleaning_tasks").update({ assigned_to: userId }).eq("id", taskId);
  revalidatePath("/menages");
}

export async function setCleaningTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
  const supabase = await createClient();
  await supabase.from("cleaning_tasks").update({ status }).eq("id", taskId);
  revalidatePath("/menages");
  revalidatePath(`/menages/${taskId}`);
}

export async function toggleChecklistItem(taskId: string, item: string, done: boolean) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("cleaning_tasks").select("checklist_done").eq("id", taskId).single();
  if (!task) return;

  const current = new Set<string>(task.checklist_done ?? []);
  if (done) current.add(item);
  else current.delete(item);

  await supabase.from("cleaning_tasks").update({ checklist_done: Array.from(current) }).eq("id", taskId);
  revalidatePath(`/menages/${taskId}`);
}

export async function addCleaningPhoto(taskId: string, photoUrl: string) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("cleaning_tasks").select("photos_after").eq("id", taskId).single();
  if (!task) return;

  await supabase
    .from("cleaning_tasks")
    .update({ photos_after: [...(task.photos_after ?? []), photoUrl] })
    .eq("id", taskId);
  revalidatePath(`/menages/${taskId}`);
}
