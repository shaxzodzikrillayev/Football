import { Instagram, Mail, MapPin, Phone, Send, Youtube, Music2 } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import EmptyState from '../components/EmptyState';
import Reveal from '../components/Reveal';
import { useSite } from '../services/SiteContext';

export default function ContactsSection() {
  const { data } = useSite();
  const settings = data?.settings;
  const socials = settings?.socials;

  const socialItems = [
    { key: 'instagram' as const, label: 'Instagram', url: socials?.instagram, icon: <Instagram size={18} /> },
    { key: 'telegram' as const, label: 'Telegram', url: socials?.telegram, icon: <Send size={18} /> },
    { key: 'youtube' as const, label: 'YouTube', url: socials?.youtube, icon: <Youtube size={18} /> },
    { key: 'vk' as const, label: 'VK', url: socials?.vk, icon: <Music2 size={18} /> },
  ].filter((item) => Boolean(item.url));

  const hasContacts = Boolean(
    settings?.contactEmail || settings?.contactPhone || settings?.contactAddress,
  );

  return (
    <section className="section" id="contacts">
      <div className="container">
        <Reveal>
          <SectionHeading
            eyebrow="Связь"
            title="Контакты"
            subtitle="Напишите нам — мы на связи по всем вопросам клуба, заявкам и сотрудничеству."
          />
        </Reveal>

        {hasContacts ? (
          <div className="contacts__grid">
            {settings?.contactEmail && (
              <Reveal className="contacts__card">
                <div className="contacts__icon">
                  <Mail size={20} />
                </div>
                <span className="contacts__label">E-mail</span>
                <span className="contacts__value">
                  <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
                </span>
              </Reveal>
            )}

            {settings?.contactPhone && (
              <Reveal className="contacts__card" delay={70}>
                <div className="contacts__icon">
                  <Phone size={20} />
                </div>
                <span className="contacts__label">Телефон</span>
                <span className="contacts__value">
                  <a href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}>
                    {settings.contactPhone}
                  </a>
                </span>
              </Reveal>
            )}

            {settings?.contactAddress && (
              <Reveal className="contacts__card" delay={140}>
                <div className="contacts__icon">
                  <MapPin size={20} />
                </div>
                <span className="contacts__label">Адрес</span>
                <span className="contacts__value">{settings.contactAddress}</span>
              </Reveal>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Mail size={28} />}
            title="Контактные данные пока не указаны"
            description="Администратор добавит email, телефон и адрес в разделе «Настройки сайта» — они появятся здесь сразу после сохранения."
          />
        )}

        {settings?.contactNote && (
          <Reveal>
            <div className="note contacts__note">
              <Mail size={16} />
              <span>{settings.contactNote}</span>
            </div>
          </Reveal>
        )}

        {socialItems.length > 0 && (
          <Reveal>
            <div className="contacts__socials">
              {socialItems.map((item) => (
                <a
                  key={item.key}
                  className="contacts__social"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </div>
          </Reveal>
        )}

        {settings?.contactEmail && (
          <Reveal>
            <div className="contacts__cta">
              <div className="contacts__cta-text">
                <span className="section-head__eyebrow">Набор в команду</span>
                <h3 className="contacts__cta-title">Хотите играть за TITAN FC?</h3>
                <p className="contacts__cta-subtitle">
                  Напишите нам — расскажем о тренировках, требованиях и свободных местах в
                  составе.
                </p>
              </div>
              <a className="btn btn--gold" href={`mailto:${settings.contactEmail}`}>
                <Mail size={16} /> Написать нам
              </a>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
