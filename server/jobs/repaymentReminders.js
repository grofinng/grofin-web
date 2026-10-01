const Application = require('../models/Application');
const { sendEmail, TEMPLATES, COMPANY_PHONE } = require('../utils/email');

const DEFAULT_INTEREST_RATE = 20;

// Schedule: warn N days before the due date (default: 2 days out), on the
// due date itself, then every INTERVAL days after it while unpaid (default:
// every 3 days). Each (kind, day) pair is sent at most once per loan.
const DAYS_BEFORE = parseDays(process.env.REPAYMENT_REMINDER_DAYS_BEFORE, [2]);
const OVERDUE_INTERVAL = parseInterval(process.env.REPAYMENT_OVERDUE_REMINDER_INTERVAL_DAYS, 3);

function parseDays(raw, fallback) {
  if (!raw) return fallback;
  const list = String(raw)
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return list.length ? Array.from(new Set(list)).sort((a, b) => a - b) : fallback;
}

function parseInterval(raw, fallback) {
  const n = parseInt(String(raw || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole days from `now` to `due`: positive = days left, 0 = due today, negative = overdue. */
function daysUntil(due, now) {
  return Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
}

function totalRepayable(principal, rate = DEFAULT_INTEREST_RATE) {
  return principal + Math.round((principal * rate) / 100);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function shortRef(id) {
  return String(id).slice(-8).toUpperCase();
}

function fmtNaira(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

/** Which reminder (if any) an unpaid loan should get today. */
function reminderFor(days) {
  if (days > 0 && DAYS_BEFORE.includes(days)) return { kind: 'due-soon', offsetDays: days };
  if (days === 0) return { kind: 'due-today', offsetDays: 0 };
  if (days < 0 && -days % OVERDUE_INTERVAL === 0) return { kind: 'overdue', offsetDays: -days };
  return null;
}

function alreadySent(app, r) {
  return (app.reminderLog || []).some((e) => e.kind === r.kind && e.offsetDays === r.offsetDays);
}

function buildParams(app, days) {
  const total = totalRepayable(app.loanAmount, app.interestRate ?? DEFAULT_INTEREST_RATE);
  const due = formatDate(app.dueDate);
  const accountDetails =
    `Bank: ${app.repaymentBank}\n` +
    `Account number: ${app.repaymentAccountNumber}\n` +
    `Account name: ${app.repaymentAccountName}`;
  const overdue = days < 0;
  const n = Math.abs(days);
  const when =
    days === 0 ? 'today' : overdue ? `${n} day${n === 1 ? '' : 's'} ago` : `in ${n} day${n === 1 ? '' : 's'}`;
  const ref = shortRef(app._id);
  const contact = `Quote ref ${ref} when you pay. Questions? Call or WhatsApp ${COMPANY_PHONE} or reply to this email.`;
  const subject = overdue
    ? `Esena Africa — Loan ${ref} repayment is ${n} day${n === 1 ? '' : 's'} overdue`
    : days === 0
    ? `Esena Africa — Loan ${ref} repayment is due today`
    : `Esena Africa — Loan ${ref} repayment is due ${when}`;
  const message = overdue
    ? `Hi ${app.firstName}, your Esena Africa loan repayment of ${fmtNaira(total)} (ref ${ref}) was due on ${due} (${when}) and we have no record of it yet. Please pay into:\n${accountDetails}\n\nIf you have already paid, reply to this email with your proof of payment. ${contact}`
    : `Hi ${app.firstName}, a reminder that your Esena Africa loan repayment of ${fmtNaira(total)} (ref ${ref}) is due ${when} (${due}). Please pay into:\n${accountDetails}\n\n${contact}`;

  const statusLine = overdue
    ? `Overdue by ${n} day${n === 1 ? '' : 's'}`
    : days === 0
    ? 'Due today'
    : `Due in ${n} day${n === 1 ? '' : 's'}`;

  return {
    to_email: app.email,
    to_name: app.firstName,
    reference: ref,
    application_id: String(app._id),
    reminder_kind: overdue ? 'overdue' : days === 0 ? 'due-today' : 'due-soon',
    status_line: statusLine,
    loan_amount: app.loanAmount.toLocaleString('en-NG'),
    total_repayable: total.toLocaleString('en-NG'),
    due_date: due,
    due_in: when,
    days_left: overdue ? '0' : String(n),
    days_overdue: overdue ? String(n) : '0',
    repayment_bank: app.repaymentBank,
    repayment_account_number: app.repaymentAccountNumber,
    repayment_account_name: app.repaymentAccountName,
    account_details: accountDetails,
    subject,
    message,
  };
}

/**
 * Send due-soon / due-today / overdue reminders for every approved loan that
 * has no repayment recorded. Safe to run as often as you like: each reminder
 * is logged on the application and never sent twice.
 */
async function runRepaymentReminders({ now = new Date(), dryRun = false } = {}) {
  const apps = await Application.find({
    status: 'approved',
    repaidAt: null,
    dueDate: { $ne: null },
  }).select('firstName email loanAmount interestRate dueDate repaymentBank repaymentAccountNumber repaymentAccountName reminderLog');

  const summary = { checked: apps.length, dryRun, sent: [], skipped: 0, failed: [] };

  for (const app of apps) {
    const days = daysUntil(app.dueDate, now);
    const r = reminderFor(days);
    if (!r || alreadySent(app, r)) {
      summary.skipped++;
      continue;
    }
    const templateId = r.kind === 'overdue' ? TEMPLATES.overdue : TEMPLATES.reminder;
    const entry = { id: String(app._id), email: app.email, kind: r.kind, offsetDays: r.offsetDays, days };
    if (dryRun) {
      summary.sent.push({ ...entry, dryRun: true });
      continue;
    }
    try {
      const result = await sendEmail(templateId, buildParams(app, days));
      if (result.skipped) {
        summary.failed.push({ ...entry, error: 'EmailJS not configured on the server' });
        continue;
      }
      await Application.updateOne(
        { _id: app._id },
        { $push: { reminderLog: { kind: r.kind, offsetDays: r.offsetDays, sentAt: now } } }
      );
      summary.sent.push(entry);
    } catch (err) {
      console.error('[reminders] failed', entry, err.message);
      summary.failed.push({ ...entry, error: err.message });
    }
  }
  return summary;
}

module.exports = { runRepaymentReminders, reminderFor, daysUntil, DAYS_BEFORE, OVERDUE_INTERVAL };
