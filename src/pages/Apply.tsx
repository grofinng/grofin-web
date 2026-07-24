import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { applicationsApi } from '../api/applications';
import { vendorsApi } from '../api/vendors';
import { usersApi } from '../api/users';
import { extractApiError } from '../api/client';
import { Bank, EmploymentStatus, PURPOSE_TO_CATEGORY, PURPOSES, Purpose, Vendor, VendorPurpose } from '../types';
import { banksApi } from '../api/banks';
import { totalRepayable } from '../utils/loan';
import { formatNaira } from '../utils/format';
import { emailNotifications } from '../utils/email';
import { geoApi } from '../api/geo';

interface GeoLists {
  countries: string[];
  states: string[];
  cities: string[];
  statesLoading: boolean;
  citiesLoading: boolean;
}

interface ApplyFormState {
  surname: string;
  firstName: string;
  middleName: string;
  email: string;
  houseAddress: string;
  country: string;
  lga: string;
  state: string;
  mobileNumber: string;
  altNumber: string;
  bvn: string;
  nin: string;
  validId: File | null;
  proofOfAddress: File | null;
  loanAmount: string;
  purposes: Purpose[];
  breakdown: Record<Purpose, string>;
  vendorIds: Record<Purpose, string>;
  employmentStatus: EmploymentStatus | '';
  employerName: string;
  officeAddress: string;
  referenceName: string;
  referenceRelationship: string;
  referencePhone: string;
  referenceAddress: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  offerLetter: File | null;
  bankStatement: File | null;
  staffId: File | null;
  termsAccepted: boolean;
}

const STEPS = ['Personal details', 'Loan request', 'Review'] as const;

type AccountStatus = 'idle' | 'verifying' | 'verified' | 'failed' | 'manual';

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
        const breakdown: Record<Purpose, string> = { Groceries: '', Medications: '', Other: '' };
        app.purposeBreakdown.forEach((b) => {
          breakdown[b.purpose] = String(b.amount);
        });
        const vendorIds: Record<Purpose, string> = { Groceries: '', Medications: '', Other: '' };
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
          country: app.country || 'Nigeria',
          lga: app.lga,
          state: app.state,
          mobileNumber: app.mobileNumber,
          altNumber: app.altNumber || '',
          bvn: app.bvn,
          nin: app.nin,
          validId: null,
          proofOfAddress: null,
          loanAmount: String(app.loanAmount),
          purposes: app.purposes,
          breakdown,
          vendorIds,
          employmentStatus: app.employmentStatus || 'employed',
          employerName: app.employerName || '',
          officeAddress: app.officeAddress || '',
          referenceName: app.referenceName || '',
          referenceRelationship: app.referenceRelationship || '',
          referencePhone: app.referencePhone || '',
          referenceAddress: app.referenceAddress || '',
          accountNumber: app.accountNumber || '',
          bankCode: '',
          bankName: app.bankName || '',
          accountName: app.accountName || '',
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
    country: 'Nigeria',
    lga: '',
    state: '',
    mobileNumber: '',
    altNumber: '',
    bvn: '',
    nin: user?.nin || '',
    validId: null,
    proofOfAddress: null,
    loanAmount: '',
    purposes: [],
    breakdown: { Groceries: '', Medications: '', Other: '' },
    vendorIds: { Groceries: '', Medications: '', Other: '' },
    employmentStatus: '',
    employerName: '',
    officeAddress: '',
    referenceName: '',
    referenceRelationship: '',
    referencePhone: '',
    referenceAddress: '',
    accountNumber: '',
    bankCode: '',
    bankName: '',
    accountName: '',
    offerLetter: null,
    bankStatement: null,
    staffId: null,
    termsAccepted: false,
  });

  // Country → state → city/LGA lists come from the CountriesNow API (cached in
  // src/api/geo.ts, with a bundled Nigeria fallback when the API is down).
  const [countries, setCountries] = useState<string[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    geoApi
      .countries()
      .then((list) => !cancelled && setCountries(list))
      .catch(() => !cancelled && setCountries(['Nigeria']));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.country) {
      setStatesList([]);
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    geoApi
      .states(form.country)
      .then((list) => !cancelled && setStatesList(list))
      .catch(() => !cancelled && setStatesList([]))
      .finally(() => !cancelled && setStatesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [form.country]);

  useEffect(() => {
    if (!form.country || !form.state) {
      setCitiesList([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    geoApi
      .cities(form.country, form.state)
      .then((list) => !cancelled && setCitiesList(list))
      .catch(() => !cancelled && setCitiesList([]))
      .finally(() => !cancelled && setCitiesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [form.country, form.state]);

  // Bank list + account verification (only needed when purpose 'Other' is chosen).
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('idle');

  const wantsOther = form.purposes.includes('Other');

  useEffect(() => {
    if (!wantsOther || banks.length > 0) return;
    let cancelled = false;
    setBanksLoading(true);
    banksApi
      .list()
      .then((list) => !cancelled && setBanks(list))
      .catch(() => {})
      .finally(() => !cancelled && setBanksLoading(false));
    return () => {
      cancelled = true;
    };
  }, [wantsOther, banks.length]);

  useEffect(() => {
    if (!wantsOther) return;
    if (!/^\d{10}$/.test(form.accountNumber) || !form.bankCode) {
      setAccountStatus('idle');
      return;
    }
    let cancelled = false;
    setAccountStatus('verifying');
    banksApi
      .resolve(form.accountNumber, form.bankCode)
      .then((name) => {
        if (cancelled) return;
        setAccountStatus('verified');
        setForm((prev) => ({ ...prev, accountName: name }));
        setErrors((prev) => ({ ...prev, accountName: '', accountNumber: '' }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        // 503 = no verification key configured server-side → let them type it in.
        setAccountStatus(status === 503 ? 'manual' : 'failed');
      });
    return () => {
      cancelled = true;
    };
  }, [wantsOther, form.accountNumber, form.bankCode]);

  // Warn before losing a half-completed application: browser close/refresh via
  // beforeunload, in-app navigation via a capture-phase interceptor on links
  // (BrowserRouter has no useBlocker support).
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const message = 'You have an unfinished loan application. Leave this page? Your progress will be lost.';
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank') return;
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onLinkClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onLinkClick, true);
    };
  }, [dirty]);

  const update = <K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setDirty(true);
  };

  const togglePurpose = (purpose: Purpose) => {
    setForm((prev) => {
      const exists = prev.purposes.includes(purpose);
      // 'Other' is exclusive: selecting it clears the rest, and selecting
      // anything else clears 'Other'.
      let purposes: Purpose[];
      if (exists) {
        purposes = prev.purposes.filter((p) => p !== purpose);
      } else if (purpose === 'Other') {
        purposes = ['Other'];
      } else {
        purposes = [...prev.purposes.filter((p) => p !== 'Other'), purpose];
      }
      const breakdown = { ...prev.breakdown };
      const vendorIds = { ...prev.vendorIds };
      (Object.keys(breakdown) as Purpose[]).forEach((p) => {
        if (!purposes.includes(p)) {
          breakdown[p] = '';
          vendorIds[p] = '';
        }
      });
      if (purposes.length === 1) {
        breakdown[purposes[0]] = prev.loanAmount || '';
      }
      return { ...prev, purposes, breakdown, vendorIds };
    });
    setErrors((prev) => ({ ...prev, purposes: '', breakdown: '', vendors: '' }));
    setDirty(true);
  };

  const setBreakdown = (purpose: Purpose, value: string) => {
    setForm((prev) => ({ ...prev, breakdown: { ...prev.breakdown, [purpose]: value } }));
    setErrors((prev) => ({ ...prev, breakdown: '' }));
    setDirty(true);
  };

  const setVendor = (purpose: Purpose, vendorId: string) => {
    setForm((prev) => ({ ...prev, vendorIds: { ...prev.vendorIds, [purpose]: vendorId } }));
    setErrors((prev) => ({ ...prev, vendors: '' }));
    setDirty(true);
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
      if (!form.country.trim()) e.country = 'Select your country';
      if (!form.state.trim()) e.state = 'Select your state';
      else if (statesList.length > 0 && !statesList.includes(form.state))
        e.state = 'Select a state from the list';
      if (!form.lga.trim()) e.lga = 'Select your city / LGA';
      else if (citiesList.length > 0 && !citiesList.includes(form.lga))
        e.lga = 'Select a city / LGA in the chosen state';
      if (!/^\+?\d{7,15}$/.test(form.mobileNumber.replace(/\s/g, ''))) e.mobileNumber = 'Enter a valid mobile number';
      if (form.altNumber && !/^\+?\d{7,15}$/.test(form.altNumber.replace(/\s/g, ''))) e.altNumber = 'Enter a valid alternate number';
      if (!/^\d{11}$/.test(form.bvn)) e.bvn = 'BVN must be 11 digits';
      if (!/^\d{11}$/.test(form.nin)) e.nin = 'NIN must be 11 digits';
      if (!form.validId && !isEditMode) e.validId = 'Upload a valid means of ID';
      if (!form.proofOfAddress && !isEditMode)
        e.proofOfAddress = 'Upload a proof of address so we can verify the address above';
      if (!form.employmentStatus) {
        e.employmentStatus = 'Select your employment status';
      } else if (form.employmentStatus === 'employed') {
        if (!form.employerName.trim()) e.employerName = 'Employer name is required';
        if (!form.officeAddress.trim()) e.officeAddress = 'Office address is required';
        if (!isEditMode) {
          if (!form.offerLetter) e.offerLetter = 'Upload your offer letter';
          if (!form.bankStatement) e.bankStatement = 'Upload your 6-month bank statement';
          if (!form.staffId) e.staffId = 'Upload your staff ID';
        }
      } else {
        if (!form.referenceName.trim()) e.referenceName = "Your reference's full name is required";
        if (!form.referenceRelationship.trim())
          e.referenceRelationship = 'State your relationship with the reference';
        if (!form.referencePhone.trim()) e.referencePhone = "Your reference's phone number is required";
        else if (!/^\+?\d{7,15}$/.test(form.referencePhone.replace(/\s/g, '')))
          e.referencePhone = 'Enter a valid phone number';
        if (!form.referenceAddress.trim()) e.referenceAddress = "Your reference's address is required";
      }
    }

    if (s === 1) {
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
          if (p !== 'Other' && !form.vendorIds[p]) {
            e.vendors = `Select a vendor for ${p}`;
            break;
          }
        }
      }
      if (form.purposes.includes('Other')) {
        if (!/^\d{10}$/.test(form.accountNumber)) e.accountNumber = 'Account number must be 10 digits';
        if (!form.bankName) e.bankName = 'Select your bank';
        if (!form.accountName.trim()) e.accountName = 'Account name is required';
        if (accountStatus === 'failed')
          e.accountNumber = 'We could not verify this account — check the number and bank';
      }
    }

    if (s === 2) {
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
    // Implicit submissions before the review step (Enter key, or the browser
    // treating a re-rendered Continue button as submit) advance instead.
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    setSubmitError(null);

    const allErrors = [0, 1, 2].reduce<Record<string, string>>(
      (acc, s) => ({ ...acc, ...validateStep(s) }),
      {}
    );
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstStep = [0, 1, 2].find((s) => Object.keys(validateStep(s)).length > 0);
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
      fd.append('country', form.country.trim());
      fd.append('lga', form.lga.trim());
      fd.append('state', form.state.trim());
      fd.append('mobileNumber', form.mobileNumber.trim());
      fd.append('altNumber', form.altNumber.trim());
      fd.append('bvn', form.bvn.trim());
      fd.append('nin', form.nin.trim());
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
      const isEmployed = form.employmentStatus === 'employed';
      fd.append('employmentStatus', form.employmentStatus || 'employed');
      fd.append('employerName', isEmployed ? form.employerName.trim() : '');
      fd.append('officeAddress', isEmployed ? form.officeAddress.trim() : '');
      fd.append('referenceName', !isEmployed ? form.referenceName.trim() : '');
      fd.append('referenceRelationship', !isEmployed ? form.referenceRelationship.trim() : '');
      fd.append('referencePhone', !isEmployed ? form.referencePhone.trim() : '');
      fd.append('referenceAddress', !isEmployed ? form.referenceAddress.trim() : '');
      const payoutNeeded = form.purposes.includes('Other');
      fd.append('accountNumber', payoutNeeded ? form.accountNumber.trim() : '');
      fd.append('bankName', payoutNeeded ? form.bankName.trim() : '');
      fd.append('accountName', payoutNeeded ? form.accountName.trim() : '');
      fd.append('termsAccepted', 'true');
      if (form.validId) fd.append('validId', form.validId);
      if (form.proofOfAddress) fd.append('proofOfAddress', form.proofOfAddress);
      if (isEmployed) {
        if (form.offerLetter) fd.append('offerLetter', form.offerLetter);
        if (form.bankStatement) fd.append('bankStatement', form.bankStatement);
        if (form.staffId) fd.append('staffId', form.staffId);
      }

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
      setDirty(false);
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
          We've pre-filled your name and email from your account. Update them here if anything has changed.
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
        {step < STEPS.length - 1 && (
          <p className="form-required-hint">
            Fields marked <span className="req-star">*</span> are required.
          </p>
        )}
        {step === 0 && (
          <>
            <PersonalStep
              form={form}
              update={update}
              errors={errors}
              geo={{ countries, states: statesList, cities: citiesList, statesLoading, citiesLoading }}
            />
            <EmploymentStep form={form} update={update} errors={errors} />
          </>
        )}
        {step === 1 && (
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
            banks={banks}
            banksLoading={banksLoading}
            accountStatus={accountStatus}
          />
        )}
        {step === 2 && (
          <ReviewStep
            form={form}
            update={update}
            errors={errors}
            breakdownTotal={breakdownTotal}
            loanAmountNum={loanAmountNum}
            vendors={vendors}
            isEditMode={isEditMode}
            onEdit={(s) => {
              setStep(s);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
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
            <button key="continue" type="button" className="btn" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button key="submit" type="submit" className="btn" disabled={submitting}>
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

function PersonalStep({ form, update, errors, geo }: StepProps & { geo: GeoLists }) {
  const stateListReady = geo.states.length > 0;
  const cityListReady = geo.cities.length > 0;
  return (
    <div>
      <div className="section-title">Personal information</div>

      <div className="form-row-3">
        <Field label="Surname" id="surname" error={errors.surname} required>
          <input id="surname" value={form.surname} onChange={(e) => update('surname', e.target.value)} aria-invalid={!!errors.surname} />
        </Field>
        <Field label="First name" id="firstName" error={errors.firstName} required>
          <input id="firstName" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} aria-invalid={!!errors.firstName} />
        </Field>
        <Field label="Middle name" id="middleName" help="Optional">
          <input id="middleName" value={form.middleName} onChange={(e) => update('middleName', e.target.value)} />
        </Field>
      </div>

      <Field label="Email address" id="email" error={errors.email} required>
        <input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} aria-invalid={!!errors.email} />
      </Field>

      <Field label="House address" id="houseAddress" error={errors.houseAddress} required>
        <textarea id="houseAddress" value={form.houseAddress} onChange={(e) => update('houseAddress', e.target.value)} aria-invalid={!!errors.houseAddress} />
      </Field>

      <div className="form-row-3">
        <Field label="Country" id="country" error={errors.country} required>
          <select
            id="country"
            value={form.country}
            onChange={(e) => {
              update('country', e.target.value);
              update('state', '');
              update('lga', '');
            }}
            aria-invalid={!!errors.country}
          >
            {geo.countries.length === 0 && <option value={form.country}>{form.country}</option>}
            {geo.countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="State" id="state" error={errors.state} required>
          {stateListReady || geo.statesLoading ? (
            <select
              id="state"
              value={form.state}
              onChange={(e) => {
                update('state', e.target.value);
                update('lga', '');
              }}
              disabled={geo.statesLoading}
              aria-invalid={!!errors.state}
            >
              <option value="">{geo.statesLoading ? 'Loading states…' : 'Select a state'}</option>
              {geo.states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <input
              id="state"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="Type your state"
              aria-invalid={!!errors.state}
            />
          )}
        </Field>
        <Field label="City / LGA" id="lga" error={errors.lga} required>
          {!form.state || cityListReady || geo.citiesLoading ? (
            <select
              id="lga"
              value={form.lga}
              onChange={(e) => update('lga', e.target.value)}
              disabled={!form.state || geo.citiesLoading}
              aria-invalid={!!errors.lga}
            >
              <option value="">
                {!form.state
                  ? 'Select a state first'
                  : geo.citiesLoading
                  ? 'Loading…'
                  : 'Select a city / LGA'}
              </option>
              {geo.cities.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          ) : (
            <input
              id="lga"
              value={form.lga}
              onChange={(e) => update('lga', e.target.value)}
              placeholder="Type your city / LGA"
              aria-invalid={!!errors.lga}
            />
          )}
        </Field>
      </div>

      <div className="form-row">
        <Field label="Mobile number" id="mobileNumber" error={errors.mobileNumber} required>
          <input id="mobileNumber" inputMode="tel" value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} aria-invalid={!!errors.mobileNumber} />
        </Field>
        <Field label="Alternate number" id="altNumber" error={errors.altNumber} help="Optional">
          <input id="altNumber" inputMode="tel" value={form.altNumber} onChange={(e) => update('altNumber', e.target.value)} aria-invalid={!!errors.altNumber} />
        </Field>
      </div>

      <FileUpload
        label="Proof of address"
        id="proofOfAddress"
        file={form.proofOfAddress}
        onChange={(f) => update('proofOfAddress', f)}
        error={errors.proofOfAddress}
        help="Recent utility bill, bank statement, or tenancy agreement showing the address above"
        required
      />

      <div className="section-title" style={{ marginTop: '1rem' }}>Identity verification</div>

      <div className="form-row">
        <Field label="BVN (11 digits)" id="bvn" error={errors.bvn} required>
          <input id="bvn" inputMode="numeric" maxLength={11} value={form.bvn} onChange={(e) => update('bvn', e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.bvn} />
        </Field>
        <Field label="NIN (11 digits)" id="nin" error={errors.nin} help="We use this to verify your identity" required>
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
        required
      />
    </div>
  );
}

function EmploymentStep({ form, update, errors }: StepProps) {
  return (
    <div>
      <div className="section-title" style={{ marginTop: '1.5rem' }}>Income declaration</div>

      <div className="form-group">
        <label>
          Are you currently working?<span className="req-star" aria-hidden="true"> *</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <label className={`checkbox-row ${form.employmentStatus === 'employed' ? 'checked' : ''}`}>
            <input
              type="radio"
              name="employmentStatus"
              checked={form.employmentStatus === 'employed'}
              onChange={() => update('employmentStatus', 'employed')}
            />
            <span>Yes, I'm employed</span>
          </label>
          <label className={`checkbox-row ${form.employmentStatus === 'not-working' ? 'checked' : ''}`}>
            <input
              type="radio"
              name="employmentStatus"
              checked={form.employmentStatus === 'not-working'}
              onChange={() => update('employmentStatus', 'not-working')}
            />
            <span>No, not currently working</span>
          </label>
        </div>
        {errors.employmentStatus && <span className="field-error">{errors.employmentStatus}</span>}
      </div>

      {form.employmentStatus === 'employed' && (
        <>
          <Field label="Name of employer" id="employerName" error={errors.employerName} required>
            <input id="employerName" value={form.employerName} onChange={(e) => update('employerName', e.target.value)} aria-invalid={!!errors.employerName} />
          </Field>

          <Field label="Office address" id="officeAddress" error={errors.officeAddress} required>
            <textarea id="officeAddress" value={form.officeAddress} onChange={(e) => update('officeAddress', e.target.value)} aria-invalid={!!errors.officeAddress} />
          </Field>

          <div className="form-row">
            <FileUpload
              label="Offer letter"
              id="offerLetter"
              file={form.offerLetter}
              onChange={(f) => update('offerLetter', f)}
              error={errors.offerLetter}
              required
            />
            <FileUpload
              label="6 months bank statement"
              id="bankStatement"
              file={form.bankStatement}
              onChange={(f) => update('bankStatement', f)}
              error={errors.bankStatement}
              required
            />
          </div>

          <FileUpload
            label="Staff ID"
            id="staffId"
            file={form.staffId}
            onChange={(f) => update('staffId', f)}
            error={errors.staffId}
            required
          />
        </>
      )}

      {form.employmentStatus === 'not-working' && (
        <>
          <div className="alert alert-info">
            Since you're not currently working, provide a valid reference — someone who can vouch
            for you and stand behind your loan request. We'll contact them to confirm.
          </div>

          <Field label="Reference full name" id="referenceName" error={errors.referenceName} required>
            <input id="referenceName" value={form.referenceName} onChange={(e) => update('referenceName', e.target.value)} aria-invalid={!!errors.referenceName} />
          </Field>

          <div className="form-row">
            <Field label="Relationship to you" id="referenceRelationship" error={errors.referenceRelationship} help="e.g. Parent, Sibling, Employer of spouse, Community leader" required>
              <input id="referenceRelationship" value={form.referenceRelationship} onChange={(e) => update('referenceRelationship', e.target.value)} aria-invalid={!!errors.referenceRelationship} />
            </Field>
            <Field label="Reference phone number" id="referencePhone" error={errors.referencePhone} required>
              <input id="referencePhone" inputMode="tel" value={form.referencePhone} onChange={(e) => update('referencePhone', e.target.value)} aria-invalid={!!errors.referencePhone} />
            </Field>
          </div>

          <Field label="Reference address" id="referenceAddress" error={errors.referenceAddress} required>
            <textarea id="referenceAddress" value={form.referenceAddress} onChange={(e) => update('referenceAddress', e.target.value)} aria-invalid={!!errors.referenceAddress} />
          </Field>
        </>
      )}
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
  banks: Bank[];
  banksLoading: boolean;
  accountStatus: AccountStatus;
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
  banks,
  banksLoading,
  accountStatus,
}: LoanStepProps) {
  const showBreakdown = form.purposes.length > 1;
  const vendorPurposes = form.purposes.filter((p): p is VendorPurpose => p !== 'Other');
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

      <Field label="Loan amount (₦)" id="loanAmount" error={errors.loanAmount} required>
        <input
          id="loanAmount"
          inputMode="numeric"
          value={form.loanAmount}
          onChange={(e) => update('loanAmount', e.target.value.replace(/[^\d.]/g, ''))}
          aria-invalid={!!errors.loanAmount}
          placeholder="e.g. 150000"
        />
      </Field>

      {loanAmountNum > 0 && (
        <div className="summary-bar" style={{ marginBottom: '1rem' }}>
          <span>
            Borrowing <strong>{formatNaira(loanAmountNum)}</strong>
          </span>
          <span>
            Total to repay <strong>{formatNaira(totalRepayable(loanAmountNum))}</strong>
          </span>
        </div>
      )}

      <div className="form-group">
        <label>
          Purpose<span className="req-star" aria-hidden="true"> *</span>
        </label>
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

      {vendorPurposes.length > 0 && (
        <div className="form-group">
          <label>
            Pick a partner vendor<span className="req-star" aria-hidden="true"> *</span>
          </label>
          <p className="field-help" style={{ margin: '0 0 0.5rem' }}>
            Select where you'll spend the loan. We pay the partner directly.
          </p>
          {vendorsLoading ? (
            <div style={{ padding: '1rem', display: 'grid', placeItems: 'center' }}>
              <span className="spinner dark" />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {vendorPurposes.map((p) => {
                const category = PURPOSE_TO_CATEGORY[p];
                const list = vendorsByCategory[category] || [];
                return (
                  <div key={p}>
                    <div style={{ marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      {p === 'Medications' ? 'Select Pharmacy' : 'Select Vendor'}{' '}
                      <span style={{ color: 'var(--gf-muted)', fontWeight: 400 }}>({p})</span>
                    </div>
                    {list.length === 0 ? (
                      <div className="alert alert-info" style={{ marginBottom: 0 }}>
                        No active {category.toLowerCase()} partners yet. Contact Esena Africa support.
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

      {form.purposes.includes('Other') && (
        <>
          <div className="alert alert-info">
            For other essentials we pay the approved amount directly to your bank account. Enter
            your account details below — we'll verify them with your bank.
          </div>

          <div className="form-row">
            <Field label="Account number (10 digits)" id="accountNumber" error={errors.accountNumber} required>
              <input
                id="accountNumber"
                inputMode="numeric"
                maxLength={10}
                value={form.accountNumber}
                onChange={(e) => {
                  update('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (form.accountName) update('accountName', '');
                }}
                aria-invalid={!!errors.accountNumber}
              />
            </Field>
            <Field label="Bank" id="bankCode" error={errors.bankName} required>
              <select
                id="bankCode"
                value={form.bankCode}
                onChange={(e) => {
                  const bank = banks.find((b) => b.code === e.target.value);
                  update('bankCode', e.target.value);
                  update('bankName', bank?.name || '');
                  if (form.accountName) update('accountName', '');
                }}
                disabled={banksLoading}
                aria-invalid={!!errors.bankName}
              >
                <option value="">{banksLoading ? 'Loading banks…' : 'Select your bank'}</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
                {banks.length === 0 && !banksLoading && form.bankName && (
                  <option value={form.bankCode}>{form.bankName}</option>
                )}
              </select>
            </Field>
          </div>

          <Field
            label="Account name"
            id="accountName"
            error={errors.accountName}
            required
            help={
              accountStatus === 'verifying'
                ? 'Verifying account…'
                : accountStatus === 'verified'
                ? '✓ Verified with your bank'
                : accountStatus === 'manual'
                ? 'Automatic verification is unavailable — type the account name exactly as your bank has it'
                : accountStatus === 'failed'
                ? undefined
                : 'Auto-filled once your account number and bank are verified'
            }
          >
            <input
              id="accountName"
              value={form.accountName}
              readOnly={accountStatus === 'verified' || accountStatus === 'verifying'}
              onChange={(e) => update('accountName', e.target.value)}
              aria-invalid={!!errors.accountName}
              placeholder={accountStatus === 'verifying' ? 'Verifying…' : ''}
            />
          </Field>
        </>
      )}
    </div>
  );
}

interface ReviewStepProps extends StepProps {
  breakdownTotal: number;
  loanAmountNum: number;
  vendors: Vendor[];
  isEditMode: boolean;
  onEdit: (step: number) => void;
}

function ReviewStep({
  form,
  update,
  errors,
  breakdownTotal,
  loanAmountNum,
  vendors,
  isEditMode,
  onEdit,
}: ReviewStepProps) {
  const vendorName = (p: Purpose) => {
    const v = vendors.find((x) => x._id === form.vendorIds[p]);
    return v ? `${v.businessName} — ${v.area} (${v.partnerCode})` : '—';
  };
  const vendorPurposes = form.purposes.filter((p) => p !== 'Other');
  const missingFileNote = isEditMode ? 'Keeping previously uploaded file' : 'Not uploaded';

  return (
    <div>
      <div className="section-title">Review & submit</div>
      <p className="review-intro">
        Almost done — confirm everything below is correct. Use <strong>Edit</strong> to jump back
        to a section.
      </p>

      <div className="review-grid">
        <ReviewCard title="Personal" onEdit={() => onEdit(0)}>
          <ReviewRow label="Full name" value={[form.surname, form.firstName, form.middleName].filter(Boolean).join(' ')} />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Address" value={[form.houseAddress, form.lga, form.state, form.country].filter(Boolean).join(', ')} />
          <ReviewRow label="Mobile" value={`${form.mobileNumber}${form.altNumber ? ` · Alt: ${form.altNumber}` : ''}`} />
          <ReviewRow label="BVN" value={form.bvn} />
          <ReviewRow label="NIN" value={form.nin} />
          <div className="review-files">
            <FileChip label="Valid ID" name={form.validId?.name} fallback={missingFileNote} />
            <FileChip label="Proof of address" name={form.proofOfAddress?.name} fallback={missingFileNote} />
          </div>
        </ReviewCard>

        <ReviewCard title="Employment" onEdit={() => onEdit(0)}>
          <ReviewRow
            label="Status"
            value={form.employmentStatus === 'not-working' ? 'Not currently working' : 'Employed'}
          />
          {form.employmentStatus === 'not-working' ? (
            <>
              <ReviewRow label="Loan reference" value={`${form.referenceName}${form.referenceRelationship ? ` (${form.referenceRelationship})` : ''}`} />
              <ReviewRow label="Reference phone" value={form.referencePhone} />
              <ReviewRow label="Reference address" value={form.referenceAddress} />
            </>
          ) : (
            <>
              <ReviewRow label="Employer" value={form.employerName} />
              <ReviewRow label="Office address" value={form.officeAddress} />
              <div className="review-files">
                <FileChip label="Offer letter" name={form.offerLetter?.name} fallback={missingFileNote} />
                <FileChip label="Bank statement" name={form.bankStatement?.name} fallback={missingFileNote} />
                <FileChip label="Staff ID" name={form.staffId?.name} fallback={missingFileNote} />
              </div>
            </>
          )}
        </ReviewCard>

        <ReviewCard title="Loan request" onEdit={() => onEdit(1)}>
          <ReviewRow label="Amount borrowed" value={formatNaira(loanAmountNum)} />
          <ReviewRow label="Total to repay" value={formatNaira(totalRepayable(loanAmountNum))} emphasis />
          <ReviewRow label="Purpose" value={form.purposes.join(', ')} />
          {form.purposes.length > 1 && (
            <>
              {form.purposes.map((p) => (
                <ReviewRow key={p} label={`Amount for ${p}`} value={formatNaira(Number(form.breakdown[p] || 0))} />
              ))}
              <ReviewRow label="Breakdown total" value={formatNaira(breakdownTotal)} />
            </>
          )}
          {vendorPurposes.map((p) => (
            <ReviewRow key={`vendor-${p}`} label={`Vendor · ${p}`} value={vendorName(p)} />
          ))}
          {form.purposes.includes('Other') && (
            <>
              <ReviewRow label="Bank" value={form.bankName} />
              <ReviewRow label="Account number" value={form.accountNumber} />
              <ReviewRow label="Account name" value={form.accountName} />
            </>
          )}
        </ReviewCard>
      </div>

      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label className={`checkbox-row ${form.termsAccepted ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={form.termsAccepted}
            onChange={(e) => update('termsAccepted', e.target.checked)}
          />
          <span>
            I confirm the information is accurate and I have read, understood and agree to Esena
            Africa's{' '}
            <Link to="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</Link>.
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
  required,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
        {required && <span className="req-star" aria-hidden="true"> *</span>}
      </label>
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
  required,
}: {
  label: string;
  id: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  help?: string;
  required?: boolean;
}) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
        {required && <span className="req-star" aria-hidden="true"> *</span>}
      </label>
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

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="review-card">
      <div className="review-card-head">
        <h3>{title}</h3>
        <button type="button" className="review-edit-btn" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="review-rows">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="review-row">
      <span className="review-row-label">{label}</span>
      <span className={`review-row-value${emphasis ? ' emphasis' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function FileChip({ label, name, fallback }: { label: string; name?: string; fallback: string }) {
  return (
    <span className={`file-chip ${name ? '' : 'missing'}`}>
      <span className="file-chip-label">{label}</span>
      {name || fallback}
    </span>
  );
}
