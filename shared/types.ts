/**
 * Общие типы клиента и сервера (TITAN FC).
 */

export type PlayerRole = 'player' | 'captain' | 'vice';

export type PositionCode =
  | 'GK'
  | 'LB'
  | 'CB'
  | 'RB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'LW'
  | 'RW'
  | 'ST';

export type FormationCode = '4-3-3' | '4-4-2' | '4-2-3-1';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface PositionMeta {
  code: PositionCode;
  label: string;
  short: string;
  group: 'Вратарь' | 'Защитник' | 'Полузащитник' | 'Нападающий';
}

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  number: number;
  position: PositionCode;
  rating: number;
  countryCode: string;
  countryName: string;
  flag: string;
  /** Ключ медиа-файла (не URL). null — используется заглушка. */
  photo: string | null;
  role: PlayerRole;
  appearances: number;
  goals: number;
  assists: number;
  sortOrder: number;
  isDemo: boolean;
}

export interface LineupEntry {
  formation: FormationCode;
  slot: string;
  playerId: number;
  x: number;
  y: number;
  role: PositionCode;
}

export interface Coach {
  id: number;
  firstName: string;
  lastName: string;
  caption: string;
  photo: string | null;
}

export interface MatchItem {
  id: number;
  opponent: string;
  opponentLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  status: MatchStatus;
  competition: string;
}

export interface ClubStats {
  playersTotal: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface SocialLinks {
  instagram: string;
  telegram: string;
  youtube: string;
  vk: string;
}

export interface SiteSettings {
  clubName: string;
  motto: string;
  subtitle: string;
  heroQuote: string;
  logo: string | null;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactNote: string;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  uniqueNumbers: boolean;
  defaultFormation: FormationCode;
  socials: SocialLinks;
}

export type ValueIcon =
  | 'star'
  | 'trophy'
  | 'flag'
  | 'dumbbell'
  | 'users'
  | 'heart'
  | 'target'
  | 'shield'
  | 'flame'
  | 'medal'
  | 'zap'
  | 'crown';

/** Ценность клуба — карточка в блоке «Ценности клуба» на главной. */
export interface ClubValue {
  id: number;
  icon: ValueIcon;
  title: string;
  text: string;
  sortOrder: number;
  isVisible: boolean;
}

export interface SitePayload {
  settings: SiteSettings;
  coach: Coach;
  players: Player[];
  lineups: Record<FormationCode, LineupEntry[]>;
  matches: MatchItem[];
  stats: ClubStats;
  values: ClubValue[];
  positions: PositionMeta[];
  formations: FormationCode[];
  generatedAt: string;
}
