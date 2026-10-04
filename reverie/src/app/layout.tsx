import type { Metadata, Viewport } from "next";
import { Caveat, Poppins } from "next/font/google";
import { T } from "@/lib/textes";
import "./globals.css";

const poppins = Poppins({
  variable: "--police-texte",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--police-manuscrite",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${T.marque} — ${T.signature}`,
  description: T.accueil.sousTitre,
};

export const viewport: Viewport = {
  themeColor: "#F6C21C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${poppins.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
