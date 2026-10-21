import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ShieldCheck, X } from 'lucide-react';
import ClubLogo from './ClubLogo';
import { useSite } from '../services/SiteContext';

const NAV_ITEMS = [
  { id: 'home', label: 'Главная' },
  { id: 'captains', label: 'Капитаны' },
  { id: 'squad', label: 'Состав' },
  { id: 'statistics', label: 'Статистика' },
  { id: 'contacts', label: 'Контакты' },
];

export default function Header() {
  const { data } = useSite();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);

      const offset = window.scrollY + 140;
      let current = 'home';
      for (const item of NAV_ITEMS) {
        const element = document.getElementById(item.id);
        if (element && element.offsetTop <= offset) current = item.id;
      }
      setActiveSection(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('is-locked', menuOpen);
    return () => document.body.classList.remove('is-locked');
  }, [menuOpen]);

  const scrollToSection = useCallback(
    (id: string) => {
      setMenuOpen(false);

      if (location.pathname !== '/') {
        navigate(`/#${id}`);
        return;
      }

      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `#${id}`);
      }
    },
    [location.pathname, navigate],
  );

  const settings = data?.settings;

  return (
    <header className={`header ${scrolled ? 'is-scrolled' : ''}`.trim()}>
      <div className="header__inner">
        <Link
          to="/"
          className="header__logo"
          onClick={(event) => {
            if (location.pathname === '/') {
              event.preventDefault();
              scrollToSection('home');
            }
          }}
          aria-label="TITAN FC — на главную"
        >
          <ClubLogo
            size={44}
            imageUrl={settings?.logo ? `/api/media/${settings.logo}` : null}
            clubName={settings?.clubName ?? 'TITAN FC'}
            tagline="Football Club"
          />
        </Link>

        <nav className={`nav ${menuOpen ? 'is-open' : ''}`.trim()} aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`/#${item.id}`}
              className={`nav__link ${activeSection === item.id && location.pathname === '/' ? 'is-active' : ''}`.trim()}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(item.id);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header__actions">
          <Link className="admin-badge" to="/admin/login">
            <ShieldCheck size={15} />
            <span>Admin</span>
          </Link>

          <button
            type="button"
            className="nav-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
