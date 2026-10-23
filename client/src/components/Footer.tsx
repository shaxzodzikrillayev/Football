import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Instagram, Send, Youtube, Music2 } from 'lucide-react';
import ClubLogo from './ClubLogo';
import { useSite } from '../services/SiteContext';
import { scrollToSection } from '../utils/scrollToSection';

const QUICK_LINKS = [
  { id: 'home', label: 'Главная' },
  { id: 'captains', label: 'Капитаны' },
  { id: 'squad', label: 'Состав команды' },
  { id: 'statistics', label: 'Статистика' },
  { id: 'contacts', label: 'Контакты' },
];

export default function Footer() {
  const { data } = useSite();
  const settings = data?.settings;
  const year = new Date().getFullYear();
  const socials = settings?.socials;
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShowTop(window.scrollY > 600);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const socialItems = [
    { key: 'instagram' as const, label: 'Instagram', url: socials?.instagram, icon: <Instagram size={16} /> },
    { key: 'telegram' as const, label: 'Telegram', url: socials?.telegram, icon: <Send size={16} /> },
    { key: 'youtube' as const, label: 'YouTube', url: socials?.youtube, icon: <Youtube size={16} /> },
    { key: 'vk' as const, label: 'VK', url: socials?.vk, icon: <Music2 size={16} /> },
  ].filter((item) => Boolean(item.url));

  const goTo = (id: string) => {
    scrollToSection(id);
  };

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <ClubLogo
            size={52}
            imageUrl={settings?.logo ? `/api/media/${settings.logo}` : null}
            clubName={settings?.clubName ?? 'TITAN FC'}
            tagline="Football Club"
          />
          <p className="footer__motto gold-word">{settings?.motto ?? 'Сила в единстве. Победа в сердце!'}</p>
          <p className="footer__tagline">{settings?.footerText ?? 'Официальный сайт команды TITAN FC'}</p>
        </div>

        <div>
          <h3 className="footer__title">Быстрые ссылки</h3>
          <ul className="footer__links">
            {QUICK_LINKS.map((link) => (
              <li key={link.id}>
                <button
                  type="button"
                  className="footer__link"
                  onClick={() => {
                    if (window.location.pathname !== '/') {
                      window.location.href = `/#${link.id}`;
                      return;
                    }
                    goTo(link.id);
                  }}
                >
                  {link.label}
                </button>
              </li>
            ))}
            <li>
              <Link className="footer__link" to="/admin/login">
                Панель администратора
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="footer__title">Контакты</h3>
          <ul className="footer__links">
            {settings?.contactEmail && (
              <li>
                <a className="footer__link" href={`mailto:${settings.contactEmail}`}>
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings?.contactPhone && (
              <li>
                <a className="footer__link" href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}>
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {settings?.contactAddress && <li className="footer__link">{settings.contactAddress}</li>}
            {!settings?.contactEmail && !settings?.contactPhone && !settings?.contactAddress && (
              <li className="footer__link">Контактные данные задаёт администратор</li>
            )}
          </ul>

          {socialItems.length > 0 && (
            <div className="footer__socials" style={{ marginTop: 18 }}>
              {socialItems.map((item) => (
                <a
                  key={item.key}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={item.label}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <span>© {year} {settings?.clubName ?? 'TITAN FC'}. Все права защищены.</span>
          <span>{settings?.footerText ?? 'Официальный сайт команды TITAN FC'}</span>
        </div>
      </div>

      <button
        type="button"
        className={`to-top ${showTop ? 'is-visible' : ''}`.trim()}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Наверх"
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp size={18} />
      </button>
    </footer>
  );
}
