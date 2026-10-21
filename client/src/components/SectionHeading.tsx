interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  center?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = false,
}: SectionHeadingProps) {
  return (
    <div className={`section-head ${center ? 'section-head--center' : ''}`.trim()}>
      {eyebrow && <span className="section-head__eyebrow">{eyebrow}</span>}
      <h2 className="section-head__title">{title}</h2>
      {subtitle && <p className="section-head__subtitle">{subtitle}</p>}
    </div>
  );
}
