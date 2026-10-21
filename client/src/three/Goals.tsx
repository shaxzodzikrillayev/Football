import { useMemo } from 'react';
import * as THREE from 'three';
import { PITCH } from './PitchLines';
import { createNetTexture } from './textures';

const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const GOAL_DEPTH = 2.2;
const POST_RADIUS = 0.11;

export default function Goals() {
  const netTexture = useMemo(() => {
    const texture = createNetTexture(256);
    texture.repeat.set(4, 2);
    return texture;
  }, []);

  const netMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: netTexture,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        roughness: 0.9,
        color: '#dfe6ef',
      }),
    [netTexture],
  );

  const postMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.45, metalness: 0.1 }),
    [],
  );

  const half = PITCH.length / 2;

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * half]} rotation={[0, side === -1 ? 0 : Math.PI, 0]}>
          {/* Штанги */}
          {[-1, 1].map((x) => (
            <mesh
              key={`post-${x}`}
              position={[x * (GOAL_WIDTH / 2), GOAL_HEIGHT / 2, 0]}
              material={postMaterial}
              castShadow
            >
              <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 14]} />
            </mesh>
          ))}

          {/* Перекладина */}
          <mesh
            position={[0, GOAL_HEIGHT, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={postMaterial}
            castShadow
          >
            <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, GOAL_WIDTH, 14]} />
          </mesh>

          {/* Задняя стенка */}
          <mesh position={[0, GOAL_HEIGHT / 2, -GOAL_DEPTH]} material={netMaterial}>
            <planeGeometry args={[GOAL_WIDTH, GOAL_HEIGHT]} />
          </mesh>

          {/* Боковые стенки */}
          {[-1, 1].map((x) => (
            <mesh
              key={`side-${x}`}
              position={[x * (GOAL_WIDTH / 2), GOAL_HEIGHT / 2, -GOAL_DEPTH / 2]}
              rotation={[0, Math.PI / 2, 0]}
              material={netMaterial}
            >
              <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
            </mesh>
          ))}

          {/* Верх */}
          <mesh
            position={[0, GOAL_HEIGHT, -GOAL_DEPTH / 2]}
            rotation={[Math.PI / 2, 0, 0]}
            material={netMaterial}
          >
            <planeGeometry args={[GOAL_WIDTH, GOAL_DEPTH]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
