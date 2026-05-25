export function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value == null) {
    return defaultValue;
  }

  return value === 'true';
}

export function parseNumber(value: string | undefined, defaultValue: number) {
  if (value == null || value.trim().length === 0) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

export function parseCsv(
  value: string | undefined,
  defaultValue: string[] = [],
) {
  if (value == null || value.trim().length === 0) {
    return defaultValue;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
