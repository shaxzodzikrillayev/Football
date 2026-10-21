import { Crown, Dumbbell, Flag, Flame, Heart, Medal, Shield, Star, Target, Trophy, Users, Zap, type LucideIcon } from 'lucide-react';
import Reveal from './Reveal';
import { useSite } from '../services/SiteContext';
import { DEFAULT_CLUB_VALUES } from '@shared/values';
import type { ValueIcon } from '@shared/types';

const ICONS: Record<ValueIcon, LucideIcon> = {
  star: Star,
  trophy: Trophy,
  flag: Flag,
  users: Users,
  dumbbell: Dumbbell,
  heart: Heart,
  target: Target,
  shield: Shield,
  flame: Flame,
  medal: Medal,
  zap: Zap,
  crown: Crown,
};

/**
 * Ценности клуба. Данные приходят из базы через админку (раздел «Ценности клуба»);
 * пока администратор ничего не добавил — показываем стартовый набор.
 */
export default function ClubValues() {
  const { data } = useSite();

  const values =
    data && data.values.length > 0
      ? data.values
      : DEFAULT_CLUB_VALUES.map((item, index) => ({
          id: -index - 1,
          icon: item.icon,
          title: item.title,
          text: item.text,
          sortOrder: index,
          isVisible: true,
        }));

  return (
    <div className="values">
      <div className="values__grid">
        {values.map((value, index) => {
          const Icon = ICONS[value.icon] ?? Star;
          return (
            <Reveal key={value.id} delay={index * 80} className="values__card">
              <span className="values__icon">
                <Icon size={22} />
              </span>
              <h3 className="values__title">{value.title}</h3>
              <p className="values__text">{value.text}</p>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
