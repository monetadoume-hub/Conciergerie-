import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssignSelect } from "./AssignSelect";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<string, string> = {
  todo: "à faire",
  in_progress: "en cours",
  done: "terminé",
};

export default async function CleaningPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const isCleanerView = user.role === "cleaner";

  let query = supabase
    .from("cleaning_tasks")
    .select("id, scheduled_date, status, assigned_to, properties(name), bookings(checkin, checkout)")
    .order("scheduled_date", { ascending: true });

  query = isCleanerView
    ? query.eq("assigned_to", user.id).eq("scheduled_date", todayStr())
    : query.gte("scheduled_date", todayStr()).limit(50);

  const { data: tasks } = await query;

  const { data: cleaners } = isCleanerView
    ? { data: [] as { id: string; full_name: string | null }[] }
    : await supabase.from("users").select("id, full_name").eq("role", "cleaner");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {isCleanerView ? "Mes tâches du jour" : "Planning des ménages"}
        </h1>
        {isCleanerView && (
          <p className="text-sm text-neutral-500">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        )}
      </div>

      {!tasks?.length && (
        <p className="text-sm text-neutral-500">
          {isCleanerView ? "Aucune tâche assignée aujourd'hui." : "Aucun ménage à venir."}
        </p>
      )}

      <ul className="space-y-2">
        {tasks?.map((task) => {
          const done = task.status === "done";
          return (
            <li
              key={task.id}
              className={`rounded-lg border border-neutral-200 bg-white p-4 ${done ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <Link href={`/menages/${task.id}`} className="flex-1">
                  <p className={`text-sm font-medium ${done ? "line-through" : ""}`}>
                    {(task.properties as unknown as { name: string } | null)?.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {isCleanerView ? "" : `${task.scheduled_date} — `}
                    {STATUS_LABEL[task.status]}
                  </p>
                </Link>

                {!isCleanerView && (
                  <AssignSelect taskId={task.id} assignedTo={task.assigned_to} cleaners={cleaners ?? []} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
