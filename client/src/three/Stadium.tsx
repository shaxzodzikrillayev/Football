import { useMemo } from 'react';
import * as THREE from 'three';
import { PITCH } from './PitchLines';
import { createStandTexture } from './textures';

interface Tier {
  width: number;
  length: number;
  height: number;
  y: number;
  z: number;
}

const STAND_OFFSET = 14;
const TIERS: Tier[] = [
  { width: PITCH.width + 40, length: 12, height: 7, y: 3.5, z: STAND_OFFSET },
  { width: PITCH.width + 52, length: 12, height: 13, y: 6.5, z: STAND_OFFSET + 11 },
  { width: PITCH.width + 64, length: 12, height: 19, y: 9.5, z: STAND_OFFSET + 22 },
];

function Stands() {
  const texture = useMemo(() => createStandTexture(256), []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        color: '#2a2e36',
        roughness: 0.95,
        metalness: 0.05,
      }),
    [texture],
  );

  const accent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#101319',
        roughness: 0.9,
        emissive: '#3a2f10',
        emissiveIntensity: 0.5,
      }),
    [],
  );

  return (
    <group>
      {TIERS.map((tier, index) => (
        <group key={index}>
          {/* Длинные трибуны (вдоль X) */}
          <mesh position={[0, tier.y, tier.z]} material={material} receiveShadow>
            <boxGeometry args={[tier.width, tier.height, tier.length]} />
          </mesh>
          <mesh position={[0, tier.y, -tier.z]} material={material} receiveShadow>
            <boxGeometry args={[tier.width, tier.height, tier.length]} />
          </mesh>

          {/* Торцевые трибуны (вдоль Z) */}
          <mesh position={[tier.z, tier.y, 0]} material={material} receiveShadow>
            <boxGeometry args={[tier.length, tier.height, PITCH.length + 40]} />
          </mesh>
          <mesh position={[-tier.z, tier.y, 0]} material={material} receiveShadow>
            <boxGeometry args={[tier.length, tier.height, PITCH.length + 40]} />
          </mesh>

          {/* Золотая кромка */}
          <mesh position={[0, tier.y + tier.height / 2 + 0.25, tier.z - tier.length / 2 - 0.2]} material={accent}>
            <boxGeometry args={[tier.width, 0.5, 0.5]} />
          </mesh>
          <mesh position={[0, tier.y + tier.height / 2 + 0.25, -tier.z + tier.length / 2 + 0.2]} material={accent}>
            <boxGeometry args={[tier.width, 0.5, 0.5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Floodlights() {
  const poleMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1b1e24', roughness: 0.7, metalness: 0.4 }),
    [],
  );
  const lampMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff8e0',
        emissive: '#ffe9a8',
        emissiveIntensity: 2.6,
        roughness: 0.3,
      }),
    [],
  );

  const positions: [number, number, number][] = [
    [62, 0, 46],
    [-62, 0, 46],
    [62, 0, -46],
    [-62, 0, -46],
  ];

  return (
    <group>
      {positions.map((position, index) => (
        <group key={index} position={position}>
          <mesh position={[0, 13, 0]} material={poleMaterial} castShadow>
            <cylinderGeometry args={[0.5, 0.85, 26, 10]} />
          </mesh>
          <mesh position={[0, 26.6, 0]} material={poleMaterial}>
            <boxGeometry args={[7, 3.4, 0.8]} />
          </mesh>
          <mesh position={[0, 26.6, -0.5]} material={lampMaterial}>
            <boxGeometry args={[6.2, 2.6, 0.35]} />
          </mesh>
          <pointLight
            position={[0, 24, 0]}
            intensity={index < 2 ? 260 : 120}
            distance={130}
            decay={1.6}
            color="#ffeec4"
          />
        </group>
      ))}
    </group>
  );
}

function Stars() {
  const geometry = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 160 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.15 + Math.random() * 0.85);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.8 + 20;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.9} color="#cfd8e8" sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

function CrowdLights() {
  const geometry = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const side = i % 4;
      const t = (Math.random() - 0.5) * (PITCH.width + 46);
      const h = 6 + Math.random() * 16;
      const d = STAND_OFFSET + 3 + Math.random() * 22;
      if (side === 0) positions.set([t, h, d], i * 3);
      else if (side === 1) positions.set([t, h, -d], i * 3);
      else if (side === 2) positions.set([d, h, t * 0.6], i * 3);
      else positions.set([-d, h, t * 0.6], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.6} color="#d4af37" sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

export default function Stadium() {
  return (
    <group>
      <Stands />
      <Floodlights />
      <CrowdLights />
      <Stars />
    </group>
  );
}
