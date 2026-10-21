import type { PositionCode, PositionMeta } from './types.js';

/** Полный справочник позиций клуба. */
export const POSITIONS: PositionMeta[] = [
  { code: 'GK', label: 'Вратарь', short: 'ВР', group: 'Вратарь' },
  { code: 'LB', label: 'Левый защитник', short: 'ЛЗ', group: 'Защитник' },
  { code: 'CB', label: 'Центральный защитник', short: 'ЦЗ', group: 'Защитник' },
  { code: 'RB', label: 'Правый защитник', short: 'ПЗ', group: 'Защитник' },
  { code: 'DM', label: 'Опорный полузащитник', short: 'ОП', group: 'Полузащитник' },
  { code: 'CM', label: 'Центральный полузащитник', short: 'ПЗ', group: 'Полузащитник' },
  { code: 'AM', label: 'Атакующий полузащитник', short: 'АП', group: 'Полузащитник' },
  { code: 'LW', label: 'Левый нападающий', short: 'ЛН', group: 'Нападающий' },
  { code: 'RW', label: 'Правый нападающий', short: 'ПН', group: 'Нападающий' },
  { code: 'ST', label: 'Центральный нападающий', short: 'ЦН', group: 'Нападающий' },
];

const POSITION_MAP = new Map<string, PositionMeta>(POSITIONS.map((p) => [p.code, p]));

export function isPositionCode(value: unknown): value is PositionCode {
  return typeof value === 'string' && POSITION_MAP.has(value);
}

export function getPosition(code: string): PositionMeta {
  return POSITION_MAP.get(code) ?? POSITIONS[0];
}

export function positionLabel(code: string): string {
  return getPosition(code).label;
}
