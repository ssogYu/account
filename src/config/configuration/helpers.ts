/**
 * 解析布尔值环境变量
 *
 * truthy: 'true', '1', 'yes', 'on', 'enable'
 * falsy:  其他所有值
 */
export function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value == null || value.trim().length === 0) {
    return defaultValue;
  }

  const lowered = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on', 'enable'].includes(lowered);
}

/**
 * 解析数字环境变量，非数字时回落默认值
 */
export function parseNumber(
  value: string | undefined,
  defaultValue: number,
): number {
  if (value == null || value.trim().length === 0) {
    return defaultValue;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

/**
 * 解析逗号分隔的字符串为数组，滤除空白项
 */
export function parseCsv(
  value: string | undefined,
  defaultValue: string[] = [],
): string[] {
  if (value == null || value.trim().length === 0) {
    return defaultValue;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
