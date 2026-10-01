import { Application } from '../types';

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

// Customers start seeing in-app warnings (and the first reminder email goes
// out) this many days before the due date. Mirrors the server job default.
export const REPAYMENT_WARNING_DAYS = 2;

export interface DueLoan {
  application: Application;
  /** Days until due: 0 = today, negative = overdue. */
  days: number;
  total: number;
}

/** Approved, unpaid loans that are due within the warning window or overdue, most urgent first. */
export function dueLoans(apps: Application[]): DueLoan[] {
  return apps
    .filter((a) => a.status === 'approved' && !a.repaidAt && a.dueDate)
    .map((a) => ({
      application: a,
      days: daysUntil(a.dueDate as string),
      total: totalRepayable(a.loanAmount, a.interestRate ?? DEFAULT_INTEREST_RATE),
    }))
    .filter((d) => d.days <= REPAYMENT_WARNING_DAYS)
    .sort((x, y) => x.days - y.days);
}
