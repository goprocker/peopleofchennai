import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { WalkLoader } from "@/components/walk/walk-loader";
import type { WalkPerson } from "@/components/walk/walk-game";
import { listPeople } from "@/lib/db/public";
import { parsePeopleQuery } from "@/lib/validation/query";
import "./walk.css";

const display = Barlow_Condensed({ variable: "--font-walk-display", weight: ["700", "800"], style: ["italic", "normal"], subsets: ["latin"] });
const body = Barlow({ variable: "--font-walk-body", weight: ["500", "600", "700"], subsets: ["latin"] });

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Walk the city",
  description: "Walk Chennai's tech belt — Porur to Siruseri — and meet the people who build it.",
};

export default async function WalkPage() {
  const { items } = await listPeople(parsePeopleQuery({}), 120);
  const people: WalkPerson[] = items.map((p) => ({
    slug: p.slug,
    name: p.fullName,
    headline: p.headline,
    bio: p.shortBio,
    neighbourhood: p.neighbourhood?.slug ?? p.neighbourhood?.name ?? null,
    category: p.categories[0]?.name ?? null,
    portrait: p.portrait?.src ?? null,
  }));
  return (
    <main className={`${display.variable} ${body.variable}`}>
      <WalkLoader people={people} />
    </main>
  );
}
