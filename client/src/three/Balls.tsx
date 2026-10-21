import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createBallTexture } from './textures';

const BALLS = [
  { position: [0, 0.62, 0] as [number, number, number], scale: 1 },
  { position: [-22, 0.6, 13] as [number, number, number], scale: 0.9 },
  { position: [19, 0.6, -17] as [number, number, number], scale: 0.95 },
  { position: [34, 0.6, 22] as [number, number, number], scale: 0.85 },
  { position: [-41, 0.6, -22] as [number, number, number], scale: 0.8 },
];

function Ball({
  position,
  scale,
  index,
}: {
  position: [number, number, number];
  scale: number;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(() => createBallTexture(256), []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.25 + index;
    group.current.rotation.x = Math.sin(t * 0.4 + index) * 0.2;
    group.current.position.y = position[1] + Math.sin(t * 1.6 + index * 1.7) * 0.08;
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.62, 24, 18]} />
        <meshStandardMaterial map={texture} roughness={0.45} metalness={0.05} />
      </mesh>
    </group>
  );
}

export default function Balls() {
  return (
    <group>
      {BALLS.map((ball, index) => (
        <Ball key={index} position={ball.position} scale={ball.scale} index={index} />
      ))}
    </group>
  );
}
