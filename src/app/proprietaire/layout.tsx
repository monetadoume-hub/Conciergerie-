import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";

const NAV_LINKS = [
  { href: "/proprietaire", label: "Accueil" },
  { href: "/proprietaire/calendrier", label: "Calendrier" },
  { href: "/proprietaire/rapports", label: "Rapports" },
  { href: "/proprietaire/messages", label: "Messages" },
];

// Owner portal (§16): a deliberately narrow space — only three entries plus
// home, read-only calendar, and never access to the agency's own screens.
export default async function OwnerPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
