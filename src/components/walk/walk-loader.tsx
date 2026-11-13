"use client";

import dynamic from "next/dynamic";
import type { WalkPerson } from "./walk-game";

// WebGL only runs in the browser.
const WalkGame = dynamic(() => import("./walk-game"), {
  ssr: false,
  loading: () => (
    <div className="walk-root walk-title">
      <div className="walk-title__body">
        <p className="walk-title__pre">People of</p>
        <h1 className="walk-title__h">Chennai</h1>
        <div className="walk-btn walk-btn--loading">Painting the city… 0%</div>
      </div>
    </div>
  ),
});

export function WalkLoader({ people }: { people: WalkPerson[] }) {
  return <WalkGame people={people} />;
}
