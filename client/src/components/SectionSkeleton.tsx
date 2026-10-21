interface SectionSkeletonProps {
  height?: number;
}

/** Заглушка на время подгрузки ленивого чанка секции. */
export default function SectionSkeleton({ height = 380 }: SectionSkeletonProps) {
  return (
    <div className="section-skeleton" style={{ minHeight: height }} aria-hidden="true">
      <span className="section-skeleton__line section-skeleton__line--title" />
      <span className="section-skeleton__line" />
      <span className="section-skeleton__line section-skeleton__line--short" />
      <span className="section-skeleton__grid">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
