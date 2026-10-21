interface ClubLogoProps {
  size?: number;
  showText?: boolean;
  imageUrl?: string | null;
  clubName?: string;
  tagline?: string;
  className?: string;
}

/** Фирменный щит TITAN FC со стилизованным символом титана. */
export default function ClubLogo({
  size = 46,
  showText = true,
  imageUrl = null,
  clubName = 'TITAN FC',
  tagline = 'Football Club',
  className = '',
}: ClubLogoProps) {
  return (
    <span className={`logo ${className}`.trim()}>
      <span className="logo__mark" style={{ width: size, height: size * 1.09 }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={clubName}
            width={size}
            height={size * 1.09}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <svg viewBox="0 0 128 140" width={size} height={size * 1.09} role="img" aria-label={clubName}>
            <defs>
              <linearGradient id="titan-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-gold-light)" />
                <stop offset="48%" stopColor="var(--color-gold)" />
                <stop offset="100%" stopColor="var(--color-gold-dark)" />
              </linearGradient>
            </defs>
            <path
              d="M64 6 L118 25 V72 C118 102 96 122 64 136 C32 122 10 102 10 72 V25 Z"
              fill="#0f1116"
              stroke="url(#titan-gold)"
              strokeWidth="4"
            />
            <path
              d="M64 20 L108 35 V70 C108 95 90 112 64 124 C38 112 20 95 20 70 V35 Z"
              fill="none"
              stroke="rgba(212,175,55,0.25)"
              strokeWidth="1.5"
            />
            <g fill="url(#titan-gold)">
              <path d="M64 30 L72 43 H56 Z" />
              <path d="M41 60 L25 45 L33 66 Z" />
              <path d="M87 60 L103 45 L95 66 Z" />
              <path d="M64 44 C49 44 41 55 41 67 V79 C41 85 45 89 51 89 H77 C83 89 87 85 87 79 V67 C87 55 79 44 64 44 Z" />
              <path d="M56 93 H72 L64 104 Z" />
            </g>
            <rect x="48" y="63" width="12" height="5" rx="2.5" fill="#0f1116" />
            <rect x="68" y="63" width="12" height="5" rx="2.5" fill="#0f1116" />
            <path
              d="M50 76 H78"
              stroke="#0f1116"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
        )}
      </span>

      {showText && (
        <span className="logo__text">
          <strong>{clubName}</strong>
          <span>{tagline}</span>
        </span>
      )}
    </span>
  );
}
