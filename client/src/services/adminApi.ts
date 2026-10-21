import { api, uploadFile } from './api';
import type {
  ClubStats,
  ClubValue,
  Coach,
  FormationCode,
  LineupEntry,
  MatchItem,
  Player,
  PlayerRole,
  PositionCode,
  SiteSettings,
  ValueIcon,
} from '@shared/types';

export interface AdminOverview {
  playersCount: number;
  captainsCount: number;
  viceCaptainsCount: number;
  startersCount: number;
  matchesCount: number;
  stats: ClubStats;
  settings: SiteSettings;
  coach: Coach;
  generatedAt: string;
}

export interface PlayerPayload {
  firstName: string;
  lastName: string;
  number: number;
  position: PositionCode;
  rating: number;
  countryCode: string;
  countryName: string;
  flag: string;
  role: PlayerRole;
  appearances: number;
  goals: number;
  assists: number;
  photo?: string | null;
  isDemo?: boolean;
}

export interface MatchPayload {
  opponent: string;
  opponentLogo?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  date: string;
  status: 'scheduled' | 'live' | 'finished';
  competition: string;
}

export const adminApi = {
  overview: () => api.get<AdminOverview>('/api/admin/overview'),

  getSettings: () => api.get<SiteSettings>('/api/admin/settings'),
  patchSettings: (patch: Partial<SiteSettings>) =>
    api.patch<SiteSettings>('/api/admin/settings', patch),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return uploadFile<SiteSettings>('/api/admin/settings/logo', form);
  },
  deleteLogo: () => api.delete<SiteSettings>('/api/admin/settings/logo'),

  getCoach: () => api.get<Coach>('/api/admin/coach'),
  patchCoach: (patch: Partial<Omit<Coach, 'id'>>) => api.patch<Coach>('/api/admin/coach', patch),
  uploadCoachPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return uploadFile<Coach>('/api/admin/coach/photo', form);
  },
  deleteCoachPhoto: () => api.delete<Coach>('/api/admin/coach/photo'),

  listPlayers: () => api.get<Player[]>('/api/admin/players'),
  createPlayer: (payload: PlayerPayload) => api.post<Player>('/api/admin/players', payload),
  updatePlayer: (id: number, payload: Partial<PlayerPayload>) =>
    api.patch<Player>(`/api/admin/players/${id}`, payload),
  deletePlayer: (id: number) => api.delete<{ ok: boolean; id: number }>(`/api/admin/players/${id}`),
  uploadPlayerPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return uploadFile<Player>(`/api/admin/players/${id}/photo`, form);
  },
  deletePlayerPhoto: (id: number) =>
    api.delete<Player>(`/api/admin/players/${id}/photo`),
  moveToBench: (id: number) => api.post<Player>(`/api/admin/players/${id}/bench`),
  assignToStarter: (id: number) => api.post<Player>(`/api/admin/players/${id}/starter`),
  reorderPlayers: (ids: number[]) =>
    api.put<Player[]>('/api/admin/players/order', { ids }),

  listMatches: () => api.get<MatchItem[]>('/api/admin/matches'),
  createMatch: (payload: MatchPayload) => api.post<MatchItem>('/api/admin/matches', payload),
  updateMatch: (id: number, payload: Partial<MatchPayload>) =>
    api.patch<MatchItem>(`/api/admin/matches/${id}`, payload),
  deleteMatch: (id: number) =>
    api.delete<{ ok: boolean; id: number }>(`/api/admin/matches/${id}`),
  uploadMatchLogo: (id: number, file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return uploadFile<MatchItem>(`/api/admin/matches/${id}/logo`, form);
  },
  deleteMatchLogo: (id: number) =>
    api.delete<MatchItem>(`/api/admin/matches/${id}/logo`),

  getStats: () => api.get<ClubStats>('/api/admin/stats'),
  patchStats: (patch: Partial<ClubStats>) => api.patch<ClubStats>('/api/admin/stats', patch),

  listValues: () => api.get<ClubValue[]>('/api/admin/values'),
  createValue: (payload: { icon: ValueIcon; title: string; text: string; isVisible: boolean }) =>
    api.post<ClubValue>('/api/admin/values', payload),
  updateValue: (
    id: number,
    payload: Partial<{ icon: ValueIcon; title: string; text: string; isVisible: boolean }>,
  ) => api.patch<ClubValue>(`/api/admin/values/${id}`, payload),
  deleteValue: (id: number) => api.delete<{ ok: boolean; id: number }>(`/api/admin/values/${id}`),
  reorderValues: (ids: number[]) => api.put<ClubValue[]>('/api/admin/values/order', { ids }),

  getLineups: () => api.get<Record<FormationCode, LineupEntry[]>>('/api/admin/lineups'),
  setLineupSlot: (formation: FormationCode, slot: string, playerId: number | null) =>
    api.put<Record<FormationCode, LineupEntry[]>>(`/api/admin/lineups/${formation}`, {
      assignments: [{ slot, playerId }],
    }),
  swapLineupSlots: (formation: FormationCode, first: string, second: string) =>
    api.post<Record<FormationCode, LineupEntry[]>>(`/api/admin/lineups/${formation}/swap`, {
      first,
      second,
    }),
  clearLineup: (formation: FormationCode) =>
    api.post<Record<FormationCode, LineupEntry[]>>(`/api/admin/lineups/${formation}/clear`),
  autoLineup: (formation: FormationCode) =>
    api.post<Record<FormationCode, LineupEntry[]>>(`/api/admin/lineups/${formation}/auto`),
};
