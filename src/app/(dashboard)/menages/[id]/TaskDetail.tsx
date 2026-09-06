"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addCleaningPhoto, setCleaningTaskStatus, toggleChecklistItem } from "../actions";
import type { CleaningTask } from "@/types/database";

function formatCountdown(nextCheckin: string | null): string | null {
  if (!nextCheckin) return null;
  const diffMs = new Date(`${nextCheckin}T15:00:00`).getTime() - Date.now();
  if (diffMs <= 0) return "Prochaine arrivée imminente";
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours} h avant la prochaine arrivée`;
  return `${Math.round(hours / 24)} j avant la prochaine arrivée`;
}

export function TaskDetail({
  task,
  propertyName,
  nextCheckin,
}: {
  task: CleaningTask;
  propertyName: string;
  nextCheckin: string | null;
}) {
  const [checklistDone, setChecklistDone] = useState(new Set(task.checklist_done));
  const [photos, setPhotos] = useState(task.photos_after);
  const [status, setStatus] = useState(task.status);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const countdown = formatCountdown(nextCheckin);

  function handleToggle(item: string) {
    const next = new Set(checklistDone);
    const done = !next.has(item);
    if (done) next.add(item);
    else next.delete(item);
    setChecklistDone(next);
    startTransition(() => toggleChecklistItem(task.id, item, done));
  }

  function handleStatus(newStatus: "in_progress" | "done") {
    setStatus(newStatus);
    startTransition(() => setCleaningTaskStatus(task.id, newStatus));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${task.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("cleaning-photos").upload(path, file);
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("cleaning-photos").getPublicUrl(path);
      setPhotos((prev) => [...prev, publicUrl.publicUrl]);
      await addCleaningPhoto(task.id, publicUrl.publicUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{propertyName}</h1>
        {countdown && <p className="mt-1 text-sm font-medium text-amber-600">{countdown}</p>}
      </div>

      {task.linen_checklist.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">Linge nécessaire</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {task.linen_checklist.map((item) => (
              <li key={item.item_type}>
                {item.quantity} × {item.item_type}
              </li>
            ))}
          </ul>
        </section>
      )}

      {task.extra_checklist_items.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">Checklist</h2>
          <ul className="mt-2 space-y-2">
            {task.extra_checklist_items.map((item) => (
              <li key={item}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checklistDone.has(item)}
                    onChange={() => handleToggle(item)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className={checklistDone.has(item) ? "text-neutral-400 line-through" : ""}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium text-neutral-500">Photo de fin de ménage</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="Photo du ménage" className="h-20 w-20 rounded-md object-cover" />
          ))}
        </div>
        <label className="mt-3 block">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <span className="inline-block cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50">
            {uploading ? "Envoi en cours…" : "Ajouter une photo"}
          </span>
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4">
        <div className="mx-auto flex max-w-md gap-2">
          <Link
            href={`/incidents/nouveau?property_id=${task.property_id}&booking_id=${task.booking_id ?? ""}`}
            className="flex-1 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Signaler un problème
          </Link>
          {status !== "done" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatus(status === "todo" ? "in_progress" : "done")}
              className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              {status === "todo" ? "Commencer" : "Terminer le ménage"}
            </button>
          ) : (
            <p className="flex-1 rounded-md bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700">
              Ménage terminé
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
