import type { FormationCode, PositionCode } from './types.js';

export interface FormationSlot {
  /** Уникальный ключ слота внутри схемы. */
  key: string;
  /** Человекочитаемое название слота. */
  label: string;
  /** Роль слота — по ней подбирается подходящий игрок. */
  role: PositionCode;
  /** Позиция по горизонтали, % ширины поля (0 — левая бровка). */
  x: number;
  /** Позиция по вертикали, % длины поля (0 — атака, 100 — свои ворота). */
  y: number;
}

export interface FormationMeta {
  code: FormationCode;
  label: string;
  slots: FormationSlot[];
}

export const FORMATIONS: FormationMeta[] = [
  {
    code: '4-3-3',
    label: '4-3-3',
    slots: [
      { key: 'GK', label: 'Вратарь', role: 'GK', x: 50, y: 93 },
      { key: 'LB', label: 'Левый защитник', role: 'LB', x: 12, y: 76 },
      { key: 'LCB', label: 'Левый центральный защитник', role: 'CB', x: 37, y: 80 },
      { key: 'RCB', label: 'Правый центральный защитник', role: 'CB', x: 63, y: 80 },
      { key: 'RB', label: 'Правый защитник', role: 'RB', x: 88, y: 76 },
      { key: 'LCM', label: 'Левый центральный полузащитник', role: 'CM', x: 30, y: 56 },
      { key: 'CM', label: 'Центральный полузащитник', role: 'CM', x: 50, y: 48 },
      { key: 'RCM', label: 'Правый центральный полузащитник', role: 'CM', x: 70, y: 56 },
      { key: 'LW', label: 'Левый нападающий', role: 'LW', x: 17, y: 20 },
      { key: 'ST', label: 'Центральный нападающий', role: 'ST', x: 50, y: 9 },
      { key: 'RW', label: 'Правый нападающий', role: 'RW', x: 83, y: 20 },
    ],
  },
  {
    code: '4-4-2',
    label: '4-4-2',
    slots: [
      { key: 'GK', label: 'Вратарь', role: 'GK', x: 50, y: 93 },
      { key: 'LB', label: 'Левый защитник', role: 'LB', x: 12, y: 76 },
      { key: 'LCB', label: 'Левый центральный защитник', role: 'CB', x: 37, y: 80 },
      { key: 'RCB', label: 'Правый центральный защитник', role: 'CB', x: 63, y: 80 },
      { key: 'RB', label: 'Правый защитник', role: 'RB', x: 88, y: 76 },
      { key: 'LM', label: 'Левый полузащитник', role: 'LW', x: 13, y: 52 },
      { key: 'LCM', label: 'Левый центральный полузащитник', role: 'CM', x: 37, y: 56 },
      { key: 'RCM', label: 'Правый центральный полузащитник', role: 'CM', x: 63, y: 56 },
      { key: 'RM', label: 'Правый полузащитник', role: 'RW', x: 87, y: 52 },
      { key: 'LS', label: 'Левый нападающий', role: 'ST', x: 38, y: 16 },
      { key: 'RS', label: 'Правый нападающий', role: 'ST', x: 62, y: 16 },
    ],
  },
  {
    code: '4-2-3-1',
    label: '4-2-3-1',
    slots: [
      { key: 'GK', label: 'Вратарь', role: 'GK', x: 50, y: 93 },
      { key: 'LB', label: 'Левый защитник', role: 'LB', x: 12, y: 76 },
      { key: 'LCB', label: 'Левый центральный защитник', role: 'CB', x: 37, y: 80 },
      { key: 'RCB', label: 'Правый центральный защитник', role: 'CB', x: 63, y: 80 },
      { key: 'RB', label: 'Правый защитник', role: 'RB', x: 88, y: 76 },
      { key: 'LDM', label: 'Левый опорный полузащитник', role: 'DM', x: 36, y: 60 },
      { key: 'RDM', label: 'Правый опорный полузащитник', role: 'DM', x: 64, y: 60 },
      { key: 'LAM', label: 'Левый атакующий полузащитник', role: 'LW', x: 17, y: 34 },
      { key: 'CAM', label: 'Центральный атакующий полузащитник', role: 'AM', x: 50, y: 34 },
      { key: 'RAM', label: 'Правый атакующий полузащитник', role: 'RW', x: 83, y: 34 },
      { key: 'ST', label: 'Центральный нападающий', role: 'ST', x: 50, y: 10 },
    ],
  },
];

export const FORMATION_CODES: FormationCode[] = FORMATIONS.map((f) => f.code);

const FORMATION_MAP = new Map<string, FormationMeta>(FORMATIONS.map((f) => [f.code, f]));

export function isFormationCode(value: unknown): value is FormationCode {
  return typeof value === 'string' && FORMATION_MAP.has(value);
}

export function getFormation(code: string): FormationMeta {
  return FORMATION_MAP.get(code) ?? FORMATIONS[0];
}

export function formationSlots(code: string): FormationSlot[] {
  return getFormation(code).slots;
}
