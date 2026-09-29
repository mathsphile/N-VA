'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * NØVA — Private Identity Capsule.
 *
 * A vertical, precision-machined cryptographic device. Data particles
 * spiral inward and are consumed by the central proof core; segmented
 * security rings and stacked hex plates rotate at different rates;
 * verification pulses expand outward from the core. Identity enters,
 * proof leaves — nothing in between escapes.
 *
 * Raw React Three Fiber + three.js (no extra deps). Calm, restrained,
 * engineered. Reduced-motion, pointer and scroll parallax supported.
 */

const GRAPHITE = '#23232d';
const GRAPHITE_DARK = '#17171f';
const SHELL_TINT = '#31313f';
const ACCENT = '#8b86fa';
const CORE_LIGHT = '#bfe4ff';

const smoothstep = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

/* ---------------- outer shell ---------------- */

function Shell({ t }: { t: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.rotation.y = t.current * 0.035;
  });
  return (
    <group ref={group}>
      <mesh>
        <cylinderGeometry args={[0.72, 0.72, 2.5, 6, 1]} />
        <meshStandardMaterial
          color={SHELL_TINT}
          transparent
          opacity={0.09}
          roughness={0.18}
          metalness={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.CylinderGeometry(0.72, 0.72, 2.5, 6, 1)]} />
        <lineBasicMaterial color={ACCENT} transparent opacity={0.22} />
      </lineSegments>
      {/* machined end caps */}
      {[1, -1].map((dir) => (
        <mesh key={dir} position={[0, dir * 1.25, 0]} rotation={dir > 0 ? [0, 0, 0] : [Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.66, 0.16, 6, 1]} />
          <meshStandardMaterial color={GRAPHITE} roughness={0.32} metalness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- segmented security rings ---------------- */

const RINGS = [
  { radius: 1.02, y: 0.62, arc: 1.95, tilt: 0.1, speed: 0.07 },
  { radius: 0.94, y: 0.0, arc: 2.6, tilt: -0.06, speed: -0.05 },
  { radius: 1.08, y: -0.66, arc: 1.6, tilt: 0.14, speed: 0.1 },
];

function SecurityRings({ t }: { t: React.MutableRefObject<number> }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    refs.current.forEach((g, i) => {
      const ring = RINGS[i];
      if (g && ring) g.rotation.y = t.current * ring.speed;
    });
  });
  return (
    <group>
      {RINGS.map((ring, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[0, ring.y, 0]}
          rotation={[Math.PI / 2 + ring.tilt, 0, ring.arc]}
        >
          {/* primary arc + short satellite segment = engineered gaps */}
          <mesh>
            <torusGeometry args={[ring.radius, 0.009, 8, 72, ring.arc]} />
            <meshStandardMaterial color={GRAPHITE} roughness={0.25} metalness={1} />
          </mesh>
          <mesh rotation={[0, 0, ring.arc + 0.5]}>
            <torusGeometry args={[ring.radius, 0.006, 8, 24, 0.62]} />
            <meshStandardMaterial color="#3c3c4c" roughness={0.3} metalness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------------- stacked hex proof plates ---------------- */

function ProofPlates({ t }: { t: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.children.forEach((child) => {
      if (child.userData.struts === true) return;
      const index = child.userData.index as number | undefined;
      if (index === undefined) return;
      child.position.y = -0.62 + index * 0.31 + Math.sin(t.current * 0.45 + index * 1.25) * 0.022;
      child.rotation.y = (index % 2 === 0 ? 1 : -1) * (t.current * 0.02 + index * 0.35);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`plate-${i}`} userData={{ index: i }}>
          <cylinderGeometry args={[0.55 - i * 0.02, 0.55 - i * 0.02, 0.014, 6]} />
          <meshStandardMaterial
            color={i % 2 ? GRAPHITE_DARK : GRAPHITE}
            roughness={0.3}
            metalness={0.92}
            flatShading
          />
        </mesh>
      ))}
      {/* precision struts tying the stack to the end caps */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        return (
          <mesh key={`strut-${i}`} position={[Math.cos(a) * 0.66, 0, Math.sin(a) * 0.66]} userData={{ struts: true }}>
            <cylinderGeometry args={[0.0075, 0.0075, 2.36, 6]} />
            <meshStandardMaterial color="#34343f" roughness={0.35} metalness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------------- central proof core ---------------- */

function ProofCore({ t, hovered }: { t: React.MutableRefObject<number>; hovered: React.MutableRefObject<boolean> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const intensity = useRef(0.85);
  useFrame(() => {
    if (!mesh.current || !light.current) return;
    mesh.current.rotation.y = t.current * 0.24;
    mesh.current.rotation.x = t.current * 0.14;
    const pulse = 0.5 + 0.5 * Math.sin(t.current * 0.9);
    const target = (hovered.current ? 1.35 : 0.85) + pulse * 0.12;
    intensity.current += (target - intensity.current) * 0.06;
    (mesh.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity.current;
    light.current.intensity = 0.4 + intensity.current * 0.22;
  });
  return (
    <group>
      <mesh ref={mesh}>
        <octahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial
          color="#d9f2ff"
          emissive={CORE_LIGHT}
          emissiveIntensity={0.85}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      {/* generous invisible hit area for hover (kept renderable for raycast) */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
        }}
        onPointerOut={() => {
          hovered.current = false;
        }}
      >
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight ref={light} color={CORE_LIGHT} intensity={0.5} distance={3.2} decay={2} />
      {/* fine cage around the node */}
      <lineSegments>
        <edgesGeometry args={[new THREE.OctahedronGeometry(0.3, 0)]} />
        <lineBasicMaterial color={CORE_LIGHT} transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}

/* ---------------- verification pulse ---------------- */

function VerificationPulse({ t }: { t: React.MutableRefObject<number> }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ring.current) return;
    const cycle = (t.current % 3.6) / 3.6;
    const visible = cycle < 0.4;
    ring.current.visible = visible;
    if (visible) {
      const s = 0.5 + smoothstep(cycle / 0.4) * 2.4;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.22 * (1 - cycle / 0.4);
    }
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.42, 0.432, 64]} />
      <meshBasicMaterial color={CORE_LIGHT} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ---------------- inbound data particles ---------------- */

const PARTICLE_COUNT = 8;

function DataParticles({ t }: { t: React.MutableRefObject<number> }) {
  const geo = useRef<THREE.BufferGeometry>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        phase: i / PARTICLE_COUNT + Math.random() * 0.06,
        startAngle: Math.random() * Math.PI * 2,
        startRadius: 1.9 + Math.random() * 0.5,
        startY: (Math.random() - 0.5) * 2.6,
      })),
    [],
  );
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame(() => {
    if (!geo.current) return;
    const LIFE = 5.2;
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const s = seeds[i];
      if (!s) continue;
      const u = (t.current / LIFE + s.phase) % 1;
      const k = smoothstep(u);
      const r = s.startRadius * (1 - k) + 0.05;
      const a = s.startAngle + u * 3.1;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = s.startY * (1 - k) * 0.85;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    geo.current.getAttribute('position').needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color={ACCENT}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------------- ambient dust (depth) ---------------- */

function AmbientDust({ t }: { t: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Points>(null);
  const points = useMemo(() => {
    const n = 120;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const r = 2.6 + Math.random() * 1.8;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 4.6;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = t.current * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.008} color="#6b6b7d" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ---------------- pointer + scroll parallax rig ---------------- */

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const scroll = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      const main = document.getElementById('main');
      const h = main ? Math.min(window.scrollY / Math.max(main.clientHeight, 1), 1) : 0;
      scroll.current = h * 0.18;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useFrame(({ pointer }) => {
    if (!group.current) return;
    const targetX = pointer.y * 0.07; // ≤ ~4°
    const targetY = pointer.x * 0.09;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.045;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.045;
    group.current.position.y += (-scroll.current - group.current.position.y) * 0.06;
    camera.position.z += (5.05 - scroll.current * 0.4 - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return <group ref={group}>{children}</group>;
}

/* ---------------- scene ---------------- */

function CapsuleScene({ reducedMotion }: { reducedMotion?: boolean }) {
  const t = useRef(reducedMotion ? 4.1 : 0);
  const hovered = useRef(false);

  useFrame((_, delta) => {
    if (!reducedMotion) t.current += delta;
  });

  return (
    <>
      {/* soft key, cool rim, existing-accent fill — no env maps, no extra deps */}
      <ambientLight intensity={0.5} color="#a8a8bd" />
      <directionalLight position={[4.5, 6, 5]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-5, 2.5, -6]} intensity={0.65} color="#d6e6ff" />
      <pointLight position={[0, -3.2, 1.6]} intensity={0.35} color={ACCENT} distance={7} decay={2} />
      <Rig>
        <Shell t={t} />
        <SecurityRings t={t} />
        <ProofPlates t={t} />
        <ProofCore t={t} hovered={hovered} />
        <VerificationPulse t={t} />
        <DataParticles t={t} />
        <AmbientDust t={t} />
      </Rig>
    </>
  );
}

export function VaultScene({ reducedMotion }: { reducedMotion?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.35, 5.05], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      style={{ pointerEvents: reducedMotion ? 'none' : 'auto' }}
      aria-hidden
    >
      <CapsuleScene reducedMotion={reducedMotion} />
    </Canvas>
  );
}

export default VaultScene;
