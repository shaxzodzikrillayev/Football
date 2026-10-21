import { GraduationCap, UserRound } from 'lucide-react';
import type { Coach } from '@shared/types';

interface CoachCardProps {
  coach: Coach;
}

export default function CoachCard({ coach }: CoachCardProps) {
  const fullName =
    coach.firstName || coach.lastName
      ? `${coach.firstName} ${coach.lastName}`.trim()
      : 'Имя и фамилия не указаны';

  return (
    <article className="coach">
      <div className="coach__frame">
        {coach.photo ? (
          <img src={`/api/media/${coach.photo}`} alt={fullName} />
        ) : (
          <div className="coach__placeholder">
            <UserRound size={54} strokeWidth={1.2} />
            <span>Фотография наставника появится здесь</span>
          </div>
        )}
      </div>

      <div className="coach__caption">
        <div className="coach__name">
          <strong>{fullName}</strong>
          <span>{coach.caption || 'Наш наставник'}</span>
        </div>
        <div className="coach__role" aria-hidden="true">
          <GraduationCap size={24} />
        </div>
      </div>
    </article>
  );
}
