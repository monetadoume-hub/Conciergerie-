import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskDetail } from "./TaskDetail";

export default async function CleaningTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("cleaning_tasks")
    .select("*, properties(name)")
    .eq("id", id)
    .single();

  if (!task) notFound();

  // Countdown target: the next confirmed booking checking in at this
  // property after today (cahier des charges §15, écran 2 — "heure limite
  // avant prochaine arrivée").
  const { data: nextBooking } = await supabase
    .from("bookings")
    .select("checkin")
    .eq("property_id", task.property_id)
    .eq("status", "confirmed")
    .gte("checkin", new Date().toISOString().slice(0, 10))
    .order("checkin", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <TaskDetail
      task={task}
      propertyName={(task.properties as unknown as { name: string } | null)?.name ?? ""}
      nextCheckin={nextBooking?.checkin ?? null}
    />
  );
}
