"use client";

import { useTransition } from "react";
import { assignCleaningTask } from "./actions";

export function AssignSelect({
  taskId,
  assignedTo,
  cleaners,
}: {
  taskId: string;
  assignedTo: string | null;
  cleaners: { id: string; full_name: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={assignedTo ?? ""}
      disabled={isPending}
      onChange={(e) => startTransition(() => assignCleaningTask(taskId, e.target.value || null))}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
    >
      <option value="">Non assigné</option>
      {cleaners.map((c) => (
        <option key={c.id} value={c.id}>
          {c.full_name ?? c.id}
        </option>
      ))}
    </select>
  );
}
