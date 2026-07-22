// Flat interest applied to every loan. Applications store the rate they were
// created with (`interestRate`) so changing this later never rewrites history.
export const DEFAULT_INTEREST_RATE = 20; // percent

export function interestOn(principal: number, rate: number = DEFAULT_INTEREST_RATE): number {
  return Math.round((principal * rate) / 100);
}

export function totalRepayable(principal: number, rate: number = DEFAULT_INTEREST_RATE): number {
  return principal + interestOn(principal, rate);
}

export function daysUntil(date: string | Date): number {
  const due = new Date(date).setHours(23, 59, 59, 999);
  return Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
}
