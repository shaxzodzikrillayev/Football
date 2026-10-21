import { useMemo } from 'react';
import * as THREE from 'three';

export const PITCH = {
  width: 105,
  length: 68,
  margin: 3,
  turfHeight: 0.6,
  lineWidth: 0.22,
};

const HALF = PITCH.length / 2;
const HALF_W = PITCH.width / 2;

interface Builder {
  positions: number[];
  push: (x1: number, z1: number, x2: number, z2: number, width: number) => void;
  rect: (x1: number, z1: number, x2: number, z2: number, width: number) => void;
  arc: (
    cx: number,
    cz: number,
    r: number,
    start: number,
    end: number,
    width: number,
    segments: number,
  ) => void;
}

/**
 * Разметка поля строится как единая геометрия из плоских четырёхугольников:
 * линии получаются объёмными по свету и не требуют текстур.
 */
export function buildPitchLines(): THREE.BufferGeometry {
  const y = PITCH.turfHeight + 0.02;
  const w = PITCH.lineWidth;
  const positions: number[] = [];

  const push: Builder['push'] = (x1, z1, x2, z2, width) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2);
    const nz = (dx / len) * (width / 2);

    positions.push(
      x1 + nx,
      y,
      z1 + nz,
      x2 + nx,
      y,
      z2 + nz,
      x2 - nx,
      y,
      z2 - nz,
      x1 + nx,
      y,
      z1 + nz,
      x2 - nx,
      y,
      z2 - nz,
      x1 - nx,
      y,
      z1 - nz,
    );
  };

  const rect: Builder['rect'] = (x1, z1, x2, z2, width) => {
    push(x1, z1, x2, z1, width);
    push(x2, z1, x2, z2, width);
    push(x2, z2, x1, z2, width);
    push(x1, z2, x1, z1, width);
  };

  const arc: Builder['arc'] = (cx, cz, r, start, end, width, segments = 48) => {
    const step = (end - start) / segments;
    for (let i = 0; i < segments; i += 1) {
      const a0 = start + step * i;
      const a1 = a0 + step;
      push(
        cx + Math.cos(a0) * r,
        cz + Math.sin(a0) * r,
        cx + Math.cos(a1) * r,
        cz + Math.sin(a1) * r,
        width,
      );
    }
  };

  const inner = PITCH.margin;

  // Границы поля
  rect(-HALF_W + inner, -HALF + inner, HALF_W - inner, HALF - inner, w);

  // Центральная линия и круг
  push(-HALF_W + inner, 0, HALF_W - inner, 0, w);
  arc(0, 0, 9.15, 0, Math.PI * 2, w, 72);

  // Штрафные площади
  const penaltyWidth = 40.32 / 2;
  const penaltyDepth = 16.5;
  const goalAreaWidth = 18.32 / 2;
  const goalAreaDepth = 5.5;

  // Верхняя половина (атака в минус Z)
  push(-penaltyWidth, -HALF + inner, -penaltyWidth, -HALF + inner + penaltyDepth, w);
  push(penaltyWidth, -HALF + inner, penaltyWidth, -HALF + inner + penaltyDepth, w);
  push(-penaltyWidth, -HALF + inner + penaltyDepth, penaltyWidth, -HALF + inner + penaltyDepth, w);

  push(-goalAreaWidth, -HALF + inner, -goalAreaWidth, -HALF + inner + goalAreaDepth, w);
  push(goalAreaWidth, -HALF + inner, goalAreaWidth, -HALF + inner + goalAreaDepth, w);
  push(-goalAreaWidth, -HALF + inner + goalAreaDepth, goalAreaWidth, -HALF + inner + goalAreaDepth, w);

  // Нижняя половина
  push(-penaltyWidth, HALF - inner, -penaltyWidth, HALF - inner - penaltyDepth, w);
  push(penaltyWidth, HALF - inner, penaltyWidth, HALF - inner - penaltyDepth, w);
  push(-penaltyWidth, HALF - inner - penaltyDepth, penaltyWidth, HALF - inner - penaltyDepth, w);

  push(-goalAreaWidth, HALF - inner, -goalAreaWidth, HALF - inner - goalAreaDepth, w);
  push(goalAreaWidth, HALF - inner, goalAreaWidth, HALF - inner - goalAreaDepth, w);
  push(-goalAreaWidth, HALF - inner - goalAreaDepth, goalAreaWidth, HALF - inner - goalAreaDepth, w);

  // Дуги у угловых флагов
  const corner = 1;
  arc(-HALF_W + inner, -HALF + inner, corner, 0, Math.PI / 2, w, 12);
  arc(HALF_W - inner, -HALF + inner, corner, Math.PI / 2, Math.PI, w, 12);
  arc(HALF_W - inner, HALF - inner, corner, Math.PI, Math.PI * 1.5, w, 12);
  arc(-HALF_W + inner, HALF - inner, corner, Math.PI * 1.5, Math.PI * 2, w, 12);

  // Точки и дуги у штрафных
  const penaltySpot = 11;
  const arcAngle = Math.asin((penaltyDepth - penaltySpot) / 9.15);
  const topSpotZ = -HALF + inner + penaltySpot;
  const bottomSpotZ = HALF - inner - penaltySpot;

  arc(0, topSpotZ, 9.15, arcAngle, Math.PI - arcAngle, w, 32);
  arc(0, bottomSpotZ, 9.15, Math.PI + arcAngle, Math.PI * 2 - arcAngle, w, 32);
  arc(0, topSpotZ, 0.35, 0, Math.PI * 2, w, 12);
  arc(0, bottomSpotZ, 0.35, 0, Math.PI * 2, w, 12);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function PitchLines() {
  const geometry = useMemo(() => buildPitchLines(), []);

  return (
    <mesh geometry={geometry} receiveShadow position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#f2f5f0"
        roughness={0.75}
        metalness={0.05}
        emissive="#0f1a12"
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}
