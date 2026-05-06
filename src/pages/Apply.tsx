import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { applicationsApi } from '../api/applications';
import { vendorsApi } from '../api/vendors';
import { usersApi } from '../api/users';
import { extractApiError } from '../api/client';
import { PURPOSE_TO_CATEGORY, PURPOSES, Purpose, Vendor } from '../types';
import { formatNaira } from '../utils/format';
import { emailNotifications } from '../utils/email';

interface ApplyFormState {
  surname: string;
  firstName: string;
  middleName: string;
  email: string;
  houseAddress: string;
  lga: string;
  state: string;
  mobileNumber: string;
  altNumber: string;
  bvn: string;
  nin: string;
  validId: File | null;
  referredBy: string;
  referralContact: string;
  loanAmount: string;
  purposes: Purpose[];
  breakdown: Record<Purpose, string>;
  vendorIds: Record<Purpose, string>;
  employerName: string;
  officeAddress: string;
  offerLetter: File | null;
  bankStatement: File | null;
  staffId: File | null;
  termsAccepted: boolean;
}

const STEPS = ['Personal', 'Employment', 'Loan request', 'Review'] as const;

export function Apply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVendorsLoading(true);
    vendorsApi
      .list()
      .then((list) => !cancelled && setVendors(list))
      .catch(() => {})
      .finally(() => !cancelled && setVendorsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setEditLoading(true);
    setEditLoadError(null);
    applicationsApi
      .get(editId)
      .then((app) => {
        if (cancelled) return;
        if (app.status !== 'rejected' || !app.allowEdit) {
          setEditLoadError('This application is not open for editing.');
          return;
        }
        const breakdown: Record<Purpose, string> = { Groceries: '', Medications: '' };
        app.purposeBreakdown.forEach((b) => {
          breakdown[b.purpose] = String(b.amount);
        });
        const vendorIds: Record<Purpose, string> = { Groceries: '', Medications: '' };
        app.vendorSelections.forEach((s) => {
          vendorIds[s.purpose] =
            typeof s.vendor === 'object' ? (s.vendor as Vendor)._id : (s.vendor as string);
        });
        setForm({
          surname: app.surname,
          firstName: app.firstName,
          middleName: app.middleName || '',
          email: app.email,
          houseAddress: app.houseAddress,
          lga: app.lga,
          state: app.state,
          mobileNumber: app.mobileNumber,
          altNumber: app.altNumber || '',
          bvn: app.bvn,
          nin: app.nin,
          validId: null,
          referredBy: app.referredBy,
          referralContact: app.referralContact || '',
          loanAmount: String(app.loanAmount),
          purposes: app.purposes,
          breakdown,
          vendorIds,
          employerName: app.employerName,
          officeAddress: app.officeAddress,
          offerLetter: null,
          bankStatement: null,
          staffId: null,
          termsAccepted: !!app.termsAccepted,
        });
      })
      .catch((err) => !cancelled && setEditLoadError(extractApiError(err, 'Could not load application')))
      .finally(() => !cancelled && setEditLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const [form, setForm] = useState<ApplyFormState>({
    surname: user?.surname || '',
    firstName: user?.firstName || '',
    middleName: '',
    email: user?.email || '',
    houseAddress: '',
    lga: '',
    state: '',
    mobileNumber: '',
    altNumber: '',
    bvn: '',
    nin: user?.nin || '',
    validId: null,
    referredBy: '',
    referralContact: '',
    loanAmount: '',
    purposes: [],
    breakdown: { Groceries: '', Medications: '' },
    vendorIds: { Groceries: '', Medications: '' },
    employerName: '',
    officeAddress: '',
    offerLetter: null,
    bankStatement: null,
    staffId: null,
    termsAccepted: false,
  });

  const update = <K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const togglePurpose = (purpose: Purpose) => {
    setForm((prev) => {
      const exists = prev.purposes.includes(purpose);
      const purposes = exists ? prev.purposes.filter((p) => p !== purpose) : [...prev.purposes, purpose];
      const breakdown = { ...prev.breakdown };
      const vendorIds = { ...prev.vendorIds };
      if (!exists && purposes.length === 1) {
        breakdown[purpose] = prev.loanAmount || '';
      }
      if (exists) {
        breakdown[purpose] = '';
        vendorIds[purpose] = '';
      }
      return { ...prev, purposes, breakdown, vendorIds };
    });
    setErrors((prev) => ({ ...prev, purposes: '', breakdown: '', vendors: '' }));
  };

  const setBreakdown = (purpose: Purpose, value: string) => {
    setForm((prev) => ({ ...prev, breakdown: { ...prev.breakdown, [purpose]: value } }));
    setErrors((prev) => ({ ...prev, breakdown: '' }));
  };

  const setVendor = (purpose: Purpose, vendorId: string) => {
    setForm((prev) => ({ ...prev, vendorIds: { ...prev.vendorIds, [purpose]: vendorId } }));
    setErrors((prev) => ({ ...prev, vendors: '' }));
  };

  useEffect(() => {
    if (form.purposes.length === 1) {
      const only = form.purposes[0];
      setForm((prev) =>
        prev.breakdown[only] === prev.loanAmount
          ? prev
          : { ...prev, breakdown: { ...prev.breakdown, [only]: prev.loanAmount } }
      );
    }
  }, [form.loanAmount, form.purposes]);

  const loanAmountNum = Number(form.loanAmount || 0);
  const breakdownTotal = useMemo(
    () => form.purposes.reduce((acc, p) => acc + Number(form.breakdown[p] || 0), 0),
    [form.purposes, form.breakdown]
  );
  const breakdownDelta = breakdownTotal - loanAmountNum;
  const breakdownMatches =
    form.purposes.length > 0 &&
    Math.round(breakdownTotal) === Math.round(loanAmountNum) &&
    loanAmountNum > 0;

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};

    if (s === 0) {
      if (!form.surname.trim()) e.surname = 'Surname is required';
      if (!form.firstName.trim()) e.firstName = 'First name is required';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
      if (!form.houseAddress.trim()) e.houseAddress = 'House address is required';
      if (!form.lga.trim()) e.lga = 'LGA is required';
      if (!form.state.trim()) e.state = 'State is required';
      if (!/^\+?\d{7,15}$/.test(form.mobileNumber.replace(/\s/g, ''))) e.mobileNumber = 'Enter a valid mobile number';
      if (form.altNumber && !/^\+?\d{7,15}$/.test(form.altNumber.replace(/\s/g, ''))) e.altNumber = 'Enter a valid alternate number';
      if (!/^\d{11}$/.test(form.bvn)) e.bvn = 'BVN must be 11 digits';
      if (!/^\d{11}$/.test(form.nin)) e.nin = 'NIN must be 11 digits';
      if (!form.validId && !isEditMode) e.validId = 'Upload a valid means of ID';
      if (!form.referredBy.trim()) e.referredBy = 'Referred by is required';
      if (!form.referralContact.trim()) e.referralContact = 'Referral contact number is required';
      else if (!/^\+?\d{7,15}$/.test(form.referralContact.replace(/\s/g, '')))
        e.referralContact = 'Enter a valid referral contact';
    }

    if (s === 1) {
      if (!form.employerName.trim()) e.employerName = 'Employer name is required';
      if (!form.officeAddress.trim()) e.officeAddress = 'Office address is required';
      if (!isEditMode) {
        if (!form.offerLetter) e.offerLetter = 'Upload your offer letter';
        if (!form.bankStatement) e.bankStatement = 'Upload your 6-month bank statement';
        if (!form.staffId) e.staffId = 'Upload your staff ID';
      }
    }

    if (s === 2) {
      if (!loanAmountNum || loanAmountNum <= 0) e.loanAmount = 'Enter a loan amount';
      if (form.purposes.length === 0) e.purposes = 'Select at least one purpose';
      if (form.purposes.length > 0) {
        for (const p of form.purposes) {
          const v = Number(form.breakdown[p] || 0);
          if (!v || v <= 0) e.breakdown = `Enter an amount for ${p}`;
        }
        if (!e.breakdown && Math.round(breakdownTotal) !== Math.round(loanAmountNum)) {
          e.breakdown = `Breakdown total (${formatNaira(breakdownTotal)}) must equal loan amount (${formatNaira(
            loanAmountNum
          )})`;
        }
        for (const p of form.purposes) {
          if (!form.vendorIds[p]) {
            e.vendors = `Select a vendor for ${p}`;
            break;
          }
        }
      }
    }

    if (s === 3) {
      if (!form.termsAccepted) e.termsAccepted = 'You must accept the Terms and Conditions';
    }

    return e;
  };

  const goNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const allErrors = [0, 1, 2, 3].reduce<Record<string, string>>(
      (acc, s) => ({ ...acc, ...validateStep(s) }),
      {}
    );
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstStep = [0, 1, 2, 3].find((s) => Object.keys(validateStep(s)).length > 0);
      if (firstStep != null) setStep(firstStep);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('surname', form.surname.trim());
      fd.append('firstName', form.firstName.trim());
      fd.append('middleName', form.middleName.trim());
      fd.append('email', form.email.trim());
      fd.append('houseAddress', form.houseAddress.trim());
      fd.append('lga', form.lga.trim());
      fd.append('state', form.state.trim());
      fd.append('mobileNumber', form.mobileNumber.trim());
      fd.append('altNumber', form.altNumber.trim());
      fd.append('bvn', form.bvn.trim());
      fd.append('nin', form.nin.trim());
      fd.append('referredBy', form.referredBy.trim());
      fd.append('referralContact', form.referralContact.trim());
      fd.append('loanAmount', String(loanAmountNum));
      fd.append('purposes', JSON.stringify(form.purposes));
      fd.append(
        'purposeBreakdown',
        JSON.stringify(
          form.purposes.map((p) => ({ purpose: p, amount: Number(form.breakdown[p] || 0) }))
        )
      );
      fd.append(
        'vendorSelections',
        JSON.stringify(
          form.purposes.map((p) => ({ purpose: p, vendor: form.vendorIds[p] }))
        )
      );
      fd.append('employerName', form.employerName.trim());
      fd.append('officeAddress', form.officeAddress.trim());
      fd.append('termsAccepted', 'true');
      if (form.validId) fd.append('validId', form.validId);
      if (form.offerLetter) fd.append('offerLetter', form.offerLetter);
      if (form.bankStatement) fd.append('bankStatement', form.bankStatement);
      if (form.staffId) fd.append('staffId', form.staffId);

      const result = isEditMode && editId
        ? await applicationsApi.update(editId, fd)
        : await applicationsApi.create(fd);

      emailNotifications.applicationReceived({
        email: result.email,
        firstName: result.firstName,
        loanAmount: result.loanAmount,
        applicationId: result._id,
      });

      try {
        const recipients = await usersApi.notifyRecipients();
        const applicantName = `${result.firstName} ${result.surname}`.trim();
        await Promise.all(
          recipients.map((r) =>
            emailNotifications.applicationReceivedAdmin({
              email: r.email,
              firstName: r.firstName,
              applicantName,
              applicantEmail: result.email,
              loanAmount: result.loanAmount,
              applicationId: result._id,
            })
          )
        );
      } catch {
        /* don't block the user on a notification failure */
      }

      toast.success(
        isEditMode
          ? 'Application resubmitted — we’ll review again.'
          : 'Application submitted — we’ll be in touch.'
      );
      navigate('/applications');
    } catch (err) {
      setSubmitError(extractApiError(err, 'Could not submit application'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode && editLoading) {
    return (
      <div className="container-sm page">
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <span className="spinner dark" />
        </div>
      </div>
    );
  }

  if (isEditMode && editLoadError) {
    return (
      <div className="container-sm page">
        <div className="alert alert-error">{editLoadError}</div>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/applications')}>
          Back to my applications
        </button>
      </div>
    );
  }

  return (
    <div className="container-sm page">
      <div className="page-title" style={{ marginBottom: '1rem' }}>
        <h1>{isEditMode ? 'Edit & resubmit application' : 'Loan application'}</h1>
        <p>
          {isEditMode
            ? 'Update what was flagged in the rejection note and resubmit. Files are kept unless you upload new ones.'
            : 'Fill in the details below. You can move back and forth between sections.'}
        </p>
      </div>

      {!isEditMode && user && (
        <div className="alert alert-info">
          We've pre-filled your name, email, and NIN from your account. Update them here if anything has changed.
        </div>
      )}

      <div className="stepper">
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i === step ? 'active' : ''}`}>
            <span className="step-num">{i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      <form onSubmit={handleSubmit} noValidate className="card">
        {step === 0 && <PersonalStep form={form} update={update} errors={errors} />}
        {step === 1 && <EmploymentStep form={form} update={update} errors={errors} />}
        {step === 2 && (
          <LoanStep
            form={form}
            update={update}
            togglePurpose={togglePurpose}
            setBreakdown={setBreakdown}
            setVendor={setVendor}
            vendors={vendors}
            vendorsLoading={vendorsLoading}
            errors={errors}
            breakdownTotal={breakdownTotal}
            breakdownDelta={breakdownDelta}
            breakdownMatches={breakdownMatches}
            loanAmountNum={loanAmountNum}
          />
        )}
        {step === 3 && (
          <ReviewStep
            form={form}
            update={update}
            errors={errors}
            breakdownTotal={breakdownTotal}
            loanAmountNum={loanAmountNum}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={goBack}
            disabled={step === 0 || submitting}
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Submit application'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

interface StepProps {
  form: ApplyFormState;
  update: <K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => void;
  errors: Record<string, string>;
}

function PersonalStep({ form, update, errors }: StepProps) {
  return (
    <div>
      <div className="section-title">Personal information</div>

      <div className="form-row-3">
        <Field label="Surname" id="surname" error={errors.surname}>
          <input id="surname" value={form.surname} onChange={(e) => update('surname', e.target.value)} aria-invalid={!!errors.surname} />
        </Field>
        <Field label="First name" id="firstName" error={errors.firstName}>
          <input id="firstName" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} aria-invalid={!!errors.firstName} />
        </Field>
        <Field label="Middle name" id="middleName">
          <input id="middleName" value={form.middleName} onChange={(e) => update('middleName', e.target.value)} />
        </Field>
      </div>

      <Field label="Email address" id="email" error={errors.email}>
        <input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} aria-invalid={!!errors.email} />
      </Field>

      <Field label="House address" id="houseAddress" error={errors.houseAddress}>
        <textarea id="houseAddress" value={form.houseAddress} onChange={(e) => update('houseAddress', e.target.value)} aria-invalid={!!errors.houseAddress} />
      </Field>

      <div className="form-row">
        <Field label="LGA" id="lga" error={errors.lga}>
          <input id="lga" value={form.lga} onChange={(e) => update('lga', e.target.value)} aria-invalid={!!errors.lga} />
        </Field>
        <Field label="State" id="state" error={errors.state}>
          <input id="state" value={form.state} onChange={(e) => update('state', e.target.value)} aria-invalid={!!errors.state} />
        </Field>
      </div>

      <div className="form-row">
        <Field label="Mobile number" id="mobileNumber" error={errors.mobileNumber}>
          <input id="mobileNumber" inputMode="tel" value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} aria-invalid={!!errors.mobileNumber} />
        </Field>
        <Field label="Alternate number" id="altNumber" error={errors.altNumber} help="Optional">
          <input id="altNumber" inputMode="tel" value={form.altNumber} onChange={(e) => update('altNumber', e.target.value)} aria-invalid={!!errors.altNumber} />
        </Field>
      </div>

      <div className="form-row">
        <Field label="BVN (11 digits)" id="bvn" error={errors.bvn}>
          <input id="bvn" inputMode="numeric" maxLength={11} value={form.bvn} onChange={(e) => update('bvn', e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.bvn} />
        </Field>
        <Field label="NIN (11 digits)" id="nin" error={errors.nin}>
          <input id="nin" inputMode="numeric" maxLength={11} value={form.nin} onChange={(e) => update('nin', e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.nin} />
        </Field>
      </div>

      <FileUpload
        label="Valid means of ID"
        id="validId"
        file={form.validId}
        onChange={(f) => update('validId', f)}
        error={errors.validId}
        help="NIN slip, Driver's license, International passport, or Voter's card"
      />

      <div className="form-row">
        <Field label="Referred by" id="referredBy" error={errors.referredBy}>
          <input id="referredBy" value={form.referredBy} onChange={(e) => update('referredBy', e.target.value)} aria-invalid={!!errors.referredBy} />
        </Field>
        <Field label="Referral contact number" id="referralContact" error={errors.referralContact}>
          <input id="referralContact" inputMode="tel" value={form.referralContact} onChange={(e) => update('referralContact', e.target.value)} aria-invalid={!!errors.referralContact} />
        </Field>
      </div>
    </div>
  );
}

function EmploymentStep({ form, update, errors }: StepProps) {
  return (
    <div>
      <div className="section-title">Income declaration</div>

      <Field label="Name of employer" id="employerName" error={errors.employerName}>
        <input id="employerName" value={form.employerName} onChange={(e) => update('employerName', e.target.value)} aria-invalid={!!errors.employerName} />
      </Field>

      <Field label="Office address" id="officeAddress" error={errors.officeAddress}>
        <textarea id="officeAddress" value={form.officeAddress} onChange={(e) => update('officeAddress', e.target.value)} aria-invalid={!!errors.officeAddress} />
      </Field>

      <div className="form-row">
        <FileUpload
          label="Offer letter"
          id="offerLetter"
          file={form.offerLetter}
          onChange={(f) => update('offerLetter', f)}
          error={errors.offerLetter}
        />
        <FileUpload
          label="6 months bank statement"
          id="bankStatement"
          file={form.bankStatement}
          onChange={(f) => update('bankStatement', f)}
          error={errors.bankStatement}
        />
      </div>

      <FileUpload
        label="Staff ID"
        id="staffId"
        file={form.staffId}
        onChange={(f) => update('staffId', f)}
        error={errors.staffId}
      />
    </div>
  );
}

interface LoanStepProps extends StepProps {
  togglePurpose: (p: Purpose) => void;
  setBreakdown: (p: Purpose, v: string) => void;
  setVendor: (p: Purpose, vendorId: string) => void;
  vendors: Vendor[];
  vendorsLoading: boolean;
  breakdownTotal: number;
  breakdownDelta: number;
  breakdownMatches: boolean;
  loanAmountNum: number;
}

function LoanStep({
  form,
  update,
  togglePurpose,
  setBreakdown,
  setVendor,
  vendors,
  vendorsLoading,
  errors,
  breakdownTotal,
  breakdownDelta,
  breakdownMatches,
  loanAmountNum,
}: LoanStepProps) {
  const showBreakdown = form.purposes.length > 1;
  const vendorsByCategory = useMemo(() => {
    const map: Record<string, Vendor[]> = { Pharmacy: [], Grocery: [] };
    vendors.filter((v) => v.active).forEach((v) => {
      if (!map[v.category]) map[v.category] = [];
      map[v.category].push(v);
    });
    return map;
  }, [vendors]);

  return (
    <div>
      <div className="section-title">Loan request</div>

      <Field label="Loan amount (₦)" id="loanAmount" error={errors.loanAmount}>
        <input
          id="loanAmount"
          inputMode="numeric"
          value={form.loanAmount}
          onChange={(e) => update('loanAmount', e.target.value.replace(/[^\d.]/g, ''))}
          aria-invalid={!!errors.loanAmount}
          placeholder="e.g. 150000"
        />
      </Field>

      <div className="form-group">
        <label>Purpose</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {PURPOSES.map((p) => {
            const checked = form.purposes.includes(p);
            return (
              <label key={p} className={`checkbox-row ${checked ? 'checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => togglePurpose(p)} />
                <span>{p}</span>
              </label>
            );
          })}
        </div>
        {errors.purposes && <span className="field-error">{errors.purposes}</span>}
      </div>

      {showBreakdown && (
        <div className="form-group">
          <label>How will the {formatNaira(loanAmountNum)} be split?</label>
          <p className="field-help" style={{ margin: '0 0 0.5rem' }}>
            Because you selected more than one purpose, the breakdown must add up to your loan amount.
          </p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {form.purposes.map((p) => (
              <div key={p} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                <span>{p}</span>
                <input
                  inputMode="numeric"
                  value={form.breakdown[p]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setBreakdown(p, e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder={`Amount for ${p}`}
                />
              </div>
            ))}
          </div>

          <div
            className={`summary-bar ${
              loanAmountNum === 0 ? 'warn' : breakdownMatches ? '' : 'error'
            }`}
            style={{ marginTop: '0.75rem' }}
          >
            <span>
              Breakdown total <strong>{formatNaira(breakdownTotal)}</strong> · Loan amount <strong>{formatNaira(loanAmountNum)}</strong>
            </span>
            <span>
              {loanAmountNum === 0
                ? 'Enter a loan amount above'
                : breakdownMatches
                ? '✓ Matches'
                : breakdownDelta > 0
                ? `Over by ${formatNaira(breakdownDelta)}`
                : `Short by ${formatNaira(-breakdownDelta)}`}
            </span>
          </div>

          {errors.breakdown && <span className="field-error">{errors.breakdown}</span>}
        </div>
      )}

      {form.purposes.length === 1 && loanAmountNum > 0 && (
        <div className="alert alert-info">
          The full {formatNaira(loanAmountNum)} will go toward {form.purposes[0]}.
        </div>
      )}

      {form.purposes.length > 0 && (
        <div className="form-group">
          <label>Pick a partner vendor</label>
          <p className="field-help" style={{ margin: '0 0 0.5rem' }}>
            Select where you'll spend the loan. We pay the partner directly.
          </p>
          {vendorsLoading ? (
            <div style={{ padding: '1rem', display: 'grid', placeItems: 'center' }}>
              <span className="spinner dark" />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {form.purposes.map((p) => {
                const category = PURPOSE_TO_CATEGORY[p];
                const list = vendorsByCategory[category] || [];
                return (
                  <div key={p}>
                    <div style={{ marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Vendor for {p} <span style={{ color: 'var(--gf-muted)', fontWeight: 400 }}>({category})</span>
                    </div>
                    {list.length === 0 ? (
                      <div className="alert alert-info" style={{ marginBottom: 0 }}>
                        No active {category.toLowerCase()} partners yet. Contact GroFin support.
                      </div>
                    ) : (
                      <select
                        aria-label={`Vendor for ${p}`}
                        value={form.vendorIds[p]}
                        onChange={(e) => setVendor(p, e.target.value)}
                      >
                        <option value="">Select a {category.toLowerCase()} partner</option>
                        {list.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.businessName} — {v.area} ({v.partnerCode})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {errors.vendors && <span className="field-error">{errors.vendors}</span>}
        </div>
      )}
    </div>
  );
}

interface ReviewStepProps extends StepProps {
  breakdownTotal: number;
  loanAmountNum: number;
}

function ReviewStep({ form, update, errors, breakdownTotal, loanAmountNum }: ReviewStepProps) {
  return (
    <div>
      <div className="section-title">Review & submit</div>

      <ReviewBlock title="Personal">
        <li><strong>Name:</strong> {form.surname} {form.firstName} {form.middleName}</li>
        <li><strong>Email:</strong> {form.email}</li>
        <li><strong>Address:</strong> {form.houseAddress}, {form.lga}, {form.state}</li>
        <li><strong>Mobile:</strong> {form.mobileNumber}{form.altNumber ? ` · Alt: ${form.altNumber}` : ''}</li>
        <li><strong>BVN:</strong> {form.bvn} · <strong>NIN:</strong> {form.nin}</li>
        <li><strong>Valid ID file:</strong> {form.validId?.name || '—'}</li>
        <li><strong>Referred by:</strong> {form.referredBy}{form.referralContact && ` (${form.referralContact})`}</li>
      </ReviewBlock>

      <ReviewBlock title="Employment">
        <li><strong>Employer:</strong> {form.employerName}</li>
        <li><strong>Office:</strong> {form.officeAddress}</li>
        <li><strong>Offer letter:</strong> {form.offerLetter?.name || '—'}</li>
        <li><strong>Bank statement:</strong> {form.bankStatement?.name || '—'}</li>
        <li><strong>Staff ID:</strong> {form.staffId?.name || '—'}</li>
      </ReviewBlock>

      <ReviewBlock title="Loan request">
        <li><strong>Amount:</strong> {formatNaira(loanAmountNum)}</li>
        <li><strong>Purpose:</strong> {form.purposes.join(', ')}</li>
        {form.purposes.length > 1 && (
          <>
            {form.purposes.map((p) => (
              <li key={p}>— {p}: {formatNaira(Number(form.breakdown[p] || 0))}</li>
            ))}
            <li><strong>Breakdown total:</strong> {formatNaira(breakdownTotal)}</li>
          </>
        )}
      </ReviewBlock>

      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label className={`checkbox-row ${form.termsAccepted ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={form.termsAccepted}
            onChange={(e) => update('termsAccepted', e.target.checked)}
          />
          <span>
            I confirm the information is accurate and I accept GroFin's Terms and Conditions.
          </span>
        </label>
        {errors.termsAccepted && <span className="field-error">{errors.termsAccepted}</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  error,
  help,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : help ? <span className="field-help">{help}</span> : null}
    </div>
  );
}

function FileUpload({
  label,
  id,
  file,
  onChange,
  error,
  help,
}: {
  label: string;
  id: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  help?: string;
}) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <label className={`file-drop ${file ? 'has-file' : ''}`}>
        <span className="file-drop-label">{file ? file.name : `Click to upload ${label.toLowerCase()}`}</span>
        <span className="file-drop-meta">
          {file ? `${(file.size / 1024).toFixed(0)} KB` : help || 'PDF, PNG, or JPG · max 5 MB'}
        </span>
        <input
          id={id}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            if (f && f.size > 5 * 1024 * 1024) {
              onChange(null);
              return;
            }
            onChange(f);
          }}
        />
      </label>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginBottom: '0.4rem' }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gf-muted)' }}>{children}</ul>
    </div>
  );
}
