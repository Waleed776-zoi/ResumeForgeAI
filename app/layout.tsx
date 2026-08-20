import type { Metadata } from "next";
import { Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { Ambience } from "@/components/Ambience";

/**
 * Three faces, two jobs, one idea.
 *
 * Instrument Serif is a high-contrast editorial serif that carries its
 * elegance in the thin strokes rather than in weight — the opposite of a
 * heavy display face. It ships in a single 400 weight, which is a feature
 * here: it removes the temptation to bold your way to hierarchy, so
 * hierarchy has to come from size, space and colour instead. Its italic is
 * the most beautiful thing in the family, so it carries the one phrase per
 * page that matters most.
 *
 * Geist handles everything functional. It's a precise, quiet grotesk with a
 * matching monospace, which keeps the interface to two real families while
 * still separating "prose" from "data".
 *
 * The pairing is deliberate rather than decorative: an editorial serif for
 * the human craft, a technical grotesk for the machine verification. That's
 * the product in two typefaces.
 */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ResumeForge AI",
  description:
    "Tailor your resume and cover letter to a specific job — truthfully.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} font-sans bg-paper text-ink min-h-screen antialiased`}
      >
        <Ambience />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
