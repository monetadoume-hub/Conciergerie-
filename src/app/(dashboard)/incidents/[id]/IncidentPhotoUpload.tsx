"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addIncidentPhoto } from "../actions";

export function IncidentPhotoUpload({ incidentId, photos }: { incidentId: string; photos: string[] }) {
  const [items, setItems] = useState(photos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${incidentId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("incident-photos").upload(path, file);
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("incident-photos").getPublicUrl(path);
      setItems((prev) => [...prev, publicUrl.publicUrl]);
      await addIncidentPhoto(incidentId, publicUrl.publicUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium text-neutral-500">Photos du dommage</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="Photo du dommage" className="h-20 w-20 rounded-md object-cover" />
        ))}
      </div>
      <label className="mt-3 block">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <span className="inline-block cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50">
          {uploading ? "Envoi en cours…" : "Ajouter une photo"}
        </span>
      </label>
    </section>
  );
}
