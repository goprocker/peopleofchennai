"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  DISTRICTS,
  DISTRICT_LENGTH,
  ROAD_HALF,
  WORLD_END,
  districtStartZ,
  rng,
  type District,
  type Landmark,
} from "./districts";

// ───────────────────────── Shared textures ─────────────────────────

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function windowsTextures(seed: number, glass: boolean) {
  const lit: boolean[] = [];
  const r = rng(seed);
  for (let i = 0; i < 16; i++) lit.push(r() > 0.5);
  const draw = (emissive: boolean) => (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = emissive ? "#000" : "#fff";
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const on = lit[y * 4 + x];
        ctx.fillStyle = emissive ? (on ? "#ffd27a" : "#000") : glass ? (on ? "#fff3cf" : "#2b4a63") : on ? "#ffe2a0" : "#3b3f4a";
        if (glass) ctx.fillRect(x * 32 + 2, y * 32 + 4, 28, 22);
        else ctx.fillRect(x * 32 + 9, y * 32 + 8, 14, 16);
      }
  };
  return [canvasTexture(128, 128, draw(false)), canvasTexture(128, 128, draw(true))];
}

export function labelTexture(text: string, bg: string, fg = "#fff8ec", w = 512, h = 128) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = `italic 800 ${Math.floor(h * 0.55)}px "Barlow Condensed", Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.toUpperCase(), w / 2, h / 2 + 4, w - 24);
  });
}

export function repeat(t: THREE.Texture, x: number, y: number) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
}

// ───────────────────────── Primitives ─────────────────────────

const RES_COLORS = ["#e07a5f", "#81b29a", "#f2cc8f", "#6d9dc5", "#e8a0bf", "#c9b79c", "#9bc1bc", "#f4a261", "#b5838d"];
const GLASS_COLORS = ["#7fb3d5", "#5d8aa8", "#a3c4dc", "#6c9fb8", "#8fa9bf"];

function Building({ x, z, w, d, h, color, glass, seed }: { x: number; z: number; w: number; d: number; h: number; color: string; glass: boolean; seed: number }) {
  const [tex, glow] = useMemo(
    () => windowsTextures(seed, glass).map((t) => repeat(t, Math.max(1, Math.round(w / 3)) / 4, Math.max(1, Math.round(h / 3)) / 4)),
    [seed, glass, w, h],
  );
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          map={tex}
          emissive="#ffffff"
          emissiveMap={glow}
          emissiveIntensity={0.9}
          roughness={glass ? 0.25 : 0.9}
          metalness={glass ? 0.4 : 0}
        />
      </mesh>
      {/* parapet */}
      <mesh position={[0, h + 0.2, 0]}>
        <boxGeometry args={[w + 0.3, 0.4, d + 0.3]} />
        <meshStandardMaterial color={glass ? "#d9e2ea" : "#efe6d8"} />
      </mesh>
      {/* rooftop water tank — the Chennai skyline signature */}
      {!glass && (
        <mesh position={[w * 0.2, h + 0.9, -d * 0.15]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.2, 10]} />
          <meshStandardMaterial color="#1d1d1f" />
        </mesh>
      )}
    </group>
  );
}

function Palm({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 5, 6]} />
        <meshStandardMaterial color="#8b6b47" />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.cos(i) * 0.9 + 0.2, 4.9, Math.sin(i) * 0.9]} rotation={[Math.sin(i) * 0.6, i, Math.cos(i) * 0.6]}>
          <boxGeometry args={[2.2, 0.08, 0.5]} />
          <meshStandardMaterial color="#3e8e41" />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 2.4, 6]} />
        <meshStandardMaterial color="#6b4f35" />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <icosahedronGeometry args={[1.8, 0]} />
        <meshStandardMaterial color="#2f7d3a" flatShading />
      </mesh>
    </group>
  );
}

function StreetLamp({ x, z, side }: { x: number; z: number; side: 1 | -1 }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 5, 6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-side * 0.8, 4.95, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-side * 1.5, 4.85, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.3]} />
        <meshStandardMaterial color="#fff2c4" emissive="#ffd98a" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/** Chennai auto-rickshaw: yellow + black, the unofficial mascot. */
function Auto({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.3, 1, 2.2]} />
        <meshStandardMaterial color="#f7c600" />
      </mesh>
      <mesh position={[0, 1.45, 0.1]}>
        <boxGeometry args={[1.35, 0.15, 2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.32, 0.3, 2.22]} />
        <meshStandardMaterial color="#26623a" />
      </mesh>
      {[
        [0, 0.25, 1.05],
        [-0.6, 0.25, -0.8],
        [0.6, 0.25, -0.8],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.15, 10]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}

function TeaStall({ x, z, side }: { x: number; z: number; side: 1 | -1 }) {
  const sign = useMemo(() => labelTexture("Tea · Bun · Bajji", "#b23a2b"), []);
  return (
    <group position={[x, 0, z]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[3, 2, 1.6]} />
        <meshStandardMaterial color="#d8c3a5" />
      </mesh>
      <mesh position={[0, 2.25, 0.4]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[3.4, 0.08, 2]} />
        <meshStandardMaterial color="#2e8b57" />
      </mesh>
      <mesh position={[0, 2.7, -0.2]}>
        <planeGeometry args={[3, 0.75]} />
        <meshBasicMaterial map={sign} />
      </mesh>
      <mesh position={[0.8, 2.2, 0.6]}>
        <cylinderGeometry args={[0.18, 0.18, 0.4, 10]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Landmarks ─────────────────────────

function Sign({ text, accent, x, y, z, w = 10, h = 2.5, rotY = 0 }: { text: string; accent: string; x: number; y: number; z: number; w?: number; h?: number; rotY?: number }) {
  const tex = useMemo(() => labelTexture(text, accent), [text, accent]);
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* plain back so text never reads mirrored */}
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Landmarks({ kind, z0, accent }: { kind: Landmark; z0: number; accent: string }) {
  const mid = z0 - DISTRICT_LENGTH / 2;
  switch (kind) {
    case "tidel-park":
      return (
        <group>
          {/* TIDEL Park: a long, low glass slab with the tall tower behind */}
          <Building x={-24} z={mid} w={16} d={22} h={30} color="#9ec5e0" glass seed={991} />
          <mesh position={[-24, 31.5, mid]}>
            <boxGeometry args={[4, 3, 4]} />
            <meshStandardMaterial color="#e9eef2" />
          </mesh>
          <Sign text="TIDEL Park" accent="#1f4e79" x={-15.9} y={8} z={mid} rotY={Math.PI / 2} w={12} h={3} />
        </group>
      );
    case "iit-gate":
      return (
        <group position={[-13, 0, mid]}>
          {[-3.5, 3.5].map((dz) => (
            <mesh key={dz} position={[0, 2.5, dz]} castShadow>
              <boxGeometry args={[1, 5, 1]} />
              <meshStandardMaterial color="#c7a26b" />
            </mesh>
          ))}
          <Sign text="IIT Madras" accent="#7a1f1f" x={0.6} y={5.6} z={0} rotY={Math.PI / 2} w={8} h={1.8} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Tree key={i} x={-6 - (i % 3) * 5} z={(i < 3 ? -8 : 8) + (i % 2) * 3} s={1.4} />
          ))}
        </group>
      );
    case "mall":
      return (
        <group position={[24, 0, mid]}>
          <mesh position={[0, 6, 0]} castShadow>
            <boxGeometry args={[18, 12, 30]} />
            <meshStandardMaterial color="#f0e6d6" />
          </mesh>
          <mesh position={[-9.05, 6, 0]}>
            <boxGeometry args={[0.1, 9, 24]} />
            <meshStandardMaterial color="#2c3e50" emissive="#5dade2" emissiveIntensity={0.4} />
          </mesh>
          <Sign text="Velachery Mall" accent="#c44569" x={-9.2} y={10.5} z={0} rotY={-Math.PI / 2} w={14} h={2.6} />
        </group>
      );
    case "kathipara":
      return (
        <group position={[0, 0, mid]}>
          {/* Cloverleaf flyover span crossing the road */}
          <mesh position={[0, 7, 0]} castShadow>
            <boxGeometry args={[70, 0.8, 7]} />
            <meshStandardMaterial color="#b9b4aa" />
          </mesh>
          {[-22, -9, 9, 22].map((x) => (
            <mesh key={x} position={[x, 3.3, 0]}>
              <cylinderGeometry args={[0.8, 0.8, 6.6, 10]} />
              <meshStandardMaterial color="#a8a39a" />
            </mesh>
          ))}
          <Sign text="Kathipara Jn" accent="#1f6f3f" x={0} y={8.6} z={3.6} w={9} h={1.6} />
        </group>
      );
    case "metro":
      return (
        <group>
          {/* Elevated metro viaduct running parallel to the road */}
          <mesh position={[-11.5, 8, mid]}>
            <boxGeometry args={[3.4, 1, DISTRICT_LENGTH]} />
            <meshStandardMaterial color="#c9c4ba" />
          </mesh>
          {[-35, -15, 5, 25].map((dz) => (
            <mesh key={dz} position={[-11.5, 3.75, mid + dz]}>
              <boxGeometry args={[1.2, 7.5, 1.2]} />
              <meshStandardMaterial color="#b3ada2" />
            </mesh>
          ))}
        </group>
      );
    case "dlf-park":
      return (
        <group>
          <Building x={26} z={mid - 10} w={14} d={14} h={36} color="#8fb7d1" glass seed={77} />
          <Building x={26} z={mid + 12} w={14} d={14} h={30} color="#a7c7dc" glass seed={78} />
          <Sign text="DLF IT Park" accent="#0f3b5f" x={18.9} y={10} z={mid} rotY={-Math.PI / 2} w={10} h={2.4} />
        </group>
      );
    case "lake":
      return (
        <mesh position={[-28, 0.03, mid + 20]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[12, 24]} />
          <meshStandardMaterial color="#3d7ea6" roughness={0.1} metalness={0.3} />
        </mesh>
      );
    case "omr-junction":
      return (
        <group>
          <Sign text="OMR · Rajiv Gandhi Salai" accent="#0b6e4f" x={0} y={6.5} z={mid} w={12} h={1.8} />
          {[-6.5, 6.5].map((x) => (
            <mesh key={x} position={[x, 3.4, mid]}>
              <cylinderGeometry args={[0.15, 0.15, 6.8, 6]} />
              <meshStandardMaterial color="#666" />
            </mesh>
          ))}
          <Building x={-26} z={mid} w={16} d={16} h={42} color="#6fa3c2" glass seed={4242} />
        </group>
      );
    case "startup-row":
      return (
        <group>
          {["Chai & Code", "Build Hub", "Pitch Café"].map((t, i) => (
            <Sign key={t} text={t} accent={["#8e44ad", "#e67e22", "#16a085"][i]} x={10.95} y={3.6} z={mid - 20 + i * 14} rotY={-Math.PI / 2} w={6} h={1.3} />
          ))}
        </group>
      );
    case "sipcot-gate":
      return (
        <group position={[0, 0, mid + 10]}>
          {[-7, 7].map((x) => (
            <mesh key={x} position={[x, 3.5, 0]}>
              <boxGeometry args={[1.2, 7, 1.2]} />
              <meshStandardMaterial color={accent} />
            </mesh>
          ))}
          <Sign text="SIPCOT IT Park" accent="#145a32" x={0} y={7.4} z={0} w={15} h={2} />
        </group>
      );
  }
}

// ───────────────────────── Districts ─────────────────────────

function DistrictBlock({ d, i }: { d: District; i: number }) {
  const z0 = districtStartZ(i);
  const items = useMemo(() => {
    const r = rng(1000 + i * 97);
    const buildings: { x: number; z: number; w: number; d: number; h: number; color: string; glass: boolean; seed: number }[] = [];
    for (const side of [-1, 1] as const) {
      let z = z0 - 4;
      while (z > z0 - DISTRICT_LENGTH + 6) {
        const glass = d.style === "tech" ? r() > 0.2 : d.style === "mixed" ? r() > 0.55 : d.style === "campus" ? r() > 0.4 : r() > 0.9;
        const w = glass ? 10 + r() * 6 : 7 + r() * 4;
        const depth = glass ? 10 + r() * 6 : 7 + r() * 4;
        const h = glass ? 16 + r() * 26 : d.style === "campus" ? 6 + r() * 6 : 7 + r() * 8;
        const skip = (d.landmarks.includes("tidel-park") || d.landmarks.includes("omr-junction")) && side === -1 && Math.abs(z - (z0 - DISTRICT_LENGTH / 2)) < 18;
        const skipR = (d.landmarks.includes("mall") || d.landmarks.includes("dlf-park")) && side === 1 && Math.abs(z - (z0 - DISTRICT_LENGTH / 2)) < 26;
        const skipIIT = d.landmarks.includes("iit-gate") && side === -1 && Math.abs(z - (z0 - DISTRICT_LENGTH / 2)) < 14;
        if (!skip && !skipR && !skipIIT) {
          buildings.push({
            x: side * (12 + w / 2 + r() * 3),
            z: z - depth / 2,
            w,
            d: depth,
            h,
            color: glass ? GLASS_COLORS[Math.floor(r() * GLASS_COLORS.length)] : RES_COLORS[Math.floor(r() * RES_COLORS.length)],
            glass,
            seed: Math.floor(r() * 1e6),
          });
        }
        z -= depth + 1.5 + r() * 2;
      }
    }
    return { buildings, autos: [0, 1, 2].map(() => ({ x: (r() > 0.5 ? 1 : -1) * (2 + r() * 2), z: z0 - 10 - r() * (DISTRICT_LENGTH - 20), rot: r() > 0.5 ? 0 : Math.PI })) };
  }, [d, i, z0]);

  return (
    <group>
      {items.buildings.map((b, k) => (
        <Building key={k} {...b} />
      ))}
      {/* Gateway arch with the district name */}
      {[-ROAD_HALF - 4.2, ROAD_HALF + 4.2].map((x) => (
        <mesh key={x} position={[x, 3.6, z0 - 1]}>
          <boxGeometry args={[0.5, 7.2, 0.5]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      ))}
      <Sign text={d.name} accent={d.accent} x={0} y={7.2} z={z0 - 1} w={18} h={2.2} />
      {/* Street furniture */}
      {Array.from({ length: 6 }, (_, k) => z0 - 8 - k * 15).map((z, k) => (
        <group key={z}>
          <StreetLamp x={-ROAD_HALF - 0.6} z={z} side={-1} />
          <StreetLamp x={ROAD_HALF + 0.6} z={z - 7} side={1} />
          {k % 2 === 0 ? <Palm x={-10.5} z={z - 4} /> : <Tree x={10.5} z={z - 3} />}
          {k % 3 === 1 && <Palm x={10.6} z={z + 3} s={0.9} />}
        </group>
      ))}
      <TeaStall x={i % 2 ? 10.2 : -10.2} z={z0 - 30} side={i % 2 ? 1 : -1} />
      {items.autos.map((a, k) => (
        <Auto key={k} {...a} />
      ))}
      {d.landmarks.map((l) => (
        <Landmarks key={l} kind={l} z0={z0} accent={d.accent} />
      ))}
    </group>
  );
}

const len = -WORLD_END + 40;

function Ground() {
  const roadTex = useMemo(
    () =>
      repeat(canvasTexture(64, 256, (ctx) => {
        ctx.fillStyle = "#2b2d33";
        ctx.fillRect(0, 0, 64, 256);
        ctx.fillStyle = "#e9e3d3";
        ctx.fillRect(30, 20, 4, 90);
        ctx.fillRect(30, 148, 4, 90);
      }), 1, len / 14),
    [],
  );
  const curbTex = useMemo(
    () =>
      repeat(canvasTexture(64, 16, (ctx) => {
        ctx.fillStyle = "#f2c230";
        ctx.fillRect(0, 0, 32, 16);
        ctx.fillStyle = "#1c1c1c";
        ctx.fillRect(32, 0, 32, 16);
      }), len / 2, 1),
    [],
  );
  const zc = WORLD_END / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, zc]} receiveShadow>
        <planeGeometry args={[220, len + 200]} />
        <meshStandardMaterial color="#b9a888" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, zc]} receiveShadow>
        <planeGeometry args={[ROAD_HALF * 2, len]} />
        <meshStandardMaterial map={roadTex} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (ROAD_HALF + 2.5), 0.1, zc]} receiveShadow>
            <boxGeometry args={[5, 0.2, len]} />
            <meshStandardMaterial color="#c8bfb0" />
          </mesh>
          <mesh position={[s * (ROAD_HALF + 0.05), 0.12, zc]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[len, 0.25]} />
            <meshStandardMaterial map={curbTex} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function City() {
  return (
    <group>
      <Ground />
      {DISTRICTS.map((d, i) => (
        <DistrictBlock key={d.slug} d={d} i={i} />
      ))}
    </group>
  );
}
