import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import HomeRedesign from "./HomeRedesign";
import "./home-redesign.css";

/**
 * LAD home redesign (preview).
 *
 * A previewable redesign of the LAD "ask anything" home screen, built from the
 * Claude Design handoff. Lives at /home-redesign so the live home page stays
 * untouched. See the report / README for how to promote it to the real home.
 *
 * Fonts are loaded with next/font and scoped to this route via CSS variables
 * (--font-jakarta, --font-grotesk) consumed in home-redesign.css, so they do
 * not change the rest of the app's typography.
 */

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LAD: Home (redesign)",
  description: "Redesigned LAD home: ask anything, find leads, book meetings, create.",
};

export default function HomeRedesignPage() {
  return (
    <div className={`${jakarta.variable} ${grotesk.variable}`}>
      <HomeRedesign />
    </div>
  );
}
