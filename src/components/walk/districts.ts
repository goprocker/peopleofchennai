/**
 * The walkable city: one long road running through Chennai's tech belt, split into districts.
 * Order is roughly geographic — west (Porur) → Guindy → Adyar → down OMR to Siruseri.
 */

export type DistrictStyle = "tech" | "residential" | "mixed" | "campus";

export type Landmark =
  | "dlf-park"
  | "kathipara"
  | "iit-gate"
  | "tidel-park"
  | "mall"
  | "metro"
  | "startup-row"
  | "omr-junction"
  | "sipcot-gate"
  | "lake";

export interface District {
  slug: string;
  name: string;
  blurb: string;
  style: DistrictStyle;
  landmarks: Landmark[];
  /** Accent used for the district arch and HUD chip. */
  accent: string;
}

export const DISTRICTS: District[] = [
  { slug: "porur", name: "Porur", blurb: "DLF IT Park and technology offices", style: "tech", landmarks: ["dlf-park", "lake"], accent: "#f2a93b" },
  { slug: "guindy", name: "Guindy", blurb: "Engineering companies and startups", style: "mixed", landmarks: ["kathipara"], accent: "#e4572e" },
  { slug: "adyar", name: "Adyar", blurb: "IIT Madras ecosystem and student communities", style: "residential", landmarks: ["iit-gate"], accent: "#3fa34d" },
  { slug: "taramani", name: "Taramani", blurb: "TIDEL Park and the IIT Madras Research Park", style: "tech", landmarks: ["tidel-park", "metro"], accent: "#2e86de" },
  { slug: "velachery", name: "Velachery", blurb: "Residential and commercial hub for IT folks", style: "residential", landmarks: ["mall"], accent: "#c44569" },
  { slug: "perungudi", name: "Perungudi", blurb: "IT offices, startups and software companies", style: "mixed", landmarks: ["startup-row", "metro"], accent: "#8e44ad" },
  { slug: "thoraipakkam", name: "Thoraipakkam", blurb: "OMR technology companies and IT professionals", style: "tech", landmarks: ["metro"], accent: "#16a085" },
  { slug: "sholinganallur", name: "Sholinganallur", blurb: "Major OMR IT corridor, large tech campuses", style: "tech", landmarks: ["omr-junction"], accent: "#f39c12" },
  { slug: "navalur", name: "Navalur", blurb: "OMR IT offices and nearby campuses", style: "mixed", landmarks: [], accent: "#d35400" },
  { slug: "siruseri", name: "Siruseri", blurb: "SIPCOT IT Park and large tech employers", style: "campus", landmarks: ["sipcot-gate"], accent: "#27ae60" },
];

/** Length of road (world units) each district occupies. The road runs toward −z. */
export const DISTRICT_LENGTH = 90;
export const ROAD_HALF = 5;
export const WALK_HALF = 9.5;
export const WORLD_END = -DISTRICT_LENGTH * DISTRICTS.length;

export const districtStartZ = (i: number) => -i * DISTRICT_LENGTH;

export function districtIndexAt(z: number): number {
  const i = Math.floor(-z / DISTRICT_LENGTH);
  return Math.max(0, Math.min(DISTRICTS.length - 1, i));
}

/** Small deterministic RNG so the city looks the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
