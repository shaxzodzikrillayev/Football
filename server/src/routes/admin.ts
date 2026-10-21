import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { formationSlots, isFormationCode } from '../../../shared/formations.js';
import { isPositionCode } from '../../../shared/positions.js';
import { isValueIcon, MAX_CLUB_VALUES } from '../../../shared/values.js';
import type {
  ClubStats,
  FormationCode,
  MatchStatus,
  PlayerRole,
  SiteSettings,
} from '../../../shared/types.js';
import { requireCsrf } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async.js';
import { badRequest, notFound } from '../middleware/errors.js';
import { upload, validateImage } from '../middleware/upload.js';
import { getStorage } from '../services/storage.js';
import * as repo from '../services/repository.js';

export const adminRouter = Router();

/** Все изменяющие запросы внутри админ-раздела требуют валидный CSRF-токен. */
adminRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    requireCsrf(req, res, next);
    return;
  }
  next();
});

/* ------------------------------- Утилиты ------------------------------- */

function str(value: unknown, fallback = '', maxLength = 120): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function optionalStr(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length ? trimmed : null;
}

function int(value: unknown, fallback: number, min = -9999, max = 9999): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

function requireBody(req: Request): Record<string, unknown> {
  const body = req.body as unknown;
  if (!body || typeof body !== 'object') return {};
  return body as Record<string, unknown>;
}

function parseRole(value: unknown, fallback: PlayerRole = 'player'): PlayerRole {
  if (value === 'captain' || value === 'vice' || value === 'player') return value;
  return fallback;
}

function parseStatus(value: unknown, fallback: MatchStatus = 'scheduled'): MatchStatus {
  if (value === 'scheduled' || value === 'live' || value === 'finished') return value;
  return fallback;
}

/** Гарантирует, что капитан (или вице-капитан) в клубе только один. */
function applyExclusiveRole(playerId: number, role: PlayerRole): void {
  if (role !== 'captain' && role !== 'vice') return;
  const others = repo.listPlayers().filter((p) => p.role === role && p.id !== playerId);
  for (const other of others) {
    repo.updatePlayer(other.id, { role: 'player' });
  }
}

async function saveImage(file: Express.Multer.File | undefined, folder: string): Promise<string> {
  const validated = validateImage(file);
  const storage = getStorage();
  const stored = await storage.save(validated.buffer, validated.ext, folder);
  return stored.key;
}

async function removeStored(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await getStorage().remove(key);
  } catch {
    /* удаление не критично */
  }
}

/* -------------------------------- Обзор -------------------------------- */

adminRouter.get('/overview', (_req: Request, res: Response) => {
  const players = repo.listPlayers();
  const matches = repo.listMatches();
  const stats = repo.getStats();
  res.json({
    playersCount: players.length,
    captainsCount: players.filter((p) => p.role === 'captain').length,
    viceCaptainsCount: players.filter((p) => p.role === 'vice').length,
    startersCount: repo.getLineups()[repo.getSettings().defaultFormation].length,
    matchesCount: matches.length,
    stats,
    settings: repo.getSettings(),
    coach: repo.getCoach(),
    generatedAt: new Date().toISOString(),
  });
});

/* ------------------------------ Настройки ------------------------------ */

adminRouter.get('/settings', (_req: Request, res: Response) => {
  res.json(repo.getSettings());
});

adminRouter.patch('/settings', (req: Request, res: Response) => {
  const body = requireBody(req);
  const current = repo.getSettings();
  const patch: Partial<SiteSettings> = {};

  if ('clubName' in body) patch.clubName = str(body.clubName, current.clubName, 60) || 'TITAN FC';
  if ('motto' in body) patch.motto = str(body.motto, current.motto, 180);
  if ('subtitle' in body) patch.subtitle = str(body.subtitle, current.subtitle, 60);
  if ('heroQuote' in body) patch.heroQuote = str(body.heroQuote, current.heroQuote, 180);
  if ('footerText' in body) patch.footerText = str(body.footerText, current.footerText, 180);
  if ('contactEmail' in body) patch.contactEmail = str(body.contactEmail, '', 120);
  if ('contactPhone' in body) patch.contactPhone = str(body.contactPhone, '', 60);
  if ('contactAddress' in body) patch.contactAddress = str(body.contactAddress, '', 180);
  if ('contactNote' in body) patch.contactNote = str(body.contactNote, '', 300);
  if ('primaryColor' in body) patch.primaryColor = str(body.primaryColor, current.primaryColor, 32);
  if ('backgroundColor' in body)
    patch.backgroundColor = str(body.backgroundColor, current.backgroundColor, 32);
  if ('surfaceColor' in body) patch.surfaceColor = str(body.surfaceColor, current.surfaceColor, 32);
  if ('textColor' in body) patch.textColor = str(body.textColor, current.textColor, 32);
  if ('mutedColor' in body) patch.mutedColor = str(body.mutedColor, current.mutedColor, 32);
  if ('uniqueNumbers' in body) patch.uniqueNumbers = bool(body.uniqueNumbers, current.uniqueNumbers);
  if ('defaultFormation' in body && isFormationCode(body.defaultFormation)) {
    patch.defaultFormation = body.defaultFormation;
  }
  if ('logo' in body) patch.logo = optionalStr(body.logo, 200);
  if ('socials' in body && body.socials && typeof body.socials === 'object') {
    const socials = body.socials as Record<string, unknown>;
    patch.socials = {
      instagram: str(socials.instagram, current.socials.instagram, 200),
      telegram: str(socials.telegram, current.socials.telegram, 200),
      youtube: str(socials.youtube, current.socials.youtube, 200),
      vk: str(socials.vk, current.socials.vk, 200),
    };
  }

  res.json(repo.updateSettings(patch));
});

adminRouter.post('/settings/logo', upload.single('logo'), asyncHandler(async (req: Request, res: Response) => {
  const key = await saveImage(req.file, 'logos');
  const current = repo.getSettings();
  const previous = current.logo;
  const settings = repo.updateSettings({ logo: key });
  if (previous && previous !== key) await removeStored(previous);
  res.json(settings);
}));

adminRouter.delete('/settings/logo', asyncHandler(async (_req: Request, res: Response) => {
  const current = repo.getSettings();
  const settings = repo.updateSettings({ logo: null });
  if (current.logo) await removeStored(current.logo);
  res.json(settings);
}));

/* ------------------------------- Тренер -------------------------------- */

adminRouter.get('/coach', (_req: Request, res: Response) => {
  res.json(repo.getCoach());
});

adminRouter.patch('/coach', (req: Request, res: Response) => {
  const body = requireBody(req);
  const current = repo.getCoach();
  res.json(
    repo.updateCoach({
      firstName: 'firstName' in body ? str(body.firstName, current.firstName, 60) : undefined,
      lastName: 'lastName' in body ? str(body.lastName, current.lastName, 60) : undefined,
      caption: 'caption' in body ? str(body.caption, current.caption, 80) : undefined,
    }),
  );
});

adminRouter.post('/coach/photo', upload.single('photo'), asyncHandler(async (req: Request, res: Response) => {
  const key = await saveImage(req.file, 'coach');
  const previous = repo.getCoach().photo;
  const coach = repo.updateCoach({ photo: key });
  if (previous && previous !== key) await removeStored(previous);
  res.json(coach);
}));

adminRouter.delete('/coach/photo', asyncHandler(async (_req: Request, res: Response) => {
  const previous = repo.getCoach().photo;
  const coach = repo.updateCoach({ photo: null });
  if (previous) await removeStored(previous);
  res.json(coach);
}));

/* ------------------------------- Игроки ------------------------------- */

adminRouter.get('/players', (_req: Request, res: Response) => {
  res.json(repo.listPlayers());
});

adminRouter.post('/players', (req: Request, res: Response) => {
  const body = requireBody(req);
  const settings = repo.getSettings();
  const number = int(body.number, 0, 0, 99);

  if (settings.uniqueNumbers && repo.findPlayerByNumber(number)) {
    throw badRequest(`Игровой номер ${number} уже занят другим игроком`);
  }

  const position = isPositionCode(body.position) ? body.position : 'CM';
  const player = repo.createPlayer({
    firstName: str(body.firstName, '', 60),
    lastName: str(body.lastName, '', 60),
    number,
    position,
    rating: int(body.rating, 75, 1, 99),
    countryCode: str(body.countryCode, '', 8),
    countryName: str(body.countryName, '', 80),
    flag: str(body.flag, '', 12),
    role: parseRole(body.role, 'player'),
    appearances: int(body.appearances, 0, 0, 999),
    goals: int(body.goals, 0, 0, 999),
    assists: int(body.assists, 0, 0, 999),
    photo: optionalStr(body.photo, 200),
    isDemo: false,
  });

  applyExclusiveRole(player.id, player.role);
  res.status(201).json(repo.getPlayer(player.id));
});

adminRouter.patch('/players/:id', (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const player = repo.getPlayer(id);
  if (!player) throw notFound('Игрок не найден');

  const body = requireBody(req);
  const settings = repo.getSettings();
  const number = 'number' in body ? int(body.number, player.number, 0, 99) : player.number;

  if (settings.uniqueNumbers && number !== player.number && repo.findPlayerByNumber(number, id)) {
    throw badRequest(`Игровой номер ${number} уже занят другим игроком`);
  }

  const patch: Parameters<typeof repo.updatePlayer>[1] = {};
  if ('firstName' in body) patch.firstName = str(body.firstName, player.firstName, 60);
  if ('lastName' in body) patch.lastName = str(body.lastName, player.lastName, 60);
  if ('number' in body) patch.number = number;
  if ('position' in body && isPositionCode(body.position)) patch.position = body.position;
  if ('rating' in body) patch.rating = int(body.rating, player.rating, 1, 99);
  if ('countryCode' in body) patch.countryCode = str(body.countryCode, player.countryCode, 8);
  if ('countryName' in body) patch.countryName = str(body.countryName, player.countryName, 80);
  if ('flag' in body) patch.flag = str(body.flag, player.flag, 12);
  if ('role' in body) patch.role = parseRole(body.role, player.role);
  if ('appearances' in body) patch.appearances = int(body.appearances, player.appearances, 0, 999);
  if ('goals' in body) patch.goals = int(body.goals, player.goals, 0, 999);
  if ('assists' in body) patch.assists = int(body.assists, player.assists, 0, 999);
  if ('photo' in body) patch.photo = optionalStr(body.photo, 200);
  if ('isDemo' in body) patch.isDemo = bool(body.isDemo, player.isDemo);

  const updated = repo.updatePlayer(id, patch)!;
  if (patch.role && patch.role !== player.role) applyExclusiveRole(id, patch.role);
  res.json(updated);
});

adminRouter.delete('/players/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const player = repo.getPlayer(id);
  if (!player) throw notFound('Игрок не найден');
  repo.deletePlayer(id);
  await removeStored(player.photo);
  res.json({ ok: true, id });
}));

adminRouter.post('/players/:id/photo', upload.single('photo'), asyncHandler(async (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const player = repo.getPlayer(id);
  if (!player) throw notFound('Игрок не найден');
  const key = await saveImage(req.file, 'players');
  const updated = repo.updatePlayer(id, { photo: key })!;
  if (player.photo && player.photo !== key) await removeStored(player.photo);
  res.json(updated);
}));

adminRouter.delete('/players/:id/photo', asyncHandler(async (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const player = repo.getPlayer(id);
  if (!player) throw notFound('Игрок не найден');
  const updated = repo.updatePlayer(id, { photo: null })!;
  await removeStored(player.photo);
  res.json(updated);
}));

adminRouter.post('/players/:id/bench', (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const player = repo.getPlayer(id);
  if (!player) throw notFound('Игрок не найден');
  repo.movePlayerToBench(id);
  res.json(repo.getPlayer(id));
});

adminRouter.post('/players/:id/starter', (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const player = repo.getPlayer(id);
  if (!player) throw notFound('Игрок не найден');
  const formation = repo.getSettings().defaultFormation;
  const assigned = repo.autoAssignPlayer(id, formation);
  if (!assigned) throw badRequest('В выбранной схеме нет свободных позиций');
  res.json(repo.getPlayer(id));
});

adminRouter.put('/players/order', (req: Request, res: Response) => {
  const body = requireBody(req);
  const ids = Array.isArray(body.ids) ? body.ids.map((v) => int(v, 0, 1)) : [];
  if (!ids.length) throw badRequest('Не передан порядок игроков');
  repo.reorderPlayers(ids);
  res.json(repo.listPlayers());
});

/* ------------------------------- Матчи ------------------------------- */

adminRouter.get('/matches', (_req: Request, res: Response) => {
  res.json(repo.listMatches());
});

adminRouter.post('/matches', (req: Request, res: Response) => {
  const body = requireBody(req);
  const opponent = str(body.opponent, '', 80);
  if (!opponent) throw badRequest('Укажите название соперника');
  const match = repo.createMatch({
    opponent,
    opponentLogo: optionalStr(body.opponentLogo, 200),
    homeScore: body.homeScore === null || body.homeScore === undefined ? null : int(body.homeScore, 0, 0, 99),
    awayScore: body.awayScore === null || body.awayScore === undefined ? null : int(body.awayScore, 0, 0, 99),
    date: str(body.date, new Date().toISOString(), 40),
    status: parseStatus(body.status, 'scheduled'),
    competition: str(body.competition, '', 80),
  });
  res.status(201).json(match);
});

adminRouter.patch('/matches/:id', (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const existing = repo.listMatches().find((m) => m.id === id);
  if (!existing) throw notFound('Матч не найден');
  const body = requireBody(req);
  const patch: Parameters<typeof repo.updateMatch>[1] = {};
  if ('opponent' in body) patch.opponent = str(body.opponent, existing.opponent, 80);
  if ('opponentLogo' in body) patch.opponentLogo = optionalStr(body.opponentLogo, 200);
  if ('homeScore' in body)
    patch.homeScore = body.homeScore === null || body.homeScore === undefined ? null : int(body.homeScore, 0, 0, 99);
  if ('awayScore' in body)
    patch.awayScore = body.awayScore === null || body.awayScore === undefined ? null : int(body.awayScore, 0, 0, 99);
  if ('date' in body) patch.date = str(body.date, existing.date, 40);
  if ('status' in body) patch.status = parseStatus(body.status, existing.status);
  if ('competition' in body) patch.competition = str(body.competition, existing.competition, 80);
  res.json(repo.updateMatch(id, patch));
});

adminRouter.delete('/matches/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const existing = repo.listMatches().find((m) => m.id === id);
  if (!existing) throw notFound('Матч не найден');
  repo.deleteMatch(id);
  await removeStored(existing.opponentLogo);
  res.json({ ok: true, id });
}));

adminRouter.post('/matches/:id/logo', upload.single('logo'), asyncHandler(async (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const existing = repo.listMatches().find((m) => m.id === id);
  if (!existing) throw notFound('Матч не найден');
  const key = await saveImage(req.file, 'matches');
  const match = repo.updateMatch(id, { opponentLogo: key })!;
  if (existing.opponentLogo && existing.opponentLogo !== key) await removeStored(existing.opponentLogo);
  res.json(match);
}));

adminRouter.delete('/matches/:id/logo', asyncHandler(async (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const existing = repo.listMatches().find((m) => m.id === id);
  if (!existing) throw notFound('Матч не найден');
  const match = repo.updateMatch(id, { opponentLogo: null })!;
  await removeStored(existing.opponentLogo);
  res.json(match);
}));

/* ------------------------------ Статистика ------------------------------ */

adminRouter.get('/stats', (_req: Request, res: Response) => {
  res.json(repo.getStats());
});

adminRouter.patch('/stats', (req: Request, res: Response) => {
  const body = requireBody(req);
  const patch: Partial<ClubStats> = {};
  if ('wins' in body) patch.wins = int(body.wins, 0, 0, 9999);
  if ('draws' in body) patch.draws = int(body.draws, 0, 0, 9999);
  if ('losses' in body) patch.losses = int(body.losses, 0, 0, 9999);
  if ('goalsFor' in body) patch.goalsFor = int(body.goalsFor, 0, 0, 9999);
  if ('goalsAgainst' in body) patch.goalsAgainst = int(body.goalsAgainst, 0, 0, 9999);
  res.json(repo.updateStats(patch));
});

/* ------------------------------ Ценности клуба ------------------------------ */

adminRouter.get('/values', (_req: Request, res: Response) => {
  res.json(repo.listClubValues());
});

adminRouter.post('/values', (req: Request, res: Response) => {
  const body = requireBody(req);
  if (repo.listClubValues().length >= MAX_CLUB_VALUES) {
    throw badRequest(`Максимум ${MAX_CLUB_VALUES} карточек ценностей`);
  }
  const title = str(body.title, '', 60);
  if (!title) throw badRequest('Укажите заголовок ценности');
  const value = repo.createClubValue({
    icon: isValueIcon(body.icon) ? body.icon : 'star',
    title,
    text: str(body.text, '', 220),
    isVisible: bool(body.isVisible, true),
  });
  res.status(201).json(value);
});

adminRouter.patch('/values/:id', (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  const existing = repo.getClubValue(id);
  if (!existing) throw notFound('Ценность не найдена');

  const body = requireBody(req);
  const patch: Parameters<typeof repo.updateClubValue>[1] = {};
  if ('title' in body) {
    const title = str(body.title, existing.title, 60);
    if (!title) throw badRequest('Заголовок не может быть пустым');
    patch.title = title;
  }
  if ('text' in body) patch.text = str(body.text, existing.text, 220);
  if ('icon' in body && isValueIcon(body.icon)) patch.icon = body.icon;
  if ('isVisible' in body) patch.isVisible = bool(body.isVisible, existing.isVisible);

  res.json(repo.updateClubValue(id, patch));
});

adminRouter.delete('/values/:id', (req: Request, res: Response) => {
  const id = int(req.params.id, 0, 1);
  if (!repo.getClubValue(id)) throw notFound('Ценность не найдена');
  repo.deleteClubValue(id);
  res.json({ ok: true, id });
});

adminRouter.put('/values/order', (req: Request, res: Response) => {
  const body = requireBody(req);
  const ids = Array.isArray(body.ids) ? body.ids.map((value) => int(value, 0, 1)) : [];
  if (!ids.length) throw badRequest('Не передан порядок карточек');
  repo.reorderClubValues(ids);
  res.json(repo.listClubValues());
});

/* ------------------------------- Тактика ------------------------------- */

adminRouter.get('/lineups', (_req: Request, res: Response) => {
  res.json(repo.getLineups());
});

adminRouter.put('/lineups/:formation', (req: Request, res: Response) => {
  const formation = req.params.formation;
  if (!isFormationCode(formation)) throw badRequest('Неизвестная схема');
  const body = requireBody(req);
  const assignments = Array.isArray(body.assignments) ? body.assignments : [];

  for (const item of assignments) {
    const entry = item as { slot?: unknown; playerId?: unknown };
    const slot = str(entry.slot, '', 20);
    if (!slot) continue;
    const playerId = entry.playerId === null ? null : int(entry.playerId, 0, 1);
    repo.setLineupSlot(formation as FormationCode, slot, playerId && playerId > 0 ? playerId : null);
  }

  res.json(repo.getLineups());
});

adminRouter.post('/lineups/:formation/swap', (req: Request, res: Response) => {
  const formation = req.params.formation;
  if (!isFormationCode(formation)) throw badRequest('Неизвестная схема');
  const body = requireBody(req);
  const first = str(body.first, '', 20);
  const second = str(body.second, '', 20);
  if (!first || !second) throw badRequest('Укажите две позиции для обмена');
  repo.swapLineupSlots(formation as FormationCode, first, second);
  res.json(repo.getLineups());
});

adminRouter.post('/lineups/:formation/clear', (req: Request, res: Response) => {
  const formation = req.params.formation;
  if (!isFormationCode(formation)) throw badRequest('Неизвестная схема');
  repo.clearLineup(formation as FormationCode);
  res.json(repo.getLineups());
});

adminRouter.post('/lineups/:formation/auto', (req: Request, res: Response) => {
  const formation = req.params.formation;
  if (!isFormationCode(formation)) throw badRequest('Неизвестная схема');
  const code = formation as FormationCode;

  repo.clearLineup(code);

  const players = repo.listPlayers();
  const used = new Set<number>();
  const slots = formationSlots(code);

  // Сначала расставляем игроков, чья позиция точно совпадает с ролью слота.
  for (const slot of slots) {
    const candidate = players.find(
      (player) => player.position === slot.role && !used.has(player.id),
    );
    if (candidate) {
      repo.setLineupSlot(code, slot.key, candidate.id);
      used.add(candidate.id);
    }
  }

  // Оставшиеся слоты заполняем любыми свободными игроками (кроме вратаря — только в слот вратаря).
  for (const slot of slots) {
    if (repo.getLineups()[code].some((entry) => entry.slot === slot.key)) continue;
    const candidate = players.find(
      (player) =>
        !used.has(player.id) && (slot.role === 'GK' ? player.position === 'GK' : true),
    );
    if (candidate) {
      repo.setLineupSlot(code, slot.key, candidate.id);
      used.add(candidate.id);
    }
  }

  res.json(repo.getLineups());
});

/* ------------------------------- Медиа ------------------------------- */

adminRouter.post('/media', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const folder = str(req.body?.folder, 'misc', 20).toLowerCase().replace(/[^a-z0-9]/g, '') || 'misc';
  const key = await saveImage(req.file, folder);
  res.status(201).json({ key, url: `/api/media/${key}` });
}));
