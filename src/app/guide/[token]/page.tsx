import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AskWidget } from "./AskWidget";

interface GuestGuide {
  property_name: string;
  property_address: string | null;
  access_code: string | null;
  guidebook_content: {
    access?: string;
    wifi_network?: string;
    wifi_password?: string;
    equipment?: string;
    around?: string;
  } | null;
  guest_name: string | null;
  checkin: string;
  checkout: string;
  agency_name: string;
  agency_whatsapp_number: string | null;
}

// Public, unauthenticated page: the guest never creates an account (cahier
// des charges §6, §14) — the unguessable guide_token in the URL is the only
// key, resolved server-side through the get_guest_guide RPC (anon role only
// has EXECUTE on that one function, no direct table access).
export default async function GuestGuidePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.rpc("get_guest_guide", { p_guide_token: token }).single();

  if (error || !data) notFound();

  const guide = data as GuestGuide;
  const content = guide.guidebook_content ?? {};

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <p className="text-sm text-neutral-500">Bienvenue{guide.guest_name ? `, ${guide.guest_name}` : ""}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{guide.property_name}</h1>
          {guide.property_address && <p className="text-sm text-neutral-500">{guide.property_address}</p>}
        </div>

        <Section title="Accès">
          <p className="whitespace-pre-line text-sm text-neutral-700">
            {content.access || "Les instructions d'accès vous seront communiquées avant votre arrivée."}
          </p>
          {guide.access_code && (
            <p className="mt-2 text-sm font-medium">
              Code d&apos;accès : <span className="font-mono">{guide.access_code}</span>
            </p>
          )}
        </Section>

        <Section title="Wifi">
          {content.wifi_network ? (
            <p className="text-sm text-neutral-700">
              Réseau : <span className="font-medium">{content.wifi_network}</span>
              <br />
              Mot de passe : <span className="font-mono">{content.wifi_password}</span>
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Informations à venir.</p>
          )}
        </Section>

        <Section title="Équipements">
          <p className="whitespace-pre-line text-sm text-neutral-700">
            {content.equipment || "Aucune information particulière."}
          </p>
        </Section>

        <Section title="Autour de vous">
          <p className="whitespace-pre-line text-sm text-neutral-700">
            {content.around || "Découvrez le quartier — recommandations à venir."}
          </p>
        </Section>

        <Section title="Besoin d'aide ?" subtle>
          <p className="mb-3 text-sm text-neutral-500">
            Posez votre question, nous vous répondons immédiatement — et transmettons à {guide.agency_name} tout ce
            qui a besoin d&apos;une attention humaine.
          </p>
          <AskWidget guideToken={token} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, subtle, children }: { title: string; subtle?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-white p-4 ${subtle ? "opacity-80" : ""}`}>
      <h2 className="text-sm font-medium text-neutral-500">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
