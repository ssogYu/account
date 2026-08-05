import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * 相对日期词 → 天数偏移
 */
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

/**
 * 常见日期格式列表（按优先级排列）
 * 格式参考：https://day.js.org/docs/en/plugin/custom-parse-format
 */
const DATE_FORMATS = [
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

/**
 * 将用户输入的原始日期文本解析为 YYYY-MM-DD 格式。
 * 未提供或无法识别时返回 null。
 */
export function resolveDate(
  rawDate: string | undefined | null,
  today: string,
): string | null {
  if (!rawDate) return null;

  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  // 1. 相对日期词
  const offset = RELATIVE_MAP[trimmed];
  if (offset !== undefined) {
    return dayjs(today).add(offset, 'day').format('YYYY-MM-DD');
  }

  // 2. 常见格式（非严格解析）
  for (const fmt of DATE_FORMATS) {
    const parsed = dayjs(trimmed, fmt, true);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
  }

  // 3. 最后尝试宽松解析（支持更多自然写法）
  const loose = dayjs(trimmed);
  if (loose.isValid() && trimmed.length >= 4) {
    return loose.format('YYYY-MM-DD');
  }

  return null;
}
