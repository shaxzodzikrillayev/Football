import { useEffect, useState } from 'react';
import { CalendarDays, Crown, Trophy, Users, Goal, Handshake, XCircle } from 'lucide-react';
import { adminApi, type AdminOverview } from '../../services/adminApi';
import { useSite } from '../../services/SiteContext';

export default function OverviewSection() {
  const { reload } = useSite();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .overview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loader">
          <span className="loader__ring" />
          <span>Загружаем сводку…</span>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="admin-panel">
        <p className="field__hint">Не удалось загрузить сводку. Обновите страницу.</p>
      </div>
    );
  }

  const { stats } = overview;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="admin-grid admin-grid--stats">
        <div className="kpi">
          <span className="kpi__value">{overview.playersCount}</span>
          <span className="kpi__label">
            <Users size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Игроков в клубе
          </span>
        </div>
        <div className="kpi">
          <span className="kpi__value">{overview.captainsCount + overview.viceCaptainsCount}</span>
          <span className="kpi__label">
            <Crown size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Капитанов
          </span>
        </div>
        <div className="kpi">
          <span className="kpi__value">{overview.startersCount}</span>
          <span className="kpi__label">В стартовом составе</span>
        </div>
        <div className="kpi">
          <span className="kpi__value">{overview.matchesCount}</span>
          <span className="kpi__label">
            <CalendarDays size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Матчей в базе
          </span>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h2 className="admin-panel__title">Краткая статистика клуба</h2>
            <p className="admin-panel__hint">
              Значения отображаются на публичном сайте в разделе «Статистика». Изменить их можно в
              разделе «Статистика».
            </p>
          </div>
        </div>

        <div className="admin-grid admin-grid--3">
          <div className="kpi">
            <span className="kpi__value">
              <Trophy size={18} style={{ verticalAlign: 2 }} /> {stats.wins}
            </span>
            <span className="kpi__label">Победы</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <Handshake size={18} style={{ verticalAlign: 2 }} /> {stats.draws}
            </span>
            <span className="kpi__label">Ничьи</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <XCircle size={18} style={{ verticalAlign: 2 }} /> {stats.losses}
            </span>
            <span className="kpi__label">Поражения</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <Goal size={18} style={{ verticalAlign: 2 }} /> {stats.goalsFor}
            </span>
            <span className="kpi__label">Забито</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">
              <Goal size={18} style={{ verticalAlign: 2 }} /> {stats.goalsAgainst}
            </span>
            <span className="kpi__label">Пропущено</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={() => void reload()}>
            Обновить публичный сайт
          </button>
        </div>
      </div>
    </div>
  );
}
