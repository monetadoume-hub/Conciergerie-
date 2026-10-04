import { T } from "@/lib/textes";

/** Logo : rond crème avec une forme jaune en papier plié. */
export function Logo({ taille = 40 }: { taille?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={taille} height={taille} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <circle cx="20" cy="20" r="19" fill="#FBF7EE" stroke="#1E1B16" strokeWidth="1.5" />
        <path d="M10 26 L20 10 L22 22 Z" fill="#F6C21C" />
        <path d="M20 10 L30 26 L22 22 Z" fill="#E0A800" />
        <path d="M10 26 L22 22 L30 26 Z" fill="#C98A1B" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: taille * 0.5 }}>{T.marque}</span>
    </span>
  );
}
