import { getPosition } from '@shared/positions';
import type { Player } from '@shared/types';
import FlagBadge from './FlagBadge';

interface PlayerCardProps {
  player: Player;
  onSelect: (player: Player) => void;
  badge?: string;
}

/** Карточка игрока в стиле футбольных симуляторов. */
export default function PlayerCard({ player, onSelect, badge }: PlayerCardProps) {
  const position = getPosition(player.position);
  const fullName =
    player.firstName || player.lastName
      ? `${player.firstName} ${player.lastName}`.trim()
      : 'Игрок';

  return (
    <button
      type="button"
      className="player-card"
      onClick={() => onSelect(player)}
      aria-label={`Открыть карточку: ${fullName}, номер ${player.number}, позиция ${position.label}`}
    >
      <span className="player-card__frame">
        <span className="player-card__inner">
          <span className="player-card__photo">
            {player.photo ? (
              <img src={`/api/media/${player.photo}`} alt={fullName} loading="lazy" />
            ) : (
              <span className="player-card__placeholder">
                <span>{player.number}</span>
              </span>
            )}
            <span className="player-card__number">{player.number}</span>
            <span className="player-card__rating">
              {player.rating}
              <small>OVR</small>
            </span>
            {badge && <span className="player-card__badge">{badge}</span>}
          </span>

          <span className="player-card__body">
            <span className="player-card__position">{position.short}</span>
            <span className="player-card__name">{fullName}</span>
            <span className="player-card__meta">
              <FlagBadge flag={player.flag} country={player.countryName} />
              <span>{position.label}</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
