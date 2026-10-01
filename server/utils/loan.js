// Mirrors src/utils/loan.ts on the client. Keep the two in step.
const DEFAULT_INTEREST_RATE = 20;
const DEFAULT_LATE_GRACE_DAYS = 3;
const DEFAULT_LATE_INTEREST_RATE = 1; // % of total repayable, per day after grace

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole days from `now` to `due`: positive = days left, 0 = due today, negative = overdue. */
function daysUntil(due, now = new Date()) {
  return Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
}

function interestOn(principal, rate = DEFAULT_INTEREST_RATE) {
  return Math.round((principal * rate) / 100);
}

function totalRepayable(principal, rate = DEFAULT_INTEREST_RATE) {
  return principal + interestOn(principal, rate);
}

/** Days that attract late interest, given days overdue (negative daysUntil). */
function penaltyDays(daysOverdue, graceDays = DEFAULT_LATE_GRACE_DAYS) {
  return Math.max(0, daysOverdue - graceDays);
}

/**
 * Full repayment picture for an application as of `asOf` (defaults to now,
 * or the repaid date once the loan is settled, so the figure is frozen).
 */
function repaymentBreakdown(app, asOf) {
  const at = asOf || (app.repaidAt ? new Date(app.repaidAt) : new Date());
  const rate = app.interestRate ?? DEFAULT_INTEREST_RATE;
  const grace = app.lateGraceDays ?? DEFAULT_LATE_GRACE_DAYS;
  const lateRate = app.lateInterestRate ?? DEFAULT_LATE_INTEREST_RATE;
  const total = totalRepayable(app.loanAmount, rate);
  const days = app.dueDate ? daysUntil(app.dueDate, at) : null;
  const daysOverdue = days !== null && days < 0 ? -days : 0;
  const pDays = penaltyDays(daysOverdue, grace);
  const dailyLate = Math.round((total * lateRate) / 100);
  const lateInterest = dailyLate * pDays;
  return {
    principal: app.loanAmount,
    rate,
    interest: total - app.loanAmount,
    total,
    days,
    daysOverdue,
    graceDays: grace,
    inGrace: daysOverdue > 0 && pDays === 0,
    lateRate,
    dailyLate,
    penaltyDays: pDays,
    lateInterest,
    amountDue: total + lateInterest,
  };
}

module.exports = {
  DEFAULT_INTEREST_RATE,
  DEFAULT_LATE_GRACE_DAYS,
  DEFAULT_LATE_INTEREST_RATE,
  daysUntil,
  interestOn,
  totalRepayable,
  penaltyDays,
  repaymentBreakdown,
};
