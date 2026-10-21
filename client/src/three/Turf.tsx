import { useMemo } from 'react';
import * as THREE from 'three';
import { PITCH } from './PitchLines';
import { createGrassTexture } from './textures';

export default function Turf() {
  const grass = useMemo(() => createGrassTexture(1024), []);

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#124026', roughness: 1 });
    const top = new THREE.MeshStandardMaterial({
      map: grass,
      roughness: 0.92,
      metalness: 0.02,
    });
    return [side, side, top, side, side, side];
  }, [grass]);

  return (
    <mesh position={[0, PITCH.turfHeight / 2, 0]} material={materials} receiveShadow>
      <boxGeometry args={[PITCH.width, PITCH.turfHeight, PITCH.length]} />
    </mesh>
  );
}
