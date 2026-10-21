import type { ClubValue, ValueIcon } from './types.js';

/** Доступные иконки ценностей (ключ хранится в базе, рисуется lucide на клиенте). */
export const VALUE_ICONS: { key: ValueIcon; label: string }[] = [
  { key: 'star', label: 'Звезда' },
  { key: 'trophy', label: 'Кубок' },
  { key: 'flag', label: 'Флаг' },
  { key: 'users', label: 'Команда' },
  { key: 'dumbbell', label: 'Тренировки' },
  { key: 'heart', label: 'Сердце' },
  { key: 'target', label: 'Цель' },
  { key: 'shield', label: 'Щит' },
  { key: 'flame', label: 'Огонь' },
  { key: 'medal', label: 'Медаль' },
  { key: 'zap', label: 'Молния' },
  { key: 'crown', label: 'Корона' },
];

export const VALUE_ICON_KEYS: ValueIcon[] = VALUE_ICONS.map((item) => item.key);

export function isValueIcon(value: unknown): value is ValueIcon {
  return typeof value === 'string' && VALUE_ICON_KEYS.includes(value as ValueIcon);
}

/** Максимум карточек ценностей на сайте. */
export const MAX_CLUB_VALUES = 6;

/** Стартовые ценности — создаются один раз при первом запуске, дальше правятся в админке. */
export const DEFAULT_CLUB_VALUES: Pick<ClubValue, 'icon' | 'title' | 'text'>[] = [
  {
    icon: 'users',
    title: 'Сила в единству',
    text: 'Играем командой: каждый игрок — часть целого, и победа рождается только вместе.',
  },
  {
    icon: 'trophy',
    title: 'Только победа',
    text: 'Настрой на победу в каждом матче — от первой минуты до финального свистка.',
  },
  {
    icon: 'flag',
    title: 'Домашний стадион',
    text: 'Своя площадка, своя история, свой характер. Здесь нас знают и здесь мы — хозяева.',
  },
  {
    icon: 'dumbbell',
    title: 'Развитие игроков',
    text: 'Растём вместе с командой: тренируемся, играем и становимся сильнее с каждым матчем.',
  },
];
