import { ApplicationStatus } from '../types';

const LABELS: Record<ApplicationStatus, string> = {
  received: 'Received',
  processing: 'Processing',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
