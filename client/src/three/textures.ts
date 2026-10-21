import * as THREE from 'three';

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось создать 2D-контекст для текстуры');
  return { canvas, ctx };
}

/** Газон: полосы + шум травы + лёгкое затемнение по краям. */
export function createGrassTexture(size = 1024): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  const stripes = 12;
  const stripeWidth = size / stripes;

  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#1f6b3a' : '#195c32';
    ctx.fillRect(i * stripeWidth, 0, stripeWidth + 1, size);
  }

  // Волокна травы
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 12000; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 3 + Math.random() * 7;
    ctx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Мягкое затемнение по краям
  const vignette = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.2,
    size / 2,
    size / 2,
    size * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Сетка ворот. */
export function createNetTexture(size = 256): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  const cell = size / 12;

  for (let i = 0; i <= 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Футбольный мяч: светлые панели с тёмными вставками. */
export function createBallTexture(size = 512): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(0, 0, size, size);

  const dark = '#15171c';
  const drawPentagon = (cx: number, cy: number, r: number, rotation = 0) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const angle = rotation + (i * Math.PI * 2) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
  };

  const cols = 6;
  const rows = 4;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cx = ((col + (row % 2 ? 0.5 : 0)) / cols) * size;
      const cy = ((row + 0.5) / rows) * size;
      drawPentagon(cx, cy, size * 0.055, (row + col) * 0.3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Бетон/тёмный металл трибун. */
export function createStandTexture(size = 256): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#14161b';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = 0.05 + Math.random() * 0.22;
    ctx.fillStyle = `rgba(${180 + Math.random() * 60}, ${170 + Math.random() * 60}, ${
      150 + Math.random() * 70
    }, ${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 4);
  return texture;
}
