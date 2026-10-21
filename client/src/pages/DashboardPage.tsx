import { Navigate, useParams } from 'react-router-dom';
import AdminLayout, { ADMIN_SECTIONS, type AdminSectionId } from '../admin/AdminLayout';
import OverviewSection from '../admin/sections/OverviewSection';
import CoachSection from '../admin/sections/CoachSection';
import CaptainsSection from '../admin/sections/CaptainsSection';
import PlayersSection from '../admin/sections/PlayersSection';
import TacticsSection from '../admin/sections/TacticsSection';
import MatchesSection from '../admin/sections/MatchesSection';
import StatsSection from '../admin/sections/StatsSection';
import ValuesSection from '../admin/sections/ValuesSection';
import SettingsSection from '../admin/sections/SettingsSection';

const META: Record<AdminSectionId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Панель управления',
    subtitle: 'Обзор клуба: состав, капитаны, матчи и статистика',
  },
  coach: {
    title: 'Учительница',
    subtitle: 'Наставник команды: имя, подпись и фотография',
  },
  captains: {
    title: 'Капитаны',
    subtitle: 'Назначение капитана и вице-капитана, обмен ролями',
  },
  players: {
    title: 'Игроки',
    subtitle: 'Состав клуба: карточки, фотографии, роли и порядок',
  },
  tactics: {
    title: 'Тактика',
    subtitle: 'Расстановка игроков по схемам — перетаскивайте карточки',
  },
  matches: {
    title: 'Матчи',
    subtitle: 'Календарь результатов: соперники, счёт и статус',
  },
  stats: {
    title: 'Статистика',
    subtitle: 'Цифры клуба, которые видят посетители сайта',
  },
  values: {
    title: 'Ценности клуба',
    subtitle: 'Карточки на главной странице: иконка, заголовок, описание и порядок',
  },
  settings: {
    title: 'Настройки сайта',
    subtitle: 'Тексты, контакты, цвета и правила сайта',
  },
};

export default function DashboardPage() {
  const { section } = useParams<{ section?: string }>();

  const isValid =
    !section || ADMIN_SECTIONS.some((item) => item.id === section);

  if (!isValid) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const current = (section ?? 'overview') as AdminSectionId;
  const meta = META[current];

  return (
    <AdminLayout current={current} title={meta.title} subtitle={meta.subtitle}>
      {current === 'overview' && <OverviewSection />}
      {current === 'coach' && <CoachSection />}
      {current === 'captains' && <CaptainsSection />}
      {current === 'players' && <PlayersSection />}
      {current === 'tactics' && <TacticsSection />}
      {current === 'matches' && <MatchesSection />}
      {current === 'stats' && <StatsSection />}
      {current === 'values' && <ValuesSection />}
      {current === 'settings' && <SettingsSection />}
    </AdminLayout>
  );
}
