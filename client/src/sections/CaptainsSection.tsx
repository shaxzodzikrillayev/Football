import { Crown, Shield, UserRound } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import CaptainCard from '../components/CaptainCard';
import EmptyState from '../components/EmptyState';
import Reveal from '../components/Reveal';
import { useSite } from '../services/SiteContext';

export default function CaptainsSection() {
  const { data } = useSite();

  const captain = data?.players.find((player) => player.role === 'captain') ?? null;
  const vice = data?.players.find((player) => player.role === 'vice') ?? null;

  return (
    <section className="section section--alt" id="captains">
      <div className="container">
        <Reveal>
          <SectionHeading
            eyebrow="Лидеры команды"
            title="Наши капитаны"
            subtitle="Люди, которые ведут команду на поле и задают стандарты клуба."
          />
        </Reveal>

        {captain || vice ? (
          <div className="captains__grid">
            {[captain, vice].map((player, index) =>
              player ? (
                <Reveal key={player.id} delay={index * 110}>
                  <CaptainCard
                    player={player}
                    roleLabel={player.role === 'captain' ? 'Капитан' : 'Вице-капитан'}
                  />
                </Reveal>
              ) : (
                <Reveal key={`empty-${index}`} delay={index * 110}>
                  <EmptyState
                    icon={index === 0 ? <Crown size={26} /> : <Shield size={26} />}
                    title={index === 0 ? 'Капитан не назначен' : 'Вице-капитан не назначен'}
                    description="Данные появятся после назначения капитана в панели администратора."
                  />
                </Reveal>
              ),
            )}
          </div>
        ) : (
          <EmptyState
            icon={<UserRound size={28} />}
            title="Капитаны пока не назначены"
            description="Назначьте капитана и вице-капитана в панели администратора — их карточки появятся здесь автоматически."
          />
        )}
      </div>
    </section>
  );
}
