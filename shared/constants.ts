import type { ClubStats, SiteSettings } from './types.js';

export const DEFAULT_SETTINGS: SiteSettings = {
  clubName: 'TITAN FC',
  motto: 'Сила в единству. Победа в сердце!',
  subtitle: 'WE ARE TITANS',
  heroQuote: '«Сила в единству. Победа в сердце!»',
  logo: null,
  footerText: 'Официальный сайт команды TITAN FC',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  contactNote: '',
  primaryColor: '#D4AF37',
  backgroundColor: '#08090B',
  surfaceColor: '#111318',
  textColor: '#FFFFFF',
  mutedColor: '#858995',
  uniqueNumbers: true,
  defaultFormation: '4-3-3',
  socials: { instagram: '', telegram: '', youtube: '', vk: '' },
};

export const DEFAULT_STATS: ClubStats = {
  playersTotal: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
};

export const SESSION_COOKIE = 'titan_session';
export const CSRF_COOKIE = 'titan_csrf';
export const CSRF_HEADER = 'x-csrf-token';
