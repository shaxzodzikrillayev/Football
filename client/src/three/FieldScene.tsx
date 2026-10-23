import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Turf from './Turf';
import { PitchLines, PITCH } from './PitchLines';
import Goals from './Goals';
import Balls from './Balls';
import Stadium from './Stadium';
import { useReducedMotion } from '../hooks/useMediaQuery';

/** Плавное управление камерой: лёгкое вращение за курсором + медленный автодрейф. */
function CameraRig({ interactive, animated }: { interactive: boolean; animated: boolean }) {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 44, 94));

  useFrame((state, delta) => {
    if (!animated) return;
    const time = state.clock.elapsedTime;
    const drift = Math.sin(time * 0.07) * 0.075;
    const yaw = interactive ? drift + pointer.x * 0.12 : drift;
    const radius = 96;
    const height = 44 + (interactive ? pointer.y * 5 : 0);

    target.current.set(Math.sin(yaw) * radius, height, Math.cos(yaw) * radius);
    camera.position.lerp(target.current, Math.min(1, delta * 2.4));
    camera.lookAt(0, 1, 0);
  });

  return null;
}

/**
 * Сцена и освещение статичны, поэтому карту теней достаточно посчитать
 * один раз. Без этого WebGL перерисовывает её каждый кадр — основной
 * источник «тормозов» на слабых видеокартах.
 */
function StaticShadows({ enabled }: { enabled: boolean }) {
  const { gl } = useThree();
  const frames = useRef(0);

  useEffect(() => {
    frames.current = 0;
    if (enabled) {
      gl.shadowMap.autoUpdate = true;
      gl.shadowMap.needsUpdate = true;
    }
  }, [gl, enabled]);

  useFrame(() => {
    if (!enabled) return;
    frames.current += 1;
    if (frames.current >= 2) gl.shadowMap.autoUpdate = false;
  });

  return null;
}

function Lighting({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.55} color="#c6d2e8" />
      <hemisphereLight args={['#3b4a6b', '#0d1a12', 0.75]} />
      <directionalLight
        position={[38, 70, 26]}
        intensity={1.75}
        color="#fff4dd"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={10}
        shadow-camera-far={220}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-40, 45, -30]} intensity={0.5} color="#8fb4ff" />
      <pointLight position={[0, 26, 0]} intensity={0.35} distance={120} decay={1.2} color="#ffeec4" />
    </>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <circleGeometry args={[220, 48]} />
      <meshStandardMaterial color="#080a0d" roughness={1} />
    </mesh>
  );
}

interface FieldSceneProps {
  className?: string;
}

export default function FieldScene({ className }: FieldSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [supported, setSupported] = useState(true);
  const reducedMotion = useReducedMotion();

  const shadows = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 900 && !reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries[0]?.isIntersecting ?? true);
      },
      { threshold: 0.05 },
    );
    observer.observe(element);

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      setSupported(Boolean(context));
      // Проверочный контекст больше не нужен — освобождаем его,
      // чтобы не расходовать лимит WebGL-контекстов браузера.
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setSupported(false);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  if (!supported) {
    return (
      <div className={className} ref={containerRef}>
        <div className="loader">
          <span className="loader__ring" />
          <span>Ваш браузер не поддерживает WebGL — 3D-поле недоступно.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className} ref={containerRef}>
      <Canvas
        shadows={shadows}
        dpr={[1, 1.5]}
        frameloop={!visible || !pageVisible ? 'never' : reducedMotion ? 'demand' : 'always'}
        camera={{ position: [0, 44, 96], fov: 38, near: 0.5, far: 600 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.background = new THREE.Color('#05070b');
          scene.fog = new THREE.Fog('#05070b', 120, 330);
        }}
      >
        <Lighting shadows={shadows} />
        <StaticShadows enabled={shadows} />
        <CameraRig interactive={!reducedMotion} animated={!reducedMotion} />
        <Ground />
        <Turf />
        <PitchLines />
        <Goals />
        <Balls />
        <Stadium />
      </Canvas>
    </div>
  );
}

export { PITCH };
