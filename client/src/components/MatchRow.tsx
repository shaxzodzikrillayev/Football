import { CalendarDays } from 'lucide-react';
import type { MatchItem } from '@shared/types';

interface MatchRowProps {
  match: MatchItem;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Запланирован',
  live: 'Идёт матч',
  finished: 'Завершён',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function MatchRow({ match }: MatchRowProps) {
  const played = match.status === 'finished' && match.homeScore !== null && match.awayScore !== null;
  const result = played ? (match.homeScore! > match.awayScore! ? 'win' : match.homeScore! < match.awayScore! ? 'loss' : 'draw') : null;
  const initials = match.opponent
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return (
    <article className="match-row">
      <div className="match-row__crest" aria-hidden="true">
        {match.opponentLogo ? (
          <img src={`/api/media/${match.opponentLogo}`} alt="" loading="lazy" />
        ) : (
          initials
        )}
      </div>

      <div className="match-row__info">
        <span className="match-row__opponent">{match.opponent}</span>
        <span className="match-row__competition">
          {match.competition ? `${match.competition} · ` : ''}
          <CalendarDays size={12} style={{ verticalAlign: '-2px' }} /> {formatDate(match.date)}
        </span>
      </div>

      <div className={`match-row__score ${played ? '' : 'match-row__score--pending'}`}>
        {played ? `${match.homeScore} : ${match.awayScore}` : '— : —'}
      </div>

      <div className={`match-row__status ${result ? `match-row__status--${result}` : ''}`}>
        {result === 'win' ? 'Победа' : result === 'draw' ? 'Ничья' : result === 'loss' ? 'Поражение' : STATUS_LABELS[match.status]}
      </div>
    </article>
  );
}
