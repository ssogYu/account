// 金额校验
export function isValidAmount(amount: number): boolean {
  return amount > 0 && amount < 10000000 && Number.isFinite(amount);
}

// 手机号校验（中国大陆）
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 月份格式校验 (YYYY-MM)
export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
}
