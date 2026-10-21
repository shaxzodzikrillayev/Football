import { getPosition } from '@shared/positions';
import type { Player } from '@shared/types';
import FlagBadge from './FlagBadge';

interface CaptainCardProps {
  player: Player;
  roleLabel: string;
}

export default function CaptainCard({ player, roleLabel }: CaptainCardProps) {
  const position = getPosition(player.position);
  const fullName =
    player.firstName || player.lastName
      ? `${player.firstName} ${player.lastName}`.trim()
      : 'Капитан команды';

  return (
    <article className="captain-card">
      <div className="captain-card__media">
        <span className="captain-card__ribbon">{roleLabel}</span>
        {player.photo ? (
          <img src={`/api/media/${player.photo}`} alt={fullName} loading="lazy" />
        ) : (
          <span className="captain-card__placeholder">
            <span>{player.number}</span>
          </span>
        )}
        <span className="captain-card__number">{player.number}</span>
      </div>

      <div className="captain-card__body">
        <div>
          <h3 className="captain-card__name">{fullName}</h3>
          <p className="captain-card__role">{roleLabel}</p>
        </div>

        <div className="captain-card__facts">
          <div className="captain-card__fact">
            <span>Игровой номер</span>
            <strong>№ {player.number}</strong>
          </div>
          <div className="captain-card__fact">
            <span>Позиция</span>
            <strong>{position.label}</strong>
          </div>
          <div className="captain-card__fact">
            <span>Страна</span>
            <strong>
              <FlagBadge flag={player.flag} country={player.countryName} />
            </strong>
          </div>
        </div>
      </div>
    </article>
  );
}
