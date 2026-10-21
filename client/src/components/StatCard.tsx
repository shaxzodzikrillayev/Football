import type { ReactNode } from 'react';
import { useCountUp } from '../hooks/useCountUp';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  active?: boolean;
  suffix?: string;
}

export default function StatCard({ label, value, icon, active = true, suffix = '' }: StatCardProps) {
  const animated = useCountUp(value, active);

  return (
    <div className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__value">
        {animated}
        {suffix}
      </div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}
