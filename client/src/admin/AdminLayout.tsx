import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Crown,
  ExternalLink,
  Gem,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Swords,
  Users,
  X,
} from 'lucide-react';
import ClubLogo from '../components/ClubLogo';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { useSite } from '../services/SiteContext';

export const ADMIN_SECTIONS = [
  { id: 'overview', label: 'Главная', icon: LayoutDashboard },
  { id: 'coach', label: 'Учительница', icon: GraduationCap },
  { id: 'captains', label: 'Капитаны', icon: Crown },
  { id: 'players', label: 'Игроки', icon: Users },
  { id: 'tactics', label: 'Тактика', icon: Swords },
  { id: 'matches', label: 'Матчи', icon: CalendarDays },
  { id: 'stats', label: 'Статистика', icon: BarChart3 },
  { id: 'values', label: 'Ценности клуба', icon: Gem },
  { id: 'settings', label: 'Настройки сайта', icon: Settings },
] as const;

export type AdminSectionId = (typeof ADMIN_SECTIONS)[number]['id'];

interface AdminLayoutProps {
  current: AdminSectionId;
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function AdminLayout({
  current,
  title,
  subtitle,
  children,
  actions,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data, reload } = useSite();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentLabel =
    ADMIN_SECTIONS.find((section) => section.id === current)?.label ?? 'Раздел';

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.post('/api/auth/logout');
      notify('Вы вышли из панели', 'info');
      navigate('/admin/login', { replace: true });
    } catch {
      notify('Не удалось завершить сессию', 'error');
      setLoggingOut(false);
    }
  };

  return (
    <div className="admin">
      <aside className={`admin__sidebar ${sidebarOpen ? 'is-open' : ''}`.trim()}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to="/" onClick={() => setSidebarOpen(false)}>
            <ClubLogo size={44} clubName={data?.settings.clubName ?? 'TITAN FC'} />
          </Link>
        </div>

        <nav className="admin__nav" aria-label="Разделы админ-панели">
          {ADMIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const to =
              section.id === 'overview'
                ? '/admin/dashboard'
                : `/admin/dashboard/${section.id}`;
            return (
              <NavLink
                key={section.id}
                to={to}
                end={section.id === 'overview'}
                className={({ isActive }) =>
                  `admin__nav-item ${isActive ? 'is-active' : ''}`.trim()
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={17} />
                {section.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin__footer">
          <Link className="btn btn--ghost btn--sm" to="/" target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Открыть сайт
          </Link>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={logout}
            disabled={loggingOut}
          >
            <LogOut size={14} /> {loggingOut ? 'Выходим…' : 'Выйти'}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="admin__overlay"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <main className="admin__main">
        <div className="admin__topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="icon-btn admin__menu-btn"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Меню панели"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="admin__title">{title}</h1>
              <p className="admin__subtitle">{subtitle}</p>
            </div>
            <span className="chip chip--gold admin__section-chip">{currentLabel}</span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {actions}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void reload()}
            >
              Обновить данные
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
