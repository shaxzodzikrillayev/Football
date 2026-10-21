interface FootballProps {
  size?: number | string;
  className?: string;
}

/**
 * Премиальный футбольный мяч (SVG): тёмный корпус с золотыми швами и глянцевым бликом.
 * Используется как заглушка 3D-сцены и как декоративный элемент.
 */
export default function Football({ size = 220, className = '' }: FootballProps) {
  return (
    <svg
      className={`football ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Футбольный мяч"
    >
      <defs>
        <radialGradient id="ball-body" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#2b3038" />
          <stop offset="45%" stopColor="#171a20" />
          <stop offset="100%" stopColor="#0a0b0e" />
        </radialGradient>
        <radialGradient id="ball-gloss" cx="34%" cy="26%" r="42%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="ball-seam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3e4ac" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8c6d1f" />
        </linearGradient>
        <clipPath id="ball-clip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="46" fill="url(#ball-body)" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ball-seam)" strokeWidth="1.6" />

      <g clipPath="url(#ball-clip)">
        {/* центральный пентагон */}
        <polygon
          points="50,36 63.3,45.7 58.2,61.3 41.8,61.3 36.7,45.7"
          fill="url(#ball-seam)"
        />
        {/* швы от центра к краю */}
        <g stroke="url(#ball-seam)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="50" y1="36" x2="50" y2="4" />
          <line x1="63.3" y1="45.7" x2="93.8" y2="35.7" />
          <line x1="58.2" y1="61.3" x2="77" y2="87.2" />
          <line x1="41.8" y1="61.3" x2="23" y2="87.2" />
          <line x1="36.7" y1="45.7" x2="6.2" y2="35.7" />
        </g>
        {/* пентагоны по краю */}
        <g fill="#0d0f13" stroke="url(#ball-seam)" strokeWidth="1.4">
          <polygon points="73.5,5.6 86,14.7 81.2,29.7 65.8,29.7 61,14.7" />
          <polygon points="86.6,55.4 99,64.5 94.2,79.5 78.8,79.5 74,64.5" />
          <polygon points="50,86 62.5,95.1 57.7,110.1 42.3,110.1 37.5,95.1" />
          <polygon points="13.4,55.4 25.9,64.5 21.1,79.5 5.7,79.5 0.9,64.5" />
          <polygon points="26.5,5.6 39,14.7 34.2,29.7 18.8,29.7 14,14.7" />
        </g>
      </g>

      {/* глянец */}
      <circle cx="50" cy="50" r="46" fill="url(#ball-gloss)" />
      {/* золотое свечение по краю */}
      <circle
        cx="50"
        cy="50"
        r="45.2"
        fill="none"
        stroke="rgba(212,175,55,0.35)"
        strokeWidth="2.4"
        className="football__glow"
      />
    </svg>
  );
}
