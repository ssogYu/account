import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// ============================================================
// 本项目统一时间处理工具
//
// 核心约定：
// 1. 所有时间在应用层统一使用字符串传递，格式为 YYYY-MM-DD HH:mm:ss
// 2. 写入数据库时调用 toDateTime() 转为本地时区的 Date
// 3. 从数据库读出时调用 formatDateTime() 转为字符串
// 4. 禁止使用 `new Date(str)` 解析日期字符串 —— 会被 ECMAScript 规范当作 UTC
// ============================================================

/** 标准时间格式 */
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 将时间字符串转为本地时区的 Date。
 * 支持 YYYY-MM-DD HH:mm:ss 和 YYYY-MM-DD 两种格式。
 *
 * 关键：`new Date('2026-08-06 14:30:00')` 在不同 JS 引擎中行为不一致，
 * 使用 `new Date(year, month-1, day, hour, min, sec)` 保证本地时区。
 */
export function toDateTime(dateStr: string): Date {
  const parts = dateStr.split(/[- :]/);
  const [y, m, d, h = 0, min = 0, s = 0] = parts.map(Number);
  return new Date(y, m - 1, d, h, min, s);
}

/**
 * 将 Date / string / number 格式化为 YYYY-MM-DD HH:mm:ss（北京时间）。
 */
export function formatDateTime(date: dayjs.ConfigType): string {
  return dayjs(date).format(DATETIME_FORMAT);
}

/**
 * 将 Date / string / number 格式化为 YYYY-MM-DD（北京时间）。
 */
export function formatDate(date: dayjs.ConfigType): string {
  return dayjs(date).format(DATE_FORMAT);
}

/**
 * 返回当前时间的字符串（YYYY-MM-DD HH:mm:ss，北京时间）。
 */
export function now(): string {
  return dayjs().format(DATETIME_FORMAT);
}

/**
 * 返回当前时间的 Date 对象。
 */
export function nowDate(): Date {
  return new Date();
}

/**
 * 返回今天的日期字符串（YYYY-MM-DD）。
 */
export function today(): string {
  return dayjs().format(DATE_FORMAT);
}

/**
 * 尝试将任意时间/日期输入解析为 YYYY-MM-DD HH:mm:ss 字符串，失败返回 null。
 *
 * 支持的输入：
 * - YYYY-MM-DD HH:mm:ss（带时间）
 * - YYYY-MM-DD（仅日期，补 00:00:00）
 * - YYYY/MM/DD、YYYY.M.D、YYYY年M月D日 等常见日期格式
 * - 相对日期词：今天、昨天、前天、明天、后天 等
 * - 任意 dayjs 能宽松解析的字符串
 */
export function parseDateTime(input: string | undefined | null): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. 相对日期词（保留当前时分秒）
  const offset = RELATIVE_MAP[trimmed];
  if (offset !== undefined) {
    return dayjs().add(offset, 'day').format(DATETIME_FORMAT);
  }

  // 2. 完整日期时间格式（YYYY-MM-DD HH:mm:ss）
  const full = dayjs(trimmed, DATETIME_FORMAT, true);
  if (full.isValid()) {
    return full.format(DATETIME_FORMAT);
  }

  // 3. 常见日期格式严格解析（无时间部分 → 补 00:00:00）
  for (const fmt of DATE_ONLY_FORMATS) {
    const parsed = dayjs(trimmed, fmt, true);
    if (parsed.isValid()) {
      return parsed.format(DATETIME_FORMAT);
    }
  }

  // 4. 宽松解析回退
  const loose = dayjs(trimmed);
  if (loose.isValid() && trimmed.length >= 4) {
    return loose.format(DATETIME_FORMAT);
  }

  return null;
}

/**
 * 获取一天开始时间（00:00:00）的 Date 对象。
 */
export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}

/**
 * 获取一天结束时间（次日 00:00:00）的 Date 对象。
 */
export function endOfDay(date: Date = new Date()): Date {
  const start = startOfDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * 获取当月第一天的 Date 对象。
 */
export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
}

/**
 * 获取下月第一天的 Date 对象。
 */
export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0);
}

// ---- 内部常量 ----

const RELATIVE_MAP: Record<string, number> = {
  今天: 0,
  今日: 0,
  昨天: -1,
  昨日: -1,
  前天: -2,
  大前天: -3,
  明天: 1,
  明日: 1,
  后天: 2,
  大后天: 3,
};

const DATE_ONLY_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYY.M.D',
  'YYYY.MM.DD',
  'YYYY年M月D日',
  'YYYY年MM月DD日',
  'M月D日',
  'MM月DD日',
  'M/D',
  'MM/DD',
];

export { dayjs };
