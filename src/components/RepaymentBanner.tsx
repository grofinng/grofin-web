import { Link } from 'react-router-dom';
import { Application } from '../types';
import { formatDate, formatNaira, formatRef } from '../utils/format';
import { dueLoans } from '../utils/loan';

interface Props {
  applications: Application[];
  /** Hide the "View applications" link when already on that page. */
  showLink?: boolean;
}

function whenText(days: number) {
  if (days === 0) return 'is due today';
  if (days > 0) return `is due in ${days} day${days === 1 ? '' : 's'}`;
  const n = -days;
  return `was due ${n} day${n === 1 ? '' : 's'} ago`;
}

/**
 * Banner shown to signed-in customers when an approved loan is due within
 * the warning window or overdue and has not been recorded as repaid.
 */
export function RepaymentBanner({ applications, showLink = true }: Props) {
  const due = dueLoans(applications);
  if (due.length === 0) return null;

  const overdue = due.filter((d) => d.days < 0);
  const tone = overdue.length ? 'alert-error' : 'alert-warning';
  const title = overdue.length
    ? overdue.length === 1
      ? 'Your loan repayment is overdue'
      : `${overdue.length} loan repayments are overdue`
    : due.length === 1
    ? 'Your loan repayment is due soon'
    : `${due.length} loan repayments are due soon`;

  return (
    <div className={`alert ${tone} repay-banner`} role="status">
      <div className="repay-banner-body">
        <strong>{title}</strong>
        <ul className="repay-banner-list">
          {due.map(({ application: a, days, breakdown: b }) => (
            <li key={a._id}>
              <span>
                <strong>{formatNaira(b.amountDue)}</strong> {whenText(days)}
                {a.dueDate && ` (${formatDate(a.dueDate)})`}
                {' · '}ref {formatRef(a._id)}
              </span>
              <span className="repay-banner-account">
                {b.lateInterest > 0
                  ? `Includes ${formatNaira(b.lateInterest)} late interest · ${formatNaira(b.dailyLate)} more each day`
                  : b.inGrace
                  ? `Grace period: ${b.graceDays - b.daysOverdue} day${b.graceDays - b.daysOverdue === 1 ? '' : 's'} left before ${b.lateRate}% daily late interest (${formatNaira(b.dailyLate)}/day)`
                  : `${b.graceDays}-day grace after the due date, then ${formatNaira(b.dailyLate)} added per day`}
              </span>
              {a.repaymentAccountNumber && (
                <span className="repay-banner-account">
                  Pay into {a.repaymentBank} · <span className="mono">{a.repaymentAccountNumber}</span> ·{' '}
                  {a.repaymentAccountName}
                </span>
              )}
            </li>
          ))}
        </ul>
        <span className="repay-banner-note">
          Already paid? Reply to your reminder email with proof of payment and we will update your record.
        </span>
      </div>
      {showLink && (
        <Link to="/applications" className="btn btn-sm repay-banner-cta">
          View repayment details
        </Link>
      )}
    </div>
  );
}
