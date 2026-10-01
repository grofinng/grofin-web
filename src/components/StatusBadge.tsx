import { Application, ApplicationStatus } from '../types';
import { daysUntil } from '../utils/loan';

const LABELS: Record<ApplicationStatus, string> = {
  received: 'Received',
  processing: 'Processing',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}

/** Repayment state for an approved loan, or null when nothing extra to say. */
export function repaymentState(a: Application): 'repaid' | 'overdue' | null {
  if (a.status !== 'approved') return null;
  if (a.repaidAt) return 'repaid';
  if (a.dueDate && daysUntil(a.dueDate) < 0) return 'overdue';
  return null;
}

export function RepaymentBadge({ application }: { application: Application }) {
  const state = repaymentState(application);
  if (!state) return null;
  return (
    <span className={`badge ${state === 'repaid' ? 'badge-repaid' : 'badge-overdue'}`}>
      {state === 'repaid' ? 'Repaid' : 'Overdue'}
    </span>
  );
}
