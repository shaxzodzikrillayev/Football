import { useEffect, useRef, useState } from 'react';
import {
  Goal,
  Handshake,
  MinusCircle,
  Trophy,
  Users,
  XCircle,
  CalendarX2,
  Info,
} from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import StatCard from '../components/StatCard';
import MatchRow from '../components/MatchRow';
import EmptyState from '../components/EmptyState';
import Reveal from '../components/Reveal';
import { useSite } from '../services/SiteContext';
import { useReveal } from '../hooks/useReveal';

export default function StatsSection() {
  const { data } = useSite();
  const stats = data?.stats;
  const matches = data?.matches ?? [];
  const { ref, visible } = useReveal<HTMLDivElement>();

  const [animated, setAnimated] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || animated) return;
    timer.current = window.setTimeout(() => setAnimated(true), 180);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [visible, animated]);

  const wins = stats?.wins ?? 0;
  const draws = stats?.draws ?? 0;
  const losses = stats?.losses ?? 0;
  const total = wins + draws + losses;

  const percent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  // Форма команды — последние завершённые матчи (только реальные данные из панели).
  const form = matches
    .filter(
      (match) =>
        match.status === 'finished' && match.homeScore !== null && match.awayScore !== null,
    )
    .slice(0, 5)
    .map((match) =>
      match.homeScore! > match.awayScore!
        ? 'win'
        : match.homeScore! < match.awayScore!
          ? 'loss'
          : 'draw',
    );

  return (
    <section className="section section--alt" id="statistics">
      <div className="container">
        <Reveal>
          <SectionHeading
            eyebrow="Цифры клуба"
            title="Статистика"
            subtitle="Показатели клуба за текущий сезон. Данные обновляет администратор."
          />
        </Reveal>

        <div className="stats__grid" ref={ref}>
          <StatCard
            label="Всего игроков"
            value={stats?.playersTotal ?? 0}
            icon={<Users size={20} />}
            active={animated}
          />
          <StatCard label="Победы" value={wins} icon={<Trophy size={20} />} active={animated} />
          <StatCard label="Ничьи" value={draws} icon={<Handshake size={20} />} active={animated} />
          <StatCard label="Поражения" value={losses} icon={<XCircle size={20} />} active={animated} />
          <StatCard label="Забитые голы" value={stats?.goalsFor ?? 0} icon={<Goal size={20} />} active={animated} />
          <StatCard
            label="Пропущенные голы"
            value={stats?.goalsAgainst ?? 0}
            icon={<MinusCircle size={20} />}
            active={animated}
          />
        </div>

        <div className="stats__layout">
          <Reveal>
            <div className="stats__panel">
              <h3 className="stats__panel-title">Форма команды</h3>

              {total === 0 ? (
                <EmptyState
                  title="Статистика пока не заполнена"
                  description="После того как администратор добавит результаты матчей, здесь появится распределение побед, ничьих и поражений."
                />
              ) : (
                <div className="form-chart">
                  <div className="form-chart__row">
                    <span className="form-chart__label">Победы</span>
                    <span className="form-chart__track">
                      <span className="form-chart__fill form-chart__fill--win" style={{ width: `${percent(wins)}%` }} />
                    </span>
                    <span className="form-chart__value">{wins}</span>
                  </div>
                  <div className="form-chart__row">
                    <span className="form-chart__label">Ничьи</span>
                    <span className="form-chart__track">
                      <span className="form-chart__fill form-chart__fill--draw" style={{ width: `${percent(draws)}%` }} />
                    </span>
                    <span className="form-chart__value">{draws}</span>
                  </div>
                  <div className="form-chart__row">
                    <span className="form-chart__label">Поражения</span>
                    <span className="form-chart__track">
                      <span className="form-chart__fill form-chart__fill--loss" style={{ width: `${percent(losses)}%` }} />
                    </span>
                    <span className="form-chart__value">{losses}</span>
                  </div>
                </div>
              )}

              <div className="note" style={{ marginTop: 20 }}>
                <Info size={16} />
                <span>
                  Статистика клуба ведётся вручную в панели администратора: раздел «Статистика».
                  Значения на сайте всегда соответствуют сохранённым данным.
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="stats__panel">
              <h3 className="stats__panel-title">Последние матчи</h3>

              {form.length > 0 && (
                <div className="form-strip">
                  <span className="form-strip__label">Форма</span>
                  <div className="form-strip__items">
                    {form.map((result, index) => (
                      <span
                        key={`${result}-${index}`}
                        className={`form-chip form-chip--${result}`}
                        title={
                          result === 'win' ? 'Победа' : result === 'draw' ? 'Ничья' : 'Поражение'
                        }
                      >
                        {result === 'win' ? 'В' : result === 'draw' ? 'Н' : 'П'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {matches.length === 0 ? (
                <EmptyState
                  icon={<CalendarX2 size={26} />}
                  title="Матчи ещё не добавлены"
                  description="Список последних матчей появится, когда администратор добавит их в панели управления."
                />
              ) : (
                <div className="match-list">
                  {matches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
