import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { applicationsApi } from '../api/applications';
import { extractApiError } from '../api/client';
import { Application, ApplicationStatus, PopulatedUserRef, Vendor } from '../types';
import { formatDate, formatNaira } from '../utils/format';
import { DEFAULT_INTEREST_RATE, daysUntil, interestOn, totalRepayable } from '../utils/loan';
import { saveRepaymentAccount, useRepaymentAccount } from '../hooks/useRepaymentAccount';
import { emailNotifications } from '../utils/email';
import { StatusBadge } from './StatusBadge';
import { DocumentItem, DocumentList } from './DocumentViewer';
import { SensitiveValue } from './SensitiveValue';

interface Props {
  application: Application;
  /** Managers can read everything but not change status. */
  readOnly?: boolean;
  onUpdated?: (updated: Application) => void;
}

interface RepayDraft {
  bank: string;
  number: string;
  name: string;
}

export function applicationDocuments(a: Application): DocumentItem[] {
  const docs: DocumentItem[] = [];
  if (a.validId) docs.push({ label: 'Valid ID', file: a.validId });
  if (a.proofOfAddress) docs.push({ label: 'Proof of address', file: a.proofOfAddress });
  if (a.offerLetter) docs.push({ label: 'Offer letter', file: a.offerLetter });
  if (a.bankStatement) docs.push({ label: 'Bank statement', file: a.bankStatement });
  if (a.staffId) docs.push({ label: 'Staff ID', file: a.staffId });
  return docs;
}

const STATUS_HINT: Record<ApplicationStatus, string> = {
  received: 'Received and waiting for review.',
  processing: 'Under review.',
  approved: 'Loan approved.',
  rejected: 'Application rejected.',
};

/**
 * Full detail + decision panel for a single loan application. Used by the
 * Admin applications page and the Requests inbox.
 */
export function ApplicationReview({ application: a, readOnly = false, onUpdated }: Props) {
  const [note, setNote] = useState(a.statusNote ?? '');
  const [allowEdit, setAllowEdit] = useState(!!a.allowEdit);
  const [repay, setRepay] = useState<RepayDraft>({
    bank: a.repaymentBank || '',
    number: a.repaymentAccountNumber || '',
    name: a.repaymentAccountName || '',
  });
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [acting, setActing] = useState<ApplicationStatus | null>(null);

  // Pre-fill the repayment account from the saved default unless this loan
  // already has one. Admins can still override it for a single loan.
  const { account: defaultAccount } = useRepaymentAccount(!readOnly);
  useEffect(() => {
    if (!defaultAccount) return;
    setRepay((r) =>
      r.bank || r.number || r.name
        ? r
        : { bank: defaultAccount.bank, number: defaultAccount.accountNumber, name: defaultAccount.accountName }
    );
  }, [defaultAccount]);
  const differsFromDefault =
    !!defaultAccount &&
    (repay.bank.trim() !== defaultAccount.bank ||
      repay.number.trim() !== defaultAccount.accountNumber ||
      repay.name.trim() !== defaultAccount.accountName);

  const userRef = typeof a.user === 'object' && a.user ? (a.user as PopulatedUserRef) : null;
  const rate = a.interestRate ?? DEFAULT_INTEREST_RATE;
  const docs = applicationDocuments(a);
  const paysToApplicant = a.purposes.includes('Other');
  const otherAmount = a.purposeBreakdown.find((b) => b.purpose === 'Other')?.amount;

  const updateStatus = async (status: ApplicationStatus) => {
    const trimmedNote = note.trim();
    if (status === 'rejected' && !trimmedNote) {
      toast.error('A reason is required when rejecting an application.');
      return;
    }
    if (status === 'approved') {
      if (!repay.bank.trim() || !repay.name.trim()) {
        toast.error('Enter the repayment bank and account name before approving.');
        return;
      }
      if (!/^\d{10}$/.test(repay.number)) {
        toast.error('The repayment account number must be 10 digits.');
        return;
      }
    }

    setActing(status);
    try {
      const updated = await applicationsApi.adminUpdateStatus(a._id, {
        status,
        statusNote: trimmedNote,
        allowEdit: status === 'rejected' ? allowEdit : false,
        ...(status === 'approved'
          ? {
              repaymentBank: repay.bank.trim(),
              repaymentAccountNumber: repay.number.trim(),
              repaymentAccountName: repay.name.trim(),
            }
          : {}),
      });
      onUpdated?.(updated);
      toast.success(`Application ${status}`);

      if (status === 'approved' && saveAsDefault && differsFromDefault) {
        saveRepaymentAccount({
          bank: repay.bank.trim(),
          accountNumber: repay.number.trim(),
          accountName: repay.name.trim(),
        })
          .then(() => {
            toast.success('Saved as the default repayment account');
            setSaveAsDefault(false);
          })
          .catch((err) => toast.error(extractApiError(err, 'Could not save default account')));
      }

      if (status === 'approved') {
        emailNotifications.applicationApproved({
          email: updated.email,
          firstName: updated.firstName,
          loanAmount: updated.loanAmount,
          applicationId: updated._id,
          totalRepayable: totalRepayable(updated.loanAmount, updated.interestRate ?? rate),
          dueDate: updated.dueDate,
          repaymentBank: updated.repaymentBank || repay.bank.trim(),
          repaymentAccountNumber: updated.repaymentAccountNumber || repay.number.trim(),
          repaymentAccountName: updated.repaymentAccountName || repay.name.trim(),
        });
      }
      if (status === 'rejected') {
        emailNotifications.applicationRejected({
          email: updated.email,
          firstName: updated.firstName,
          loanAmount: updated.loanAmount,
          applicationId: updated._id,
          reason: trimmedNote,
          canEdit: allowEdit,
        });
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Could not update status'));
    } finally {
      setActing(null);
    }
  };

  const busy = acting !== null;

  return (
    <div className="review-panel">
      <div className="review-summary">
        <div className="review-summary-item">
          <span>Status</span>
          <StatusBadge status={a.status} />
        </div>
        <div className="review-summary-item">
          <span>Requested</span>
          <strong>{formatNaira(a.loanAmount)}</strong>
        </div>
        <div className="review-summary-item">
          <span>To repay</span>
          <strong>{formatNaira(totalRepayable(a.loanAmount, rate))}</strong>
        </div>
        <div className="review-summary-item">
          <span>Submitted</span>
          <strong>{formatDate(a.createdAt)}</strong>
        </div>
        <div className="review-summary-item">
          <span>Documents</span>
          <strong>{docs.length}</strong>
        </div>
        <div className="review-summary-item">
          <span>Reference</span>
          <strong className="mono">{a._id.slice(-8).toUpperCase()}</strong>
        </div>
      </div>

      {a.statusNote && (
        <div className={`alert ${a.status === 'rejected' ? 'alert-error' : 'alert-info'}`}>
          <strong>{STATUS_HINT[a.status]}</strong> Note to applicant: <em>"{a.statusNote}"</em>
          {a.status === 'rejected' && a.allowEdit && ' · Applicant may edit and resubmit.'}
        </div>
      )}

      <div className="review-sections">
        <section className="review-section">
          <h3>Applicant</h3>
          <div className="detail-grid">
            <div>
              <strong>Name</strong>
              {a.surname} {a.firstName} {a.middleName}
            </div>
            <div>
              <strong>Email</strong>
              <a href={`mailto:${a.email}`}>{a.email}</a>
              {userRef && userRef.email !== a.email && (
                <div className="detail-sub">Account: {userRef.email}</div>
              )}
            </div>
            <div>
              <strong>Mobile</strong>
              {a.mobileNumber}
              {a.altNumber && <div className="detail-sub">Alt: {a.altNumber}</div>}
            </div>
            <div>
              <strong>Address</strong>
              {a.houseAddress}, {a.lga}, {a.state}
              {a.country ? `, ${a.country}` : ''}
            </div>
            <div>
              <strong>BVN</strong>
              <SensitiveValue value={a.bvn} label="BVN" />
            </div>
            <div>
              <strong>NIN</strong>
              <SensitiveValue value={a.nin} label="NIN" />
            </div>
          </div>
        </section>

        <section className="review-section">
          <h3>{a.employmentStatus === 'not-working' ? 'Employment & reference' : 'Employment'}</h3>
          <div className="detail-grid">
            <div>
              <strong>Status</strong>
              {a.employmentStatus === 'not-working' ? 'Not currently working' : 'Employed'}
            </div>
            {a.employmentStatus === 'not-working' ? (
              <>
                <div>
                  <strong>Reference</strong>
                  {a.referenceName || '—'}
                  {a.referenceRelationship && <div className="detail-sub">{a.referenceRelationship}</div>}
                </div>
                <div>
                  <strong>Reference phone</strong>
                  {a.referencePhone || '—'}
                </div>
                <div>
                  <strong>Reference address</strong>
                  {a.referenceAddress || '—'}
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong>Employer</strong>
                  {a.employerName || '—'}
                </div>
                <div className="span-2">
                  <strong>Office address</strong>
                  {a.officeAddress || '—'}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="review-section loan-section">
          <h3>Loan</h3>
          <div className="loan-figures">
            <div className="loan-figure">
              <span>Requested</span>
              <strong>{formatNaira(a.loanAmount)}</strong>
            </div>
            <div className="loan-figure">
              <span>Interest · {rate}%</span>
              <strong>{formatNaira(interestOn(a.loanAmount, rate))}</strong>
            </div>
            <div className="loan-figure total">
              <span>Total to repay</span>
              <strong>{formatNaira(totalRepayable(a.loanAmount, rate))}</strong>
            </div>
          </div>

          <div className="loan-purposes">
            <strong>Purpose</strong>
            <ul className="review-list">
              {a.purposeBreakdown.length > 0 ? (
                a.purposeBreakdown.map((b) => (
                  <li key={b.purpose}>
                    <span>{b.purpose}</span>
                    <strong>{formatNaira(b.amount)}</strong>
                  </li>
                ))
              ) : (
                <li>
                  <span>{a.purposes.join(', ') || '—'}</span>
                  <strong>{formatNaira(a.loanAmount)}</strong>
                </li>
              )}
            </ul>
          </div>

          {a.status === 'approved' && (
            <div className="loan-schedule">
              <div className="loan-schedule-dates">
                <div>
                  <span>Approved</span>
                  <strong>{a.approvedAt ? formatDate(a.approvedAt) : '—'}</strong>
                </div>
                <div>
                  <span>Due</span>
                  <strong>{a.dueDate ? formatDate(a.dueDate) : '—'}</strong>
                </div>
                {a.dueDate && <DueChip dueDate={a.dueDate} />}
              </div>
              {a.repaymentAccountNumber && (
                <AccountCard
                  heading="Repays into"
                  bank={a.repaymentBank}
                  number={a.repaymentAccountNumber}
                  name={a.repaymentAccountName}
                />
              )}
            </div>
          )}
        </section>

        <section className="review-section">
          <h3>{paysToApplicant ? 'Payout' : 'Selected vendors'}</h3>
          {paysToApplicant && (
            <AccountCard
              heading={
                otherAmount !== undefined && a.purposes.length > 1
                  ? `"Other" portion (${formatNaira(otherAmount)}) is paid to`
                  : 'Loan is paid directly to'
              }
              bank={a.bankName}
              number={a.accountNumber}
              name={a.accountName}
            />
          )}
          {a.vendorSelections && a.vendorSelections.length > 0 ? (
            <>
              {paysToApplicant && <h3 className="review-subhead">Selected vendors</h3>}
              <ul className="review-list vendors">
                {a.vendorSelections.map((s, i) => {
                  const v = typeof s.vendor === 'object' ? (s.vendor as Vendor) : null;
                  return (
                    <li key={`${s.purpose}-${i}`}>
                      <span>
                        <strong>{s.purpose}</strong>
                        {v ? (
                          <div className="detail-sub">
                            {v.businessName} ({v.partnerCode}) · {v.area}
                            {v.contactPhone && ` · ${v.contactPhone}`}
                          </div>
                        ) : (
                          <div className="detail-sub">Vendor no longer available</div>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            !paysToApplicant && <p className="review-empty">No vendors selected.</p>
          )}
        </section>

        <section className="review-section span-2">
          <h3>Documents</h3>
          <p className="review-hint">Click a document to read it here. Use the arrow keys to move between documents.</p>
          <DocumentList docs={docs} />
        </section>

        {readOnly ? null : (
          <section className="review-section span-2 decision">
            <h3>Decision</h3>
            <div className="form-group">
              <label htmlFor={`note-${a._id}`}>
                Note to applicant{' '}
                <span className="label-hint">· required when rejecting</span>
              </label>
              <textarea
                id={`note-${a._id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Visible to the applicant. For rejections, explain what they can fix."
                rows={3}
              />
            </div>

            <div className="decision-columns">
              <div className="decision-block">
                <h4>To approve</h4>
                <p className="review-hint">
                  The customer repays into this account. Due 29 days after approval. Pre-filled with the saved
                  default; change it only if this loan should be repaid elsewhere.
                </p>
                <div className="form-group">
                  <label htmlFor={`repay-bank-${a._id}`}>Repayment bank</label>
                  <input
                    id={`repay-bank-${a._id}`}
                    placeholder="e.g. Kuda MFB"
                    value={repay.bank}
                    onChange={(e) => setRepay((r) => ({ ...r, bank: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`repay-number-${a._id}`}>Account number</label>
                    <input
                      id={`repay-number-${a._id}`}
                      placeholder="10 digits"
                      inputMode="numeric"
                      maxLength={10}
                      value={repay.number}
                      onChange={(e) =>
                        setRepay((r) => ({ ...r, number: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`repay-name-${a._id}`}>Account name</label>
                    <input
                      id={`repay-name-${a._id}`}
                      placeholder="Account name"
                      value={repay.name}
                      onChange={(e) => setRepay((r) => ({ ...r, name: e.target.value }))}
                    />
                  </div>
                </div>
                {differsFromDefault && (
                  <label className={`checkbox-row ${saveAsDefault ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                    />
                    <span>Also save this as the default repayment account for future approvals</span>
                  </label>
                )}
              </div>

              <div className="decision-block">
                <h4>To reject</h4>
                <p className="review-hint">Add the reason in the note above so the applicant knows what to fix.</p>
                <label className={`checkbox-row ${allowEdit ? 'checked' : ''}`}>
                  <input type="checkbox" checked={allowEdit} onChange={(e) => setAllowEdit(e.target.checked)} />
                  <span>Allow the applicant to edit and resubmit this application</span>
                </label>
              </div>
            </div>

            <div className="action-bar decision-actions">
              <div className="action-group">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy || a.status === 'received'}
                  onClick={() => updateStatus('received')}
                >
                  {acting === 'received' ? <span className="spinner dark" /> : 'Mark received'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || a.status === 'processing'}
                  onClick={() => updateStatus('processing')}
                >
                  {acting === 'processing' ? <span className="spinner dark" /> : 'Mark processing'}
                </button>
              </div>
              <div className="action-group">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy || a.status === 'rejected'}
                  onClick={() => updateStatus('rejected')}
                >
                  {acting === 'rejected' ? <span className="spinner" /> : 'Reject'}
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={busy || a.status === 'approved'}
                  onClick={() => updateStatus('approved')}
                >
                  {acting === 'approved' ? <span className="spinner" /> : 'Approve loan'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AccountCard({
  heading,
  bank,
  number,
  name,
}: {
  heading: string;
  bank?: string;
  number?: string;
  name?: string;
}) {
  return (
    <div className="account-card">
      <div className="account-card-heading">{heading}</div>
      <div className="account-card-bank">{bank || '—'}</div>
      <div className="account-card-number mono">{number || '—'}</div>
      <div className="account-card-name">{name || '—'}</div>
    </div>
  );
}

function DueChip({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate);
  if (days < 0) {
    return <span className="badge badge-rejected due-chip">{Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} overdue</span>;
  }
  if (days === 0) return <span className="badge badge-processing due-chip">Due today</span>;
  return (
    <span className={`badge ${days <= 5 ? 'badge-processing' : 'badge-approved'} due-chip`}>
      {days} day{days === 1 ? '' : 's'} left
    </span>
  );
}
