import { Suspense, lazy } from 'react';
import { Activity, ArrowRight, CalendarClock, ChevronDown, Trophy, Users } from 'lucide-react';
import CoachCard from '../components/CoachCard';
import ClubValues from '../components/ClubValues';
import Football from '../components/Football';
import { useSite } from '../services/SiteContext';

// 3D-сцена весит ~800 КБ — грузим её отдельным чанком после первой отрисовки.
const FieldScene = lazy(() => import('../three/FieldScene'));

interface HeroSectionProps {
  onNavigate: (id: string) => void;
}

export default function HeroSection({ onNavigate }: HeroSectionProps) {
  const { data } = useSite();
  const settings = data?.settings;
  const coach = data?.coach;
  const stats = data?.stats;

  const captains = data?.players.filter((player) => player.role === 'captain' || player.role === 'vice')
    .length;

  return (
    <section className="hero" id="home">
      <div className="hero__aurora" aria-hidden="true" />

      <div className="hero__grid">
        <div className="hero__left">
          <div className="hero__stage">
            <Suspense
              fallback={
                <div className="hero__canvas hero__canvas--placeholder" aria-hidden="true">
                  <Football className="hero__ball" size={230} />
                </div>
              }
            >
              <FieldScene className="hero__canvas" />
            </Suspense>

            {/* Постоянный декор: мяч живёт поверх 3D-сцены */}
            <div className="hero__ball-wrap" aria-hidden="true">
              <Football className="hero__ball" size={150} />
            </div>

            <div className="hero__overlay">
              <span className="section-head__eyebrow">Официальный сайт клуба</span>
              <h1 className="hero__title">
                <span>TITAN</span>
                <span className="gold-word">FC</span>
              </h1>
              <p className="hero__subtitle">{settings?.subtitle ?? 'WE ARE TITANS'}</p>
              <p className="hero__quote">{settings?.heroQuote ?? '«Сила в единству. Победа в сердце!»'}</p>

              <div className="hero__actions">
                <button type="button" className="btn btn--gold" onClick={() => onNavigate('squad')}>
                  Смотреть состав
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => onNavigate('statistics')}
                >
                  Статистика
                </button>
              </div>

              <div className="hero__stats">
                <div className="hero__stat">
                  <strong>{stats?.playersTotal ?? 0}</strong>
                  <span>Игроков</span>
                </div>
                <div className="hero__stat">
                  <strong>{captains}</strong>
                  <span>Капитанов</span>
                </div>
                <div className="hero__stat">
                  <strong>{stats?.wins ?? 0}</strong>
                  <span>Побед</span>
                </div>
              </div>
            </div>

            <div className="hero__badges">
              <span className="chip chip--gold">
                <Trophy size={13} /> Только победа
              </span>
              <span className="chip">
                <Users size={13} /> Домашний стадион
              </span>
              <span className="chip">
                <CalendarClock size={13} /> Сезон 2025/26
              </span>
            </div>

            <div className="hero__hint">
              <Activity size={14} /> Наведите курсор — поле осматривается
            </div>
          </div>
        </div>

        <div className="hero__coach-wrap">
          <CoachCard
            coach={
              coach ?? {
                id: 1,
                firstName: '',
                lastName: '',
                caption: 'Наш наставник',
                photo: null,
              }
            }
          />

          <button
            type="button"
            className="hero__scroll"
            onClick={() => onNavigate('captains')}
            aria-label="К следующему разделу"
          >
            <span>Листайте вниз</span>
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      <ClubValues />
    </section>
  );
}
