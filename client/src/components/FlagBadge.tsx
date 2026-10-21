interface FlagBadgeProps {
  flag?: string;
  country?: string;
  className?: string;
}

export default function FlagBadge({ flag, country, className = '' }: FlagBadgeProps) {
  const hasFlag = Boolean(flag && flag.trim());
  const hasCountry = Boolean(country && country.trim());

  if (!hasFlag && !hasCountry) {
    return <span className={`flag ${className}`.trim()}>Страна не указана</span>;
  }

  return (
    <span className={`flag ${className}`.trim()}>
      {hasFlag && (
        <span className="flag__emoji" aria-hidden="true">
          {flag}
        </span>
      )}
      {hasCountry && <span className="flag__name">{country}</span>}
    </span>
  );
}
