"use client";
/* Three.js scene state (vectors, refs, camera) is mutated per-frame by design; the React
   Compiler immutability rules don't apply to imperative WebGL objects. */
/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { City } from "./world";
import {
  DISTRICTS,
  DISTRICT_LENGTH,
  ROAD_HALF,
  WALK_HALF,
  WORLD_END,
  districtIndexAt,
  districtStartZ,
  hashString,
} from "./districts";

export interface WalkPerson {
  slug: string;
  name: string;
  headline: string;
  bio: string;
  neighbourhood: string | null;
  category: string | null;
  portrait: string | null;
}

interface PlacedPerson extends WalkPerson {
  pos: THREE.Vector3;
  facing: number;
  districtIndex: number;
  look: Look;
}

interface Look {
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
}

const SHIRTS = ["#e63946", "#2a9d8f", "#f4a261", "#457b9d", "#8338ec", "#ffb703", "#06d6a0", "#ef476f", "#3a86ff"];
const PANTS = ["#264653", "#3d405b", "#22223b", "#5f0f40", "#2b2d42", "#6b705c"];
const SKINS = ["#8d5524", "#a0673f", "#c68642", "#7a4a2a", "#b07850"];
const HAIRS = ["#111", "#1f1a17", "#2b1d14", "#3b2a20"];

const lookFor = (key: string): Look => {
  const h = hashString(key);
  return { shirt: SHIRTS[h % SHIRTS.length], pants: PANTS[(h >> 4) % PANTS.length], skin: SKINS[(h >> 8) % SKINS.length], hair: HAIRS[(h >> 12) % HAIRS.length] };
};

/** Put each person in their own neighbourhood when it's on the map; spread the rest evenly. */
function placePeople(people: WalkPerson[]): PlacedPerson[] {
  const perDistrict = DISTRICTS.map(() => [] as WalkPerson[]);
  const homeless: WalkPerson[] = [];
  for (const p of people) {
    const n = (p.neighbourhood ?? "").toLowerCase();
    const i = DISTRICTS.findIndex((d) => n.includes(d.slug) || n.includes(d.name.toLowerCase()));
    (i >= 0 ? perDistrict[i] : homeless).push(p);
  }
  homeless.forEach((p) => {
    // fill the emptiest district first
    let best = 0;
    perDistrict.forEach((list, i) => {
      if (list.length < perDistrict[best].length) best = i;
    });
    perDistrict[best].push(p);
  });
  const out: PlacedPerson[] = [];
  perDistrict.forEach((list, i) => {
    const z0 = districtStartZ(i);
    const step = (DISTRICT_LENGTH - 20) / Math.max(1, list.length);
    list.forEach((p, k) => {
      const side = k % 2 === 0 ? -1 : 1;
      const z = z0 - 12 - k * step - (hashString(p.slug) % 5);
      out.push({ ...p, pos: new THREE.Vector3(side * (ROAD_HALF + 2.6), 0.2, z), facing: side > 0 ? -Math.PI / 2 : Math.PI / 2, districtIndex: i, look: lookFor(p.slug) });
    });
  });
  return out;
}

// ───────────────────────── Characters ─────────────────────────

function Figure({ look, ghost = false, walkRef }: { look: Look; ghost?: boolean; walkRef?: React.RefObject<number> }) {
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = walkRef?.current ?? 0;
    const a = Math.sin(t) * 0.6 * (walkRef ? 1 : 0);
    if (legL.current) legL.current.rotation.x = a;
    if (legR.current) legR.current.rotation.x = -a;
    if (armL.current) armL.current.rotation.x = -a * 0.8;
    if (armR.current) armR.current.rotation.x = a * 0.8;
  });
  const mat = (color: string) => <meshStandardMaterial color={color} transparent={ghost} opacity={ghost ? 0.75 : 1} flatShading />;
  return (
    <group>
      {[
        [legL, -0.15],
        [legR, 0.15],
      ].map(([ref, x]) => (
        <group key={x as number} position={[x as number, 0.85, 0]}>
          <mesh ref={ref as React.RefObject<THREE.Mesh>} position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.24, 0.85, 0.26]} />
            {mat(look.pants)}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.62, 0.75, 0.36]} />
        {mat(look.shirt)}
      </mesh>
      {[
        [armL, -0.42],
        [armR, 0.42],
      ].map(([ref, x]) => (
        <mesh key={x as number} ref={ref as React.RefObject<THREE.Mesh>} position={[x as number, 1.5, 0]} castShadow>
          <boxGeometry args={[0.18, 0.7, 0.2]} />
          {mat(look.shirt)}
        </mesh>
      ))}
      <mesh position={[0, 2.18, 0]} castShadow>
        <boxGeometry args={[0.42, 0.45, 0.42]} />
        {mat(look.skin)}
      </mesh>
      <mesh position={[0, 2.45, -0.03]}>
        <boxGeometry args={[0.46, 0.14, 0.48]} />
        {mat(look.hair)}
      </mesh>
    </group>
  );
}

function Npc({ p, near }: { p: PlacedPerson; near: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [show, setShow] = useState(false);
  const { camera } = useThree();
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y = p.pos.y + Math.abs(Math.sin(state.clock.elapsedTime * 1.4 + p.pos.z)) * 0.03;
    const visible = camera.position.distanceTo(p.pos) < 45;
    if (visible !== show) setShow(visible);
  });
  return (
    <group ref={group} position={p.pos} rotation={[0, p.facing, 0]}>
      <Figure look={p.look} />
      {near && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 24]} />
          <meshBasicMaterial color="#ffc23d" toneMapped={false} />
        </mesh>
      )}
      {show && (
        <Html position={[0, 3.2, 0]} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="walk-tag">
            {p.category && <span className="walk-tag__badge">{p.category}</span>}
            <strong>{p.name}</strong>
            <span>{p.headline}</span>
            <i aria-hidden>▾</i>
          </div>
        </Html>
      )}
    </group>
  );
}

// ───────────────────────── Player + camera ─────────────────────────

interface Input {
  keys: Set<string>;
  yaw: number;
  pitch: number;
  touch: { x: number; y: number };
}

function Player({
  input,
  posRef,
  people,
  onNear,
  teleport,
  active,
}: {
  input: React.RefObject<Input>;
  posRef: React.RefObject<THREE.Vector3>;
  people: PlacedPerson[];
  onNear: (p: PlacedPerson | null) => void;
  teleport: React.RefObject<THREE.Vector3 | null>;
  active: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const walkPhase = useRef(0);
  const nearRef = useRef<string | null>(null);
  const started = useRef(false);
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo<Look>(() => ({ shirt: "#f1ede4", pants: "#5b6470", skin: "#c9cbd1", hair: "#9aa3ad" }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const pos = posRef.current;
    const inp = input.current;
    if (teleport.current) {
      pos.copy(teleport.current);
      teleport.current = null;
    }
    let fwd = 0,
      strafe = 0;
    if (active) {
      const k = inp.keys;
      if (k.has("w") || k.has("arrowup")) fwd += 1;
      if (k.has("s") || k.has("arrowdown")) fwd -= 1;
      if (k.has("a")) strafe -= 1;
      if (k.has("d")) strafe += 1;
      if (k.has("arrowleft")) inp.yaw += dt * 2.2;
      if (k.has("arrowright")) inp.yaw -= dt * 2.2;
      fwd += -inp.touch.y;
      strafe += inp.touch.x;
    }
    const moving = Math.abs(fwd) + Math.abs(strafe) > 0.05;
    const speed = inp.keys.has("shift") ? 11 : 5.5;
    if (moving) {
      const len = Math.hypot(fwd, strafe) || 1;
      const sin = Math.sin(inp.yaw),
        cos = Math.cos(inp.yaw);
      // yaw 0 faces −z
      const dx = (-sin * fwd + cos * strafe) / len;
      const dz = (-cos * fwd - sin * strafe) / len;
      pos.x = THREE.MathUtils.clamp(pos.x + dx * speed * dt, -WALK_HALF, WALK_HALF);
      pos.z = THREE.MathUtils.clamp(pos.z + dz * speed * dt, WORLD_END + 4, 8);
      walkPhase.current += dt * speed * 1.6;
      if (body.current) body.current.rotation.y = Math.atan2(-dx, -dz);
    } else {
      walkPhase.current *= 0.85;
    }
    if (body.current) body.current.position.copy(pos);

    // camera: over-the-shoulder, follows yaw
    const dist = 7.5;
    tmp.set(pos.x + Math.sin(inp.yaw) * dist, pos.y + 4.2 + inp.pitch * 3, pos.z + Math.cos(inp.yaw) * dist);
    if (!started.current) {
      camera.position.copy(tmp); // cut straight from the fly-over to the player
      started.current = true;
    } else camera.position.lerp(tmp, 1 - Math.pow(0.0005, dt));
    camera.lookAt(pos.x - Math.sin(inp.yaw) * 4, pos.y + 2.2, pos.z - Math.cos(inp.yaw) * 4);

    // nearest person within reach
    let best: PlacedPerson | null = null;
    let bestD = 3.6;
    for (const p of people) {
      const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const id = best?.slug ?? null;
    if (id !== nearRef.current) {
      nearRef.current = id;
      onNear(best);
    }
  });

  return (
    <group ref={body}>
      <Figure look={look} ghost walkRef={walkPhase} />
    </group>
  );
}

function Sky() {
  const { scene } = useThree();
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#151a33");
    g.addColorStop(0.55, "#3b3560");
    g.addColorStop(0.8, "#c86b4a");
    g.addColorStop(1, "#f2a65a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    scene.fog = new THREE.Fog("#5a4660", 40, 160);
    return () => {
      scene.background = null;
      scene.fog = null;
      t.dispose();
    };
  }, [scene]);
  return null;
}

/** Slow idle camera fly-over shown behind the title screen. */
function Flyover({ on }: { on: boolean }) {
  const { camera } = useThree();
  useFrame((state) => {
    if (!on) return;
    const t = state.clock.elapsedTime * 0.04;
    const z = -((t * DISTRICT_LENGTH * 2) % (-WORLD_END - 60)) - 10;
    camera.position.set(Math.sin(t * 3) * 3, 46, z + 34);
    camera.lookAt(0, 0, z - 30);
  });
  return null;
}

// ───────────────────────── Game shell (HUD + overlays) ─────────────────────────

function useClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).toUpperCase());
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function WalkGame({ people }: { people: WalkPerson[] }) {
  const placed = useMemo(() => placePeople(people), [people]);
  const input = useRef<Input>({ keys: new Set(), yaw: 0, pitch: 0, touch: { x: 0, y: 0 } });
  const posRef = useRef(new THREE.Vector3(0, 0.2, -4));
  const teleport = useRef<THREE.Vector3 | null>(null);
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(0);
  const [near, setNear] = useState<PlacedPerson | null>(null);
  const [open, setOpen] = useState<PlacedPerson | null>(null);
  const [finder, setFinder] = useState(false);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState(0);
  const [isTouch, setIsTouch] = useState(false);
  const clock = useClock();
  const paused = !entered || !!open || finder;

  // fake-ish loading bar while textures/geometry compile
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(100, v + 7 + Math.random() * 12);
      setReady(Math.floor(v));
      if (v >= 100) clearInterval(id);
    }, 120);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    const id = setInterval(() => setDistrict(districtIndexAt(posRef.current.z)), 250);
    return () => clearInterval(id);
  }, []);

  const go = useCallback((p: PlacedPerson) => {
    const side = p.pos.x > 0 ? -1 : 1;
    teleport.current = new THREE.Vector3(p.pos.x + side * 2.2, 0.2, p.pos.z + 1.5);
    input.current.yaw = side > 0 ? -Math.PI / 2 + 0.3 : Math.PI / 2 - 0.3;
    setFinder(false);
    setQuery("");
  }, []);

  const goDistrict = useCallback((i: number) => {
    teleport.current = new THREE.Vector3(0, 0.2, districtStartZ(i) - 4);
    input.current.yaw = 0;
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Escape") setFinder(false);
        return;
      }
      const k = e.key.toLowerCase();
      if (!entered) {
        if (k === "enter") setEntered(true);
        return;
      }
      if (k === "escape") {
        setOpen(null);
        setFinder(false);
        return;
      }
      if (k === "e" && near && !open) {
        setOpen(near);
        input.current.keys.clear();
        return;
      }
      if (k === "f" && !open) {
        e.preventDefault();
        setFinder((v) => !v);
        input.current.keys.clear();
        return;
      }
      if (!paused) input.current.keys.add(k);
      if (k.startsWith("arrow") || k === " ") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => input.current.keys.delete(e.key.toLowerCase());
    const blur = () => input.current.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [entered, near, open, paused]);

  // mouse / touch drag to look around
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || (e.target as HTMLElement).tagName !== "CANVAS") return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    input.current.yaw -= (e.clientX - drag.current.x) * 0.006;
    input.current.pitch = THREE.MathUtils.clamp(input.current.pitch + (e.clientY - drag.current.y) * 0.004, -0.5, 1);
    drag.current = { ...drag.current, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => (drag.current = null);

  const d = DISTRICTS[district];
  const results = placed.filter((p) => {
    const q = query.trim().toLowerCase();
    return !q || [p.name, p.headline, p.category, DISTRICTS[p.districtIndex].name].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="walk-root" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <Canvas shadows={false} dpr={[1, 1.75]} camera={{ fov: 55, near: 0.1, far: 400, position: [6, 26, 20] }} gl={{ antialias: true }}>
        <Sky />
        <hemisphereLight args={["#ffd7b0", "#2d2a3a", 0.9]} />
        <directionalLight position={[-40, 60, 20]} intensity={1.1} color="#ffc59a" />
        <ambientLight intensity={0.25} />
        <City />
        {placed.map((p) => (
          <Npc key={p.slug} p={p} near={near?.slug === p.slug} />
        ))}
        <Flyover on={!entered} />
        {entered && <Player input={input} posRef={posRef} people={placed} onNear={setNear} teleport={teleport} active={!paused} />}
      </Canvas>

      {/* ── Title screen ── */}
      {!entered && (
        <div className="walk-title">
          <span className="walk-chip">Early access</span>
          <div className="walk-title__body">
            <p className="walk-title__pre">People of</p>
            <h1 className="walk-title__h">Chennai</h1>
            <p className="walk-title__tag">Walk the city. Meet the people who build it.</p>
            <p className="walk-title__sub">Porur to Siruseri — ten neighbourhoods, one long road.</p>
            {ready < 100 ? (
              <div className="walk-btn walk-btn--loading">Painting the city… {ready}%</div>
            ) : (
              <button className="walk-btn" onClick={() => setEntered(true)} autoFocus>
                Enter Porur <span aria-hidden>▸</span>
              </button>
            )}
            <Link href="/" className="walk-title__skip">
              Skip — read the classic site
            </Link>
          </div>
        </div>
      )}

      {/* ── HUD ── */}
      {entered && (
        <>
          <div className="walk-hud-tl">
            <div className="walk-loc" style={{ borderColor: d.accent }}>
              <small>Chennai</small>
              <strong>{d.name}</strong>
            </div>
            <div className="walk-chip walk-chip--accent" style={{ background: d.accent }}>
              {d.blurb}
            </div>
          </div>

          <div className="walk-hud-tr">
            <button className="walk-btn walk-btn--sm" onClick={() => setFinder(true)}>
              ⌕ Find someone <kbd>F</kbd>
            </button>
            {clock && <div className="walk-chip">☾ {clock}</div>}
          </div>

          <nav className="walk-map" aria-label="Neighbourhoods">
            {DISTRICTS.map((dd, i) => (
              <button key={dd.slug} className={i === district ? "is-here" : ""} onClick={() => goDistrict(i)} style={{ ["--c" as string]: dd.accent }}>
                <span />
                {dd.name}
              </button>
            ))}
          </nav>

          {near && !open && (
            <button className="walk-prompt" onClick={() => setOpen(near)}>
              <kbd>E</kbd> Talk to {near.name}
            </button>
          )}

          {!isTouch && (
            <div className="walk-keys">
              <span><kbd>WASD</kbd> Move</span>
              <span><kbd>Shift</kbd> Run</span>
              <span><kbd>Drag</kbd> Look</span>
              <span><kbd>E</kbd> Talk</span>
              <span><kbd>F</kbd> Find</span>
              <span><kbd>Esc</kbd> Close</span>
            </div>
          )}

          {isTouch && <TouchPad input={input} />}
        </>
      )}

      {/* ── Person card ── */}
      {open && (
        <div className="walk-modal" onClick={() => setOpen(null)}>
          <article className="walk-card" onClick={(e) => e.stopPropagation()} style={{ ["--c" as string]: DISTRICTS[open.districtIndex].accent }}>
            <div className="walk-card__head">
              {open.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.portrait} alt="" />
              ) : (
                <div className="walk-card__avatar">{open.name[0]}</div>
              )}
              <div>
                <small>{DISTRICTS[open.districtIndex].name}{open.category ? ` · ${open.category}` : ""}</small>
                <h2>{open.name}</h2>
                <p>{open.headline}</p>
              </div>
            </div>
            <p className="walk-card__bio">{open.bio}</p>
            <div className="walk-card__actions">
              <Link href={`/people/${open.slug}`} className="walk-btn walk-btn--sm">
                Read their story ▸
              </Link>
              <button className="walk-btn walk-btn--ghost walk-btn--sm" onClick={() => setOpen(null)}>
                Keep walking <kbd>Esc</kbd>
              </button>
            </div>
          </article>
        </div>
      )}

      {/* ── Finder ── */}
      {finder && (
        <div className="walk-modal" onClick={() => setFinder(false)}>
          <div className="walk-card walk-finder" onClick={(e) => e.stopPropagation()}>
            <h2>Find someone</h2>
            <input autoFocus placeholder="Name, role or neighbourhood…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search people" />
            <ul>
              {results.length === 0 && <li className="walk-finder__empty">Nobody here by that name — yet.</li>}
              {results.map((p) => (
                <li key={p.slug}>
                  <button onClick={() => go(p)}>
                    <strong>{p.name}</strong>
                    <span>{p.headline}</span>
                    <em style={{ color: DISTRICTS[p.districtIndex].accent }}>{DISTRICTS[p.districtIndex].name}</em>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function TouchPad({ input }: { input: React.RefObject<Input> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const r = base.current!.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    input.current.touch = { x, y };
    setKnob({ x, y });
  };
  const end = (e: React.PointerEvent) => {
    e.stopPropagation();
    input.current.touch = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  };
  return (
    <div
      ref={base}
      className="walk-stick"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }} />
    </div>
  );
}
