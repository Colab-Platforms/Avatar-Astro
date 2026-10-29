import { useRef, useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS, Planet } from '@/data/planetaryData';

// ── Texture assets (imported so Vite processes and hashes them) ───────────────
import sunTexUrl from '@/assets/sun-texture.png';
import moonTexUrl    from '@/assets/planets/moon.jpg';
import mercuryTexUrl from '@/assets/planets/mercury.jpg';
import venusTexUrl   from '@/assets/planets/venus.jpg';
import earthTexUrl   from '@/assets/planets/earth.jpg';
import marsTexUrl    from '@/assets/planets/mars.jpg';
import jupiterTexUrl from '@/assets/planets/jupiter.jpg';
import saturnTexUrl  from '@/assets/planets/saturn.jpg';

// ── Constants ───────────────────────────────────────────────────────────────
const FIXED_CAM_Z = 32;
const FIXED_CAM_Y = 2;

// ── Planet texture URL map ────────────────────────────────────────────────────
const PLANET_TEXTURE_PATHS = {
  sun:     sunTexUrl,
  moon:    moonTexUrl,
  mercury: mercuryTexUrl,
  venus:   venusTexUrl,
  earth:   earthTexUrl,
  mars:    marsTexUrl,
  jupiter: jupiterTexUrl,
  saturn:  saturnTexUrl,
} as const;

// Kick off texture downloads before any component renders
Object.values(PLANET_TEXTURE_PATHS).forEach(p => useTexture.preload(p));

// ── Bilingual planet labels (emoji + English + Hindi/Sanskrit) ───────────────
const PLANET_LABELS: Record<string, { emoji: string; hindi: string }> = {
  sun:     { emoji: '☀️', hindi: 'Surya (सूर्य)'     },
  moon:    { emoji: '🌙', hindi: 'Chandra (चन्द्र)'   },
  mars:    { emoji: '♂️', hindi: 'Mangal (मंगल)'     },
  mercury: { emoji: '☿',  hindi: 'Budha (बुध)'       },
  jupiter: { emoji: '♃',  hindi: 'Guru (गुरु)'       },
  venus:   { emoji: '♀️', hindi: 'Shukra (शुक्र)'    },
  saturn:  { emoji: '♄',  hindi: 'Shani (शनि)'       },
};

// ── Per-planet glow palette (tooltip accent colors) ──────────────────────────
const GLOW: Record<string, { core: string; mid: string }> = {
  sun:     { core: '#fff8e0', mid: '#ffcc44' },
  moon:    { core: '#d8d8e8', mid: '#9999aa' },
  mercury: { core: '#c8b8a8', mid: '#9a8878' },
  venus:   { core: '#ffe090', mid: '#ffb840' },
  earth:   { core: '#5aaaff', mid: '#2266dd' },
  mars:    { core: '#ff7055', mid: '#cc3311' },
  jupiter: { core: '#e8b860', mid: '#b88830' },
  saturn:  { core: '#eeddb0', mid: '#c4ac78' },
};

// Balanced initial formation: Mercury at center, 3 planets on each side.
// Physical left→right layout: Saturn · Venus · Jupiter | Mercury | Sun · Moon · Mars
// The carousel drifts continuously on its own (see carouselAutoRef in SolarSystemScene),
// entirely independent of scroll input.
const CAROUSEL_ORDER         = ['saturn', 'venus', 'jupiter', 'mercury', 'sun', 'moon', 'mars'];
const CAROUSEL_CENTER_INDEX  = 3; // Mercury (index 3) starts centered
const CAROUSEL_STEP_SECONDS  = 5; // one planet swap every 5s
const CAROUSEL_X_SPACING = 7.0;  // uniform gap between planets
const CAROUSEL_Z         = 16;   // base depth for all carousel planets
const CAROUSEL_Z_FOCUS   = 2.5;  // how much closer the centered planet sits, for subtle 3D depth
const CAROUSEL_V_LIFT    = 0.6;  // Y lift per offset step — V follows the active center

// ── Twinkling star groups ────────────────────────────────────────────────────
const TwinkleGroup = ({ phase, color }: { phase: number; color: string }) => {
  const ref   = useRef<THREE.Points>(null);
  const COUNT = 18;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 220;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 150;
      arr[i * 3 + 2] = -120 + Math.random() * 50;
    }
    return arr;
  }, []);
  useFrame((s) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.PointsMaterial;
    m.opacity = 0.2 + 0.8 * Math.pow((Math.sin(s.clock.elapsedTime * 1.6 + phase) + 1) / 2, 2);
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.22} color={color} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
};
const TwinklingStars = () => (
  <>
    <TwinkleGroup phase={0}   color="#ffffff" />
    <TwinkleGroup phase={2.1} color="#ccddff" />
  </>
);

// ── Parallax star layer ───────────────────────────────────────────────────────
const ParallaxLayer = ({ scrollRef }: { scrollRef: React.MutableRefObject<{ progress: number }> }) => {
  const ref   = useRef<THREE.Points>(null);
  const COUNT = 180;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 180;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 100;
      arr[i * 3 + 2] = -50 - Math.random() * 30;
    }
    return arr;
  }, []);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.scale.setScalar(1 + scrollRef.current.progress * 0.35);
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.18} color="#aabbdd" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
};

// ── Nebula cloud ─────────────────────────────────────────────────────────────
const NebulaCloud = ({
  position, color, count = 280, spread = 18,
}: { position: [number, number, number]; color: string; count?: number; spread?: number }) => {
  const ref       = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = spread * Math.pow(Math.random(), 0.55);
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = position[0] + r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = position[1] + r * Math.sin(phi) * Math.sin(theta) * 0.35;
      arr[i * 3 + 2] = position[2] + r * Math.cos(phi);
    }
    return arr;
  }, [position, count, spread]);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.004; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.5} color={color} transparent opacity={0.07} sizeAttenuation />
    </points>
  );
};

// ── Cosmic dust ──────────────────────────────────────────────────────────────
const CosmicDust = () => {
  const ref   = useRef<THREE.Points>(null);
  const COUNT = 150;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) arr[i] = (Math.random() - 0.5) * 110;
    return arr;
  }, []);
  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 1; i < COUNT * 3; i += 3) { arr[i] -= 0.013; if (arr[i] < -55) arr[i] = 55; }
    pos.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#8899cc" transparent opacity={0.22} sizeAttenuation />
    </points>
  );
};

// ── Asteroids ────────────────────────────────────────────────────────────────
const Asteroid = ({
  position,
  size,
  rotation,
}: {
  position: [number, number, number];
  size: number;
  rotation: [number, number, number];
}) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.06 + rotation[1];
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <dodecahedronGeometry args={[size, 0]} />
      <meshPhongMaterial color="#7a7060" shininess={5} />
    </mesh>
  );
};

const AsteroidField = () => (
  <>
    <Asteroid position={[-20, 10, -2]}  size={0.28} rotation={[0.4, 0.8, 0.3]} />
    <Asteroid position={[-17, -2, -10]} size={0.16} rotation={[0.7, 0.2, 0.9]} />
    <Asteroid position={[21,  8,  -2]}  size={0.20} rotation={[0.3, 0.6, 0.5]} />
    <Asteroid position={[19, -5,  -8]}  size={0.14} rotation={[0.9, 0.4, 0.2]} />
    <Asteroid position={[-9, 13, -14]}  size={0.13} rotation={[0.5, 0.1, 0.7]} />
    <Asteroid position={[11, 12, -12]}  size={0.12} rotation={[0.6, 0.9, 0.1]} />
  </>
);

// ── Shooting stars ────────────────────────────────────────────────────────────
const ShootingStar = ({ id, onComplete }: { id: number; onComplete: (id: number) => void }) => {
  const lineRef = useRef<THREE.Line>(null);
  const lifeRef = useRef(0);
  const doneRef = useRef(false);
  const MAX     = 1.3;
  const { posArray, geometry, start, dir, speed, trail } = useMemo(() => {
    const posArray = new Float32Array(6);
    const geometry = new THREE.BufferGeometry();
    const attr     = new THREE.BufferAttribute(posArray, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', attr);
    return {
      posArray, geometry,
      start: new THREE.Vector3(
        (Math.random() - 0.5) * 200 + 60,
        40 + Math.random() * 55,
        (Math.random() - 0.5) * 80 - 40,
      ),
      dir:   new THREE.Vector3(-(Math.random() * 1.4 + 0.5), -(Math.random() * 0.7 + 0.2), 0).normalize(),
      speed: Math.random() * 32 + 24,
      trail: Math.random() * 9 + 4,
    };
  }, []);
  useFrame((_, dt) => {
    if (doneRef.current) return;
    lifeRef.current += dt;
    if (lifeRef.current > MAX) { doneRef.current = true; onComplete(id); return; }
    const t = lifeRef.current / MAX;
    const d = t * speed * MAX;
    const head = start.clone().addScaledVector(dir, d);
    const tail = start.clone().addScaledVector(dir, Math.max(0, d - trail));
    posArray[0] = tail.x; posArray[1] = tail.y; posArray[2] = tail.z;
    posArray[3] = head.x; posArray[4] = head.y; posArray[5] = head.z;
    (geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    const op = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
    if (lineRef.current) (lineRef.current.material as THREE.LineBasicMaterial).opacity = op * 0.92;
  });
  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0} />
    </line>
  );
};
const ShootingStarManager = () => {
  const [stars, setStars] = useState<{ id: number }[]>([]);
  const nextRef = useRef(9 + Math.random() * 6);
  const elapsed = useRef(0);
  const idRef   = useRef(0);
  const remove  = useCallback((id: number) => setStars(p => p.filter(s => s.id !== id)), []);
  useFrame((_, dt) => {
    elapsed.current += dt;
    if (elapsed.current >= nextRef.current) {
      elapsed.current = 0;
      nextRef.current = 9 + Math.random() * 6;
      setStars(p => [...p, { id: idRef.current++ }]);
    }
  });
  return <>{stars.map(s => <ShootingStar key={s.id} id={s.id} onComplete={remove} />)}</>;
};



// ── Saturn rings ─────────────────────────────────────────────────────────────
const SaturnRings = () => (
  <group rotation={[Math.PI * 0.4, 0.1, 0.05]}>
    <mesh>
      <ringGeometry args={[1.52, 2.0, 64]} />
      <meshBasicMaterial color="#e8d0a0" transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
    <mesh>
      <ringGeometry args={[2.05, 2.55, 64]} />
      <meshBasicMaterial color="#c4ac78" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// ── Carousel planet sizing ────────────────────────────────────────────────────
// All planets use the same base radius so every planet looks identical in size
// when at the same carousel position. Size is determined by position only.
const PLANET_R = 2.2;  // base radius for all planets
const SEL_R    = 4.0;  // radius when a planet is selected (clicked)

// ── Planet ────────────────────────────────────────────────────────────────────
interface PlanetProps {
  planet: Planet;
  texture: THREE.Texture | null;
  isSelected: boolean;
  anySelected: boolean;
  onSelect: () => void;
  canInteract: boolean;
  carouselAutoRef: React.MutableRefObject<number>;
  carouselIndex: number;
}
const PlanetComponent = ({
  planet, texture, isSelected, anySelected, onSelect, canInteract, carouselAutoRef, carouselIndex,
}: PlanetProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef  = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const glow = GLOW[planet.id] ?? { core: planet.color, mid: planet.color };

  const spinData       = useRef({ active: false, startTime: 0 });
  const prevIsSelected = useRef(false);
  const prevOffsetRef  = useRef<number | null>(null);
  const SPIN_DUR       = 1.4;

  useFrame((s, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = s.clock.elapsedTime;

    // Circular carousel: continuously auto-advances (carouselAutoRef increments every frame
    // in SolarSystemScene); modulo wraps outer planets from far-left to far-right (off-screen)
    // as it advances, so every planet eventually cycles through the center position.
    const activeFloat = CAROUSEL_CENTER_INDEX + carouselAutoRef.current;
    const N = CAROUSEL_ORDER.length;
    let offset = ((carouselIndex - activeFloat) % N + N) % N;
    if (offset > N / 2) offset -= N;

    // Position-based scale/depth: center=large & closest, adjacent=medium, outer=small & further back.
    // Steeper Gaussian (-1.2) gives a clear 3-tier visual hierarchy.
    const focusBoost = Math.exp(-1.2 * offset * offset);

    const tx3    = offset * CAROUSEL_X_SPACING;
    const ty3    = -0.8 + Math.abs(offset) * CAROUSEL_V_LIFT;
    const tz3    = CAROUSEL_Z - focusBoost * CAROUSEL_Z_FOCUS; // subtle depth: centered planet sits closer to camera
    const target = new THREE.Vector3(tx3, ty3, tz3);
    const prev   = prevOffsetRef.current;
    const wrapped = prev !== null && Math.abs(offset - prev) > N / 2;
    prevOffsetRef.current = offset;
    if (wrapped) {
      groupRef.current.position.copy(target); // snap off-screen → off-screen, never lerps across viewport
    } else {
      // Slightly tighter follow than before — the 2-transition scroll span covers less
      // pixel distance per swap, so this keeps the visual position from lagging behind
      // the (now faster) target while still staying smooth, not a hard snap.
      groupRef.current.position.lerp(target, 0.16);
    }

    const scaleMultiplier = THREE.MathUtils.lerp(0.42, 1.75, focusBoost);
    const ts = isSelected ? SEL_R : PLANET_R * scaleMultiplier;
    meshRef.current.scale.lerp(new THREE.Vector3(ts, ts, ts), 0.1);

    // Spin: trigger 360° bell-curve spin on selection
    if (isSelected && !prevIsSelected.current) {
      spinData.current = { active: true, startTime: t };
    }
    prevIsSelected.current = isSelected;

    if (spinData.current.active) {
      const elapsed = t - spinData.current.startTime;
      const p       = Math.min(1, elapsed / SPIN_DUR);
      if (p >= 1) {
        spinData.current.active = false;
      } else {
        const peakRate = (Math.PI * Math.PI) / SPIN_DUR;
        meshRef.current.rotation.y += peakRate * Math.sin(p * Math.PI) * delta;
      }
    } else {
      // Continuous auto-rotation at a constant baseline rate.
      const baseRate = 0.012 / Math.max(planet.speed, 0.6);
      meshRef.current.rotation.y += baseRate;
    }

    // Opacity: dim outer/non-focused planets
    const mat = meshRef.current.material as THREE.Material;
    if (mat) {
      const dimTarget = anySelected && !isSelected ? 0.45 : THREE.MathUtils.lerp(0.55, 1.0, focusBoost);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, dimTarget, 0.04);
    }
  });

  // Hover is always active so the name tooltip shows at any scroll position.
  // Cursor shows pointer only when clicking is also enabled (canInteract).
  const onEnter = () => { setHovered(true);  document.body.style.cursor = canInteract ? 'pointer' : 'default'; };
  const onLeave = () => { setHovered(false); document.body.style.cursor = 'auto'; };
  const onClick = canInteract ? onSelect : undefined;

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        scale={PLANET_R}
        onClick={onClick}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        <sphereGeometry args={[1, 42, 42]} />

        {texture ? (
          // meshBasicMaterial ignores scene lighting and renders the texture
          // at full brightness — same approach as SunCore, and correct for
          // planet photos that already have realistic light/shadow baked in.
          <meshBasicMaterial
            map={texture}
            color="#ffffff"
            transparent
            opacity={1}
          />
        ) : (
          // Fallback while textures are loading: emissive so it's always visible
          <meshStandardMaterial
            color={glow.core}
            emissive={glow.core}
            emissiveIntensity={0.5}
            roughness={0.7}
            metalness={0.0}
            transparent
            opacity={1}
          />
        )}

        {planet.id === 'saturn' && <SaturnRings />}
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html center distanceFactor={12} position={[0, PLANET_R * 2.2, 0]}>
          <div style={{
            background:    'rgba(4,6,18,0.90)',
            color:          glow.core,
            padding:        '6px 16px',
            borderRadius:   '22px',
            border:         `1px solid ${glow.core}55`,
            whiteSpace:     'nowrap',
            textShadow:     `0 0 8px ${glow.core}`,
            pointerEvents:  'none',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            '2px',
          }}>
            <span style={{ fontSize: '20px', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '3px' }}>
              {PLANET_LABELS[planet.id]?.emoji} {planet.name.toUpperCase()}
            </span>
            <span style={{ fontSize: '15px', fontFamily: 'sans-serif', letterSpacing: '1.5px', opacity: 0.85 }}>
              {PLANET_LABELS[planet.id]?.hindi}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};

// ── Planet texture loader — suspends until all textures are ready ─────────────
// Same pattern as SunCore: useTexture inside a Suspense, materials created
// with the texture already set so Three.js compiles the shader correctly.
interface PlanetGroupProps {
  selectedPlanet: Planet | null;
  onPlanetSelect: (planet: Planet | null) => void;
  canInteract: boolean;
  carouselAutoRef: React.MutableRefObject<number>;
}
const PlanetGroupWithTextures = ({ selectedPlanet, onPlanetSelect, canInteract, carouselAutoRef }: PlanetGroupProps) => {
  const textures = useTexture(PLANET_TEXTURE_PATHS) as Record<keyof typeof PLANET_TEXTURE_PATHS, THREE.Texture>;
  const { gl }   = useThree();

  // Build a 2:1 CanvasTexture for the Sun at runtime.
  // sun-texture.png is a disc illustration on a black background — not equirectangular.
  // Strategy: fill a warm gradient (eliminates black), then overlay the disc twice
  // (left + right halves) using 'lighten' compositing so only the bright surface shows.
  const sunCanvasTex = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    Object.values(textures).forEach(tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
    });

    const img = textures.sun?.image as HTMLImageElement | undefined;
    if (!img?.width) return textures.sun;   // fallback if image not ready

    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Warm sun gradient — covers the full equirectangular canvas
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.65);
    grad.addColorStop(0,    '#fff8c0');
    grad.addColorStop(0.25, '#ffcc00');
    grad.addColorStop(0.55, '#ff8800');
    grad.addColorStop(1,    '#cc4400');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Overlay the disc twice (covers left hemisphere + right hemisphere).
    // 'lighten' picks the brighter channel — the gradient wins over the black
    // background of the disc, the disc's orange surface wins over the gradient.
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(img, 0, 0, H, H);
    ctx.drawImage(img, H, 0, H, H);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace  = THREE.SRGBColorSpace;
    tex.anisotropy  = maxAniso;
    tex.wrapS       = THREE.RepeatWrapping;
    tex.wrapT       = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [textures, gl]);

  return (
    <>
      {PLANETS.filter(p => CAROUSEL_ORDER.includes(p.id)).map((p: Planet) => (
        <PlanetComponent
          key={p.id}
          planet={p}
          texture={p.id === 'sun' ? sunCanvasTex : (textures[p.id as keyof typeof PLANET_TEXTURE_PATHS] ?? null)}
          isSelected={selectedPlanet?.id === p.id}
          anySelected={selectedPlanet !== null}
          onSelect={() => onPlanetSelect(selectedPlanet?.id === p.id ? null : p)}
          canInteract={canInteract}
          carouselAutoRef={carouselAutoRef}
          carouselIndex={CAROUSEL_ORDER.indexOf(p.id)}
        />
      ))}
    </>
  );
};

// Fallback: render planets with solid colors while textures download
const PlanetGroupFallback = ({ selectedPlanet, onPlanetSelect, canInteract, carouselAutoRef }: PlanetGroupProps) => (
  <>
    {PLANETS.filter(p => CAROUSEL_ORDER.includes(p.id)).map((p: Planet) => (
      <PlanetComponent
        key={p.id}
        planet={p}
        texture={null}
        isSelected={selectedPlanet?.id === p.id}
        anySelected={selectedPlanet !== null}
        onSelect={() => onPlanetSelect(selectedPlanet?.id === p.id ? null : p)}
        canInteract={canInteract}
        carouselAutoRef={carouselAutoRef}
        carouselIndex={CAROUSEL_ORDER.indexOf(p.id)}
      />
    ))}
  </>
);

// ── Main scene ────────────────────────────────────────────────────────────────
interface SceneProps {
  selectedPlanet: Planet | null;
  onPlanetSelect: (planet: Planet | null) => void;
  canInteract: boolean;
}
const SolarSystemScene = ({ selectedPlanet, onPlanetSelect, canInteract }: SceneProps) => {
  const { camera, mouse } = useThree();
  const selectedRef = useRef<Planet | null>(null);
  useEffect(() => { selectedRef.current = selectedPlanet; }, [selectedPlanet]);

  useFrame(() => {
    const sel = selectedRef.current;

    // Fixed camera — subtle mouse parallax only, never scroll-driven.
    const tx = sel ? -3 : mouse.x * 1.5;
    const ty = sel ?  1 : FIXED_CAM_Y + mouse.y * 1.0;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, tx, 0.028);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, ty, 0.028);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, FIXED_CAM_Z, 0.036);

    camera.lookAt(0, 6, 0);
  });

  // ── Carousel position: continuous idle drift ───────────────────────────────
  // Ticks on its own clock (one step every CAROUSEL_STEP_SECONDS) so the
  // carousel is always alive, independent of any scroll input.
  const carouselIdleRef = useRef(0);
  const carouselAutoRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.max(delta, 1 / 240);
    carouselIdleRef.current += (1 / CAROUSEL_STEP_SECONDS) * dt;
    carouselAutoRef.current = carouselIdleRef.current;
  });

  const planetGroupProps: PlanetGroupProps = { selectedPlanet, onPlanetSelect, canInteract, carouselAutoRef };

  return (
    <>
      <ambientLight intensity={0.25} color="#8899bb" />
      <pointLight position={[-25, 15, 30]} intensity={0.3} color="#5566ee" />


      {/* Nebula clouds disabled to match the clean dark navy background in the reference design */}
      {/*
      <NebulaCloud position={[-65, 22, -85]} color="#8844ff" count={380} spread={22} />
      <NebulaCloud position={[ 72, -8, -90]} color="#ff3366" count={320} spread={18} />
      <NebulaCloud position={[  5, 42,-100]} color="#3366ff" count={300} spread={20} />
      */}

      <group position={[0, 0.5, 0]}>
        <Suspense fallback={<PlanetGroupFallback {...planetGroupProps} />}>
          <PlanetGroupWithTextures {...planetGroupProps} />
        </Suspense>
      </group>
    </>
  );
};

// ── Canvas wrapper ────────────────────────────────────────────────────────────
export interface InteractiveSolarSystemProps {
  selectedPlanet: Planet | null;
  onPlanetSelect: (planet: Planet | null) => void;
  canInteract: boolean;
}
export const InteractiveSolarSystem = ({
  selectedPlanet, onPlanetSelect, canInteract,
}: InteractiveSolarSystemProps) => (
  <Canvas
    camera={{ position: [0, FIXED_CAM_Y, FIXED_CAM_Z], fov: 65 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    style={{ width: '100%', height: '100%' }}
  >
    <SolarSystemScene
      selectedPlanet={selectedPlanet}
      onPlanetSelect={onPlanetSelect}
      canInteract={canInteract}
    />
  </Canvas>
);
