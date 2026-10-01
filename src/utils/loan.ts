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

export const DEFAULT_LATE_GRACE_DAYS = 3;
export const DEFAULT_LATE_INTEREST_RATE = 1; // % of total repayable, per day after grace

function startOfDay(d: string | Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Whole days from `asOf` (default now) to `date`: positive = days left, 0 = due today, negative = overdue. */
export function daysUntil(date: string | Date, asOf: string | Date = new Date()): number {
  return Math.round((startOfDay(date) - startOfDay(asOf)) / 86400000);
}

export interface RepaymentBreakdown {
  principal: number;
  rate: number;
  interest: number;
  /** Principal plus the flat interest — the amount due on time. */
  total: number;
  /** Days until due as of the reference date; null when not yet approved. */
  days: number | null;
  daysOverdue: number;
  graceDays: number;
  inGrace: boolean;
  lateRate: number;
  dailyLate: number;
  penaltyDays: number;
  lateInterest: number;
  /** Total plus any late interest accrued — what the customer must pay now. */
  amountDue: number;
}

/**
 * Full repayment picture for an application. Defaults to today, or to the
 * repaid date once settled so the figure never changes afterwards.
 */
export function repaymentBreakdown(a: Application, asOf?: string | Date): RepaymentBreakdown {
  const at = asOf ?? (a.repaidAt ? a.repaidAt : new Date());
  const rate = a.interestRate ?? DEFAULT_INTEREST_RATE;
  const graceDays = a.lateGraceDays ?? DEFAULT_LATE_GRACE_DAYS;
  const lateRate = a.lateInterestRate ?? DEFAULT_LATE_INTEREST_RATE;
  const total = totalRepayable(a.loanAmount, rate);
  const days = a.dueDate ? daysUntil(a.dueDate, at) : null;
  const daysOverdue = days !== null && days < 0 ? -days : 0;
  const penaltyDays = Math.max(0, daysOverdue - graceDays);
  const dailyLate = Math.round((total * lateRate) / 100);
  const lateInterest = dailyLate * penaltyDays;
  return {
    principal: a.loanAmount,
    rate,
    interest: total - a.loanAmount,
    total,
    days,
    daysOverdue,
    graceDays,
    inGrace: daysOverdue > 0 && penaltyDays === 0,
    lateRate,
    dailyLate,
    penaltyDays,
    lateInterest,
    amountDue: total + lateInterest,
  };
}

// Customers start seeing in-app warnings (and the first reminder email goes
// out) this many days before the due date. Mirrors the server job default.
export const REPAYMENT_WARNING_DAYS = 2;

export interface DueLoan {
  application: Application;
  /** Days until due: 0 = today, negative = overdue. */
  days: number;
  total: number;
  breakdown: RepaymentBreakdown;
}

/** Approved, unpaid loans that are due within the warning window or overdue, most urgent first. */
export function dueLoans(apps: Application[]): DueLoan[] {
  return apps
    .filter((a) => a.status === 'approved' && !a.repaidAt && a.dueDate)
    .map((a) => {
      const breakdown = repaymentBreakdown(a);
      return { application: a, days: breakdown.days as number, total: breakdown.total, breakdown };
    })
    .filter((d) => d.days <= REPAYMENT_WARNING_DAYS)
    .sort((x, y) => x.days - y.days);
}
