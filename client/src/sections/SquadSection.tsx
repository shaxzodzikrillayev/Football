import { useEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import EmptyState from '../components/EmptyState';
import PlayerModal from '../components/PlayerModal';
import Reveal from '../components/Reveal';
import { useSite } from '../services/SiteContext';
import { getPosition } from '@shared/positions';
import { getFormation } from '@shared/formations';
import type { FormationCode, Player } from '@shared/types';

export default function SquadSection() {
  const { data } = useSite();
  const [formation, setFormation] = useState<FormationCode>(
    data?.settings.defaultFormation ?? '4-3-3',
  );
  const pickedFormation = useRef(false);

  // Данные сайта загружаются асинхронно: если пользователь ещё не выбрал схему
  // вручную, применяем схему по умолчанию из настроек, когда она пришла.
  useEffect(() => {
    if (pickedFormation.current) return;
    const preferred = data?.settings.defaultFormation;
    if (preferred) setFormation(preferred);
  }, [data?.settings.defaultFormation]);
  const [selected, setSelected] = useState<Player | null>(null);

  const players = data?.players ?? [];
  const formationMeta = getFormation(formation);
  const lineup = data?.lineups?.[formation] ?? [];

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const starters = useMemo(
    () =>
      formationMeta.slots.map((slot) => {
        const entry = lineup.find((item) => item.slot === slot.key);
        const player = entry ? playerById.get(entry.playerId) : undefined;
        return { slot, player };
      }),
    [formationMeta, lineup, playerById],
  );

  const bench = useMemo(() => {
    const used = new Set(lineup.map((entry) => entry.playerId));
    return players.filter((player) => !used.has(player.id));
  }, [players, lineup]);

  const formations = data?.formations ?? (['4-3-3', '4-4-2', '4-2-3-1'] as FormationCode[]);

  return (
    <section className="section" id="squad">
      <div className="container">
        <Reveal>
          <SectionHeading
            eyebrow="Ротация"
            title="Состав команды"
            subtitle="Наши игроки. Наша сила. Наша победа."
            center
          />
        </Reveal>

        <div className="squad__controls">
          <div className="formation-tabs" role="tablist" aria-label="Игровые схемы">
            {formations.map((code) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={formation === code}
                className={`formation-tabs__item ${formation === code ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  pickedFormation.current = true;
                  setFormation(code);
                }}
              >
                {code}
              </button>
            ))}
          </div>
          <span className="chip">
            <Users size={13} /> В стартовом составе: {lineup.length}
          </span>
        </div>

        {players.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="Состав пока не добавлен"
            description="Добавьте игроков в панели администратора — они появятся на схеме автоматически."
          />
        ) : (
          <Reveal>
            <div className="pitch">
              <span className="pitch__label">Схема {formation}</span>
              <div className="pitch__half" />
              <div className="pitch__circle" />
              <div className="pitch__spot" />
              <div className="pitch__box pitch__box--top" />
              <div className="pitch__box pitch__box--bottom" />
              <div className="pitch__six pitch__six--top" />
              <div className="pitch__six pitch__six--bottom" />

              {starters.map(({ slot, player }) =>
                player ? (
                  <button
                    key={slot.key}
                    type="button"
                    className="pitch-player"
                    style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                    onClick={() => setSelected(player)}
                    aria-label={`${slot.label}: ${player.firstName} ${player.lastName}`}
                  >
                    <span className="pitch-player__card">
                      <span className="pitch-player__inner">
                        <span className="pitch-player__photo">
                          {player.photo ? (
                            <img src={`/api/media/${player.photo}`} alt="" loading="lazy" />
                          ) : (
                            <span className="pitch-player__placeholder">{player.number}</span>
                          )}
                          <span className="pitch-player__number">{player.number}</span>
                          <span className="pitch-player__rating">{player.rating}</span>
                          {player.flag && <span className="pitch-player__flag">{player.flag}</span>}
                        </span>
                        <span className="pitch-player__info">
                          <span className="pitch-player__name">
                            {player.lastName || player.firstName || 'Игрок'}
                          </span>
                          <span className="pitch-player__position">
                            {getPosition(player.position).short}
                          </span>
                        </span>
                        {player.role !== 'player' && (
                          <span className="pitch-player__badge">
                            {player.role === 'captain' ? 'C' : 'VC'}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ) : (
                  <div
                    key={slot.key}
                    className="pitch-empty"
                    style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                    aria-hidden="true"
                  >
                    {slot.label}
                  </div>
                ),
              )}
            </div>
          </Reveal>
        )}

        <div className="bench">
          <h3 className="bench__title">Запасные игроки</h3>

          {bench.length === 0 ? (
            <EmptyState
              title="Все игроки в стартовом составе"
              description="Как только администратор отправит игрока в запас, он появится здесь."
            />
          ) : (
            <div className="bench__grid">
              {bench.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="bench-card"
                  onClick={() => setSelected(player)}
                >
                  <span className="bench-card__photo">
                    {player.photo ? (
                      <img src={`/api/media/${player.photo}`} alt="" loading="lazy" />
                    ) : (
                      player.number
                    )}
                  </span>
                  <span className="bench-card__info">
                    <span className="bench-card__name">
                      {player.lastName || player.firstName || 'Игрок'}
                    </span>
                    <span className="bench-card__meta">
                      <span>№ {player.number}</span>
                      <span>·</span>
                      <span>{getPosition(player.position).short}</span>
                      <span>·</span>
                      <span>{player.rating}</span>
                      {player.flag && <span>{player.flag}</span>}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <PlayerModal player={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
