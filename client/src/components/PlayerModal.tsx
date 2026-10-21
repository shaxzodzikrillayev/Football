import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Player } from '@shared/types';
import { getPosition } from '@shared/positions';
import FlagBadge from './FlagBadge';

interface PlayerModalProps {
  player: Player;
  onClose: () => void;
}

export default function PlayerModal({ player, onClose }: PlayerModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const position = getPosition(player.position);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('is-locked');
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('is-locked');
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Карточка игрока ${player.firstName} ${player.lastName}`}
      >
        <button ref={closeRef} type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>

        <div className="player-detail">
          <div className="player-detail__photo">
            {player.photo ? (
              <img src={`/api/media/${player.photo}`} alt={`${player.firstName} ${player.lastName}`} />
            ) : (
              <span className="player-detail__placeholder">{player.number}</span>
            )}
          </div>

          <div className="player-detail__content">
            <div className="player-detail__top">
              <div>
                <h3 className="player-detail__name">
                  {player.firstName || player.lastName ? (
                    <>
                      {player.firstName} {player.lastName}
                    </>
                  ) : (
                    'Игрок'
                  )}
                </h3>
                <div className="player-detail__meta">
                  <span className="chip chip--gold">№ {player.number}</span>
                  <span className="chip">{position.label}</span>
                  {player.role === 'captain' && <span className="chip chip--gold">Капитан</span>}
                  {player.role === 'vice' && <span className="chip chip--gold">Вице-капитан</span>}
                  {player.isDemo && <span className="chip chip--demo">Пример данных</span>}
                </div>
              </div>
              <FlagBadge flag={player.flag} country={player.countryName} />
            </div>

            <div className="player-detail__stats">
              <div className="player-detail__stat">
                <strong>{player.rating}</strong>
                <span>Рейтинг</span>
              </div>
              <div className="player-detail__stat">
                <strong>{player.appearances}</strong>
                <span>Матчей</span>
              </div>
              <div className="player-detail__stat">
                <strong>{player.goals}</strong>
                <span>Голов</span>
              </div>
              <div className="player-detail__stat">
                <strong>{player.assists}</strong>
                <span>Передач</span>
              </div>
            </div>

            <p className="field__hint">
              Позиция: {position.label}. Игровой номер: {player.number}. Рейтинг и статистику задаёт
              администратор в панели управления.
            </p>

            <button type="button" className="btn btn--outline-gold" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
