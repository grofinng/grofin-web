import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { applicationsApi } from '../api/applications';
import { vendorsApi } from '../api/vendors';
import { usersApi } from '../api/users';
import { extractApiError } from '../api/client';
import { Application, Bank, EmploymentStatus, PURPOSE_TO_CATEGORY, PURPOSES, Purpose, Vendor, VendorPurpose } from '../types';
import { banksApi } from '../api/banks';
import { totalRepayable } from '../utils/loan';
import { compressImageFile } from '../utils/compressImage';
import { formatDate, formatNaira } from '../utils/format';
import { emailNotifications } from '../utils/email';
import { CountryOption, geoApi } from '../api/geo';
import { AsYouType, CountryCode, isValidPhoneNumber } from 'libphonenumber-js';

// Vercel serverless functions reject request bodies over ~4.5 MB with a 413,
// so keep the combined upload comfortably under that.
const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MB = 1024 * 1024;

type FileField = 'validId' | 'proofOfAddress' | 'offerLetter' | 'bankStatement' | 'staffId';
const FILE_FIELDS: FileField[] = ['validId', 'proofOfAddress', 'offerLetter', 'bankStatement', 'staffId'];

// Draft autosave: everything except files survives a reload.
const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

interface GeoLists {
  countries: CountryOption[];
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

type StepKey = 'personal' | 'purpose' | 'records' | 'loan' | 'account' | 'review';

const STEP_LABELS: Record<StepKey, string> = {
  personal: 'Personal details',
  purpose: 'What you need',
  records: 'Your records',
  loan: 'Loan details',
  account: 'Receiving account',
  review: 'Review',
};

// First-time applicants fill in everything; returning customers confirm what
// we already hold and only add what changed.
const STANDARD_STEPS: StepKey[] = ['personal', 'loan', 'review'];

const EMPTY_BY_PURPOSE: Record<Purpose, string> = { Groceries: '', Medications: '', Other: '' };

const FILE_LABELS: Record<FileField, string> = {
  validId: 'Valid ID',
  proofOfAddress: 'Proof of address',
  offerLetter: 'Offer letter',
  bankStatement: 'Bank statement',
  staffId: 'Staff ID',
};

/** Maps a saved application onto the form. Files can't be restored — they stay on the server. */
function formFromApplication(app: Application, base: ApplyFormState): ApplyFormState {
  const breakdown: Record<Purpose, string> = { ...EMPTY_BY_PURPOSE };
  app.purposeBreakdown.forEach((b) => {
    breakdown[b.purpose] = String(b.amount);
  });
  const vendorIds: Record<Purpose, string> = { ...EMPTY_BY_PURPOSE };
  app.vendorSelections.forEach((sel) => {
    vendorIds[sel.purpose] =
      typeof sel.vendor === 'object' ? (sel.vendor as Vendor)._id : (sel.vendor as string);
  });
  return {
    ...base,
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
  };
}

/** Returning customers start from their saved records with a fresh loan request. */
function returningForm(app: Application, base: ApplyFormState): ApplyFormState {
  return {
    ...formFromApplication(app, base),
    purposes: [],
    breakdown: { ...EMPTY_BY_PURPOSE },
    vendorIds: { ...EMPTY_BY_PURPOSE },
    termsAccepted: false,
  };
}

const hasSavedAccount = (app: Application | null) =>
  !!app && /^\d{10}$/.test(app.accountNumber || '') && !!app.bankName && !!app.accountName;

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

  // The application we pre-fill from: the one being edited, or a returning
  // customer's most recent one.
  const [sourceApp, setSourceApp] = useState<Application | null>(null);
  const [returning, setReturning] = useState(false);
  const [previousLoading, setPreviousLoading] = useState(!isEditMode && !!user);
  const [recordsView, setRecordsView] = useState<'summary' | 'edit'>('summary');
  const [accountView, setAccountView] = useState<'keep' | 'change'>('keep');

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
        setSourceApp(app);
        setForm((prev) => formFromApplication(app, prev));
      })
      .catch((err) => !cancelled && setEditLoadError(extractApiError(err, 'Could not load application')))
      .finally(() => !cancelled && setEditLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const freshForm = (): ApplyFormState => ({
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

  const [form, setForm] = useState<ApplyFormState>(freshForm);

  // Country → state → city/LGA lists come from the CountriesNow API (cached in
  // src/api/geo.ts, with a bundled Nigeria fallback when the API is down).
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    geoApi
      .countries()
      .then((list) => !cancelled && setCountries(list))
      .catch(() => !cancelled && setCountries([{ name: 'Nigeria', iso2: 'NG' }]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Phone validation & as-you-type formatting follow the selected country.
  const countryIso = (countries.find((c) => c.name === form.country)?.iso2 || 'NG') as CountryCode;
  const formatPhone = (next: string, prev: string) => {
    // Re-formatting while deleting traps the cursor on punctuation — skip it.
    if (next.length < prev.length) return next;
    return new AsYouType(countryIso).input(next);
  };
  const validPhone = (value: string) => isValidPhoneNumber(value, countryIso);

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
        // Verification is best-effort: whether it's unavailable (503) or the
        // lookup failed (422), the applicant can type the account name manually.
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

  // --- Draft autosave: a reload no longer wipes the form. Files can't be
  // serialized, so they are the one thing the applicant must re-attach.
  const draftKey = user && !isEditMode ? `esena_apply_draft_${user.id}` : null;
  const [draftRestored, setDraftRestored] = useState(false);
  const draftRestoredRef = useRef(false);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { v: number; savedAt: number; fields: Partial<ApplyFormState> };
      if (draft.v !== DRAFT_VERSION || Date.now() - (draft.savedAt || 0) > DRAFT_MAX_AGE_MS) {
        localStorage.removeItem(draftKey);
        return;
      }
      setForm((prev) => ({
        ...prev,
        ...draft.fields,
        validId: null,
        proofOfAddress: null,
        offerLetter: null,
        bankStatement: null,
        staffId: null,
        termsAccepted: false,
      }));
      setDraftRestored(true);
      draftRestoredRef.current = true;
      setDirty(true);
    } catch {
      /* corrupted draft — start clean */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftKey || !dirty) return;
    const timer = window.setTimeout(() => {
      const { validId, proofOfAddress, offerLetter, bankStatement, staffId, termsAccepted, ...fields } = form;
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ v: DRAFT_VERSION, savedAt: Date.now(), fields })
        );
      } catch {
        /* storage full — drafts are best-effort */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form, dirty, draftKey]);

  const discardDraft = () => {
    if (draftKey) localStorage.removeItem(draftKey);
    setForm(returning && sourceApp ? returningForm(sourceApp, freshForm()) : freshForm());
    setErrors({});
    setStep(0);
    setDraftRestored(false);
    setDirty(false);
  };
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

  // Returning customer: pull their most recent application so they only
  // confirm what we hold instead of typing it all again.
  useEffect(() => {
    if (isEditMode || !user) return;
    let cancelled = false;
    setPreviousLoading(true);
    applicationsApi
      .list()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        const latest = list[0];
        setSourceApp(latest);
        setReturning(true);
        setAccountView(hasSavedAccount(latest) ? 'keep' : 'change');
        if (!draftRestoredRef.current) {
          setForm((prev) => returningForm(latest, prev));
        }
      })
      .catch(() => {
        /* fall back to the full form */
      })
      .finally(() => !cancelled && setPreviousLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isEditMode, user]);

  const steps = useMemo<StepKey[]>(() => {
    if (isEditMode || !returning) return STANDARD_STEPS;
    return ['purpose', 'records', 'loan', ...(wantsOther ? (['account'] as StepKey[]) : []), 'review'];
  }, [isEditMode, returning, wantsOther]);
  const stepKey: StepKey = steps[Math.min(step, steps.length - 1)];

  // Which documents on file can be reused, and which must be refreshed because
  // what they verify has changed. Mirrors the server-side rule.
  const norm = (v?: string) => (v || '').trim().toLowerCase();
  const addressChanged =
    returning &&
    !!sourceApp &&
    (norm(form.houseAddress) !== norm(sourceApp.houseAddress) ||
      norm(form.lga) !== norm(sourceApp.lga) ||
      norm(form.state) !== norm(sourceApp.state) ||
      norm(form.country) !== norm(sourceApp.country || 'Nigeria'));
  const employerChanged =
    returning &&
    !!sourceApp &&
    form.employmentStatus === 'employed' &&
    (sourceApp.employmentStatus !== 'employed' || norm(form.employerName) !== norm(sourceApp.employerName));
  const existingFiles = useMemo<Partial<Record<FileField, string>>>(() => {
    if (!sourceApp) return {};
    const out: Partial<Record<FileField, string>> = {};
    FILE_FIELDS.forEach((k) => {
      const f = sourceApp[k];
      if (f && f.path) out[k] = f.originalName || FILE_LABELS[k];
    });
    return out;
  }, [sourceApp]);
  const fileRequired = (k: FileField): boolean => {
    if (isEditMode) return false;
    if (!returning || !sourceApp) return true;
    if (!existingFiles[k]) return true;
    if (k === 'proofOfAddress') return addressChanged;
    if (k === 'validId') return false;
    return employerChanged;
  };

  const update = <K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setDirty(true);
  };

  // Attach a document, rejecting it immediately if it would push the combined
  // upload past the limit (instead of surprising the user at submit time).
  const attachFile = (key: FileField, f: File | null) => {
    if (f) {
      const othersSize = FILE_FIELDS.filter((k) => k !== key)
        .map((k) => form[k])
        .filter(Boolean)
        .reduce((sum, file) => sum + (file as File).size, 0);
      if (othersSize + f.size > MAX_TOTAL_UPLOAD_BYTES) {
        update(key, null);
        setErrors((prev) => ({
          ...prev,
          [key]: `Adding this file (${(f.size / MB).toFixed(1)} MB) would put your documents over the ${
            MAX_TOTAL_UPLOAD_BYTES / MB
          } MB combined limit — your other documents already use ${(othersSize / MB).toFixed(1)} MB. Please use a smaller file.`,
        }));
        return;
      }
    }
    update(key, f);
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

  const validatePersonal = (e: Record<string, string>) => {
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
    if (!form.mobileNumber.trim() || !validPhone(form.mobileNumber))
      e.mobileNumber = `Enter a valid ${form.country} mobile number`;
    if (form.altNumber && !validPhone(form.altNumber))
      e.altNumber = `Enter a valid ${form.country} phone number`;
    if (!/^\d{11}$/.test(form.bvn)) e.bvn = 'BVN must be 11 digits';
    if (!/^\d{11}$/.test(form.nin)) e.nin = 'NIN must be 11 digits';
    if (!form.validId && fileRequired('validId')) e.validId = 'Upload a valid means of ID';
    if (!form.proofOfAddress && fileRequired('proofOfAddress'))
      e.proofOfAddress = addressChanged
        ? 'Your address changed — upload a new proof of address for it'
        : 'Upload a proof of address so we can verify the address above';
    if (!form.employmentStatus) {
      e.employmentStatus = 'Select your employment status';
    } else if (form.employmentStatus === 'employed') {
      if (!form.employerName.trim()) e.employerName = 'Employer name is required';
      if (!form.officeAddress.trim()) e.officeAddress = 'Office address is required';
      const refresh = employerChanged ? 'Your employer changed — upload ' : 'Upload ';
      if (!form.offerLetter && fileRequired('offerLetter')) e.offerLetter = `${refresh}your offer letter`;
      if (!form.bankStatement && fileRequired('bankStatement'))
        e.bankStatement = `${refresh}your 6-month bank statement`;
      if (!form.staffId && fileRequired('staffId')) e.staffId = `${refresh}your staff ID`;
    } else {
      if (!form.referenceName.trim()) e.referenceName = "Your reference's full name is required";
      if (!form.referenceRelationship.trim())
        e.referenceRelationship = 'State your relationship with the reference';
      if (!form.referencePhone.trim()) e.referencePhone = "Your reference's phone number is required";
      else if (!validPhone(form.referencePhone))
        e.referencePhone = `Enter a valid ${form.country} phone number`;
      if (!form.referenceAddress.trim()) e.referenceAddress = "Your reference's address is required";
    }
  };

  const validateAccount = (e: Record<string, string>) => {
    if (!form.purposes.includes('Other')) return;
    if (!/^\d{10}$/.test(form.accountNumber)) e.accountNumber = 'Account number must be 10 digits';
    if (!form.bankName) e.bankName = 'Select your bank';
    if (!form.accountName.trim()) e.accountName = 'Account name is required';
  };

  const validateLoan = (e: Record<string, string>, includeAccount: boolean) => {
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
    if (includeAccount) validateAccount(e);
  };

  const validateStep = (key: StepKey): Record<string, string> => {
    const e: Record<string, string> = {};
    switch (key) {
      case 'personal':
      case 'records':
        validatePersonal(e);
        break;
      case 'purpose':
        if (form.purposes.length === 0) e.purposes = 'Select at least one thing you are applying for';
        break;
      case 'loan':
        validateLoan(e, !returning);
        break;
      case 'account':
        validateAccount(e);
        break;
      case 'review':
        if (!form.termsAccepted) e.termsAccepted = 'You must accept the Terms and Conditions';
        break;
    }
    return e;
  };

  const goNext = () => {
    const e = validateStep(stepKey);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (stepKey === 'records') {
      // Saved records no longer pass validation (or need a fresh document):
      // open the editor so the customer can see and fix what's flagged.
      setRecordsView('edit');
    }
  };

  const goToStep = (key: StepKey) => {
    const i = steps.indexOf(key);
    if (i >= 0) {
      setStep(i);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const changeAccountView = (view: 'keep' | 'change') => {
    setAccountView(view);
    setForm((prev) =>
      view === 'change'
        ? { ...prev, accountNumber: '', bankCode: '', bankName: '', accountName: '' }
        : {
            ...prev,
            accountNumber: sourceApp?.accountNumber || '',
            bankCode: '',
            bankName: sourceApp?.bankName || '',
            accountName: sourceApp?.accountName || '',
          }
    );
    setErrors((prev) => ({ ...prev, accountNumber: '', bankName: '', accountName: '' }));
    setDirty(true);
  };

  const startBlank = () => {
    setReturning(false);
    setForm(freshForm());
    setErrors({});
    setStep(0);
    setDirty(false);
    setDraftRestored(false);
    if (draftKey) localStorage.removeItem(draftKey);
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Implicit submissions before the review step (Enter key, or the browser
    // treating a re-rendered Continue button as submit) advance instead.
    if (step < steps.length - 1) {
      goNext();
      return;
    }
    setSubmitError(null);

    const allErrors = steps.reduce<Record<string, string>>(
      (acc, key) => ({ ...acc, ...validateStep(key) }),
      {}
    );
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstStep = steps.findIndex((key) => Object.keys(validateStep(key)).length > 0);
      if (firstStep >= 0) {
        setStep(firstStep);
        if (steps[firstStep] === 'records') setRecordsView('edit');
      }
      return;
    }

    const attachedFiles = [
      form.validId,
      form.proofOfAddress,
      form.offerLetter,
      form.bankStatement,
      form.staffId,
    ].filter(Boolean) as File[];
    const totalUpload = attachedFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalUpload > MAX_TOTAL_UPLOAD_BYTES) {
      setSubmitError(
        `Your documents (PDF, PNG, or JPG) add up to ${(totalUpload / MB).toFixed(1)} MB, which is over the ${
          MAX_TOTAL_UPLOAD_BYTES / MB
        } MB combined upload limit. Please replace it with a smaller file.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          // 'Other' has no vendor — an empty vendor id would fail ObjectId casting
          form.purposes
            .filter((p) => p !== 'Other' && form.vendorIds[p])
            .map((p) => ({ purpose: p, vendor: form.vendorIds[p] }))
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
      if (returning && sourceApp && !isEditMode) fd.append('reuseDocumentsFrom', sourceApp._id);
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
          : returning
          ? 'Application submitted — that was quick! We’ll be in touch.'
          : 'Application submitted — we’ll be in touch.'
      );
      setDirty(false);
      if (draftKey) localStorage.removeItem(draftKey);
      navigate('/applications');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setSubmitError(
        status === 413
          ? 'Your uploaded documents are too large to send. Please re-upload smaller files (large PDFs are usually the cause) and try again.'
          : extractApiError(err, 'Could not submit application')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if ((isEditMode && editLoading) || previousLoading) {
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

  const isLastStep = step >= steps.length - 1;
  const showReturning = returning && !!sourceApp && !isEditMode;
  // Only treat the saved account as "kept" while the form still holds exactly
  // those details (a restored draft may hold a half-typed new account).
  const keepingSavedAccount =
    accountView === 'keep' &&
    hasSavedAccount(sourceApp) &&
    form.accountNumber === sourceApp?.accountNumber &&
    form.bankName === sourceApp?.bankName;
  const continueLabel =
    stepKey === 'records' && recordsView === 'summary'
      ? 'Confirm & continue'
      : stepKey === 'account' && keepingSavedAccount
      ? 'Use this account & continue'
      : 'Continue';

  return (
    <div className="container-sm page">
      <div className="page-title" style={{ marginBottom: '1rem' }}>
        <h1>
          {isEditMode
            ? 'Edit & resubmit application'
            : showReturning
            ? `Welcome back, ${user?.firstName || 'there'}`
            : 'Loan application'}
        </h1>
        <p>
          {isEditMode
            ? 'Update what was flagged in the rejection note and resubmit. Files are kept unless you upload new ones.'
            : showReturning
            ? 'Tell us what you need and confirm your saved details. Only update what has changed.'
            : 'Fill in the details below. You can move back and forth between sections.'}
        </p>
      </div>

      {showReturning && sourceApp && (
        <div className="welcome-banner">
          <div>
            <strong>Good to see you again.</strong> We kept your details and documents from your
            application on {formatDate(sourceApp.createdAt)}, so this one takes about a minute.
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={startBlank}>
            Start with a blank form
          </button>
        </div>
      )}

      {!isEditMode && !showReturning && user && !draftRestored && (
        <div className="alert alert-info">
          We've pre-filled your name and email from your account. Update them here if anything has changed.
        </div>
      )}

      {draftRestored && (
        <div
          className="alert alert-info"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}
        >
          <span>
            We restored the draft you were working on.
            {showReturning
              ? ' Your documents on file are still used unless you upload replacements.'
              : ' For security your documents aren\'t saved — please re-attach them before submitting.'}
          </span>
          <button type="button" className="btn btn-ghost" onClick={discardDraft}>
            Start fresh
          </button>
        </div>
      )}

      <div className="stepper">
        {steps.map((key, i) => (
          <div key={key} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="step-num">{i < step ? '✓' : i + 1}</span>
            {STEP_LABELS[key]}
          </div>
        ))}
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      <form onSubmit={handleSubmit} noValidate className="card">
        {!isLastStep && stepKey !== 'purpose' && !(stepKey === 'records' && recordsView === 'summary') && (
          <p className="form-required-hint">
            Fields marked <span className="req-star">*</span> are required.
          </p>
        )}

        {stepKey === 'personal' && (
          <>
            <div className="alert alert-info">
              <strong>Documents:</strong> we accept PDF, PNG, and JPG files only. All your documents
              together must stay under {MAX_TOTAL_UPLOAD_BYTES / MB} MB.
            </div>
            <PersonalStep
              form={form}
              update={update}
              errors={errors}
              attachFile={attachFile}
              formatPhone={formatPhone}
              existing={existingFiles}
              fileRequired={fileRequired}
              geo={{ countries, states: statesList, cities: citiesList, statesLoading, citiesLoading }}
            />
            <EmploymentStep
              form={form}
              update={update}
              errors={errors}
              attachFile={attachFile}
              formatPhone={formatPhone}
              existing={existingFiles}
              fileRequired={fileRequired}
            />
          </>
        )}

        {stepKey === 'purpose' && (
          <PurposeStep form={form} togglePurpose={togglePurpose} errors={errors} />
        )}

        {stepKey === 'records' && sourceApp && (
          <RecordsStep
            form={form}
            update={update}
            errors={errors}
            attachFile={attachFile}
            formatPhone={formatPhone}
            existing={existingFiles}
            fileRequired={fileRequired}
            geo={{ countries, states: statesList, cities: citiesList, statesLoading, citiesLoading }}
            view={recordsView}
            onChangeView={setRecordsView}
            addressChanged={addressChanged}
            employerChanged={employerChanged}
          />
        )}

        {stepKey === 'loan' && (
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
            compactPurposes={showReturning}
            onChangePurposes={() => goToStep('purpose')}
            hideAccount={showReturning}
            previousAmount={showReturning ? sourceApp?.loanAmount : undefined}
          />
        )}

        {stepKey === 'account' && sourceApp && (
          <AccountStep
            form={form}
            update={update}
            errors={errors}
            sourceApp={sourceApp}
            view={keepingSavedAccount ? 'keep' : 'change'}
            onChangeView={changeAccountView}
            banks={banks}
            banksLoading={banksLoading}
            accountStatus={accountStatus}
          />
        )}

        {stepKey === 'review' && (
          <ReviewStep
            form={form}
            update={update}
            errors={errors}
            breakdownTotal={breakdownTotal}
            loanAmountNum={loanAmountNum}
            vendors={vendors}
            isEditMode={isEditMode}
            returning={showReturning}
            existing={existingFiles}
            onEdit={goToStep}
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
          {!isLastStep ? (
            <button key="continue" type="button" className="btn" onClick={goNext}>
              {continueLabel}
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

interface FileStepProps extends StepProps {
  attachFile: (key: FileField, f: File | null) => void;
  formatPhone: (next: string, prev: string) => string;
  /** Documents already on file (by original name) that can be kept. */
  existing?: Partial<Record<FileField, string>>;
  fileRequired?: (key: FileField) => boolean;
}

function PersonalStep({ form, update, errors, attachFile, formatPhone, geo, existing, fileRequired }: FileStepProps & { geo: GeoLists }) {
  const isRequired = (k: FileField) => (fileRequired ? fileRequired(k) : true);
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
          <SearchSelect
            id="country"
            value={form.country}
            options={geo.countries.map((c) => c.name)}
            placeholder="Search country"
            loading={geo.countries.length === 0}
            invalid={!!errors.country}
            onSelect={(v) => {
              update('country', v);
              update('state', '');
              update('lga', '');
            }}
          />
        </Field>
        <Field label="State" id="state" error={errors.state} required>
          {stateListReady || geo.statesLoading ? (
            <SearchSelect
              id="state"
              value={form.state}
              options={geo.states}
              placeholder="Search state"
              loading={geo.statesLoading}
              invalid={!!errors.state}
              onSelect={(v) => {
                update('state', v);
                update('lga', '');
              }}
            />
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
            <SearchSelect
              id="lga"
              value={form.lga}
              options={geo.cities}
              placeholder={form.state ? 'Search city / LGA' : 'Select a state first'}
              disabled={!form.state}
              loading={!!form.state && geo.citiesLoading}
              invalid={!!errors.lga}
              onSelect={(v) => update('lga', v)}
            />
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
          <input id="mobileNumber" inputMode="tel" value={form.mobileNumber} onChange={(e) => update('mobileNumber', formatPhone(e.target.value, form.mobileNumber))} aria-invalid={!!errors.mobileNumber} />
        </Field>
        <Field label="Alternate number" id="altNumber" error={errors.altNumber} help="Optional">
          <input id="altNumber" inputMode="tel" value={form.altNumber} onChange={(e) => update('altNumber', formatPhone(e.target.value, form.altNumber))} aria-invalid={!!errors.altNumber} />
        </Field>
      </div>

      <FileUpload
        label="Proof of address"
        id="proofOfAddress"
        file={form.proofOfAddress}
        onChange={(f) => attachFile('proofOfAddress', f)}
        error={errors.proofOfAddress}
        help="Recent utility bill, bank statement, or tenancy agreement showing the address above"
        existing={existing?.proofOfAddress}
        required={isRequired('proofOfAddress')}
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
        onChange={(f) => attachFile('validId', f)}
        error={errors.validId}
        help="NIN slip, Driver's license, International passport, or Voter's card"
        existing={existing?.validId}
        required={isRequired('validId')}
      />
    </div>
  );
}

function EmploymentStep({ form, update, errors, attachFile, formatPhone, existing, fileRequired }: FileStepProps) {
  const isRequired = (k: FileField) => (fileRequired ? fileRequired(k) : true);
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
              onChange={(f) => attachFile('offerLetter', f)}
              error={errors.offerLetter}
              existing={existing?.offerLetter}
              required={isRequired('offerLetter')}
            />
            <FileUpload
              label="6 months bank statement"
              id="bankStatement"
              file={form.bankStatement}
              onChange={(f) => attachFile('bankStatement', f)}
              error={errors.bankStatement}
              existing={existing?.bankStatement}
              required={isRequired('bankStatement')}
            />
          </div>

          <FileUpload
            label="Staff ID"
            id="staffId"
            file={form.staffId}
            onChange={(f) => attachFile('staffId', f)}
            error={errors.staffId}
            existing={existing?.staffId}
            required={isRequired('staffId')}
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
              <input id="referencePhone" inputMode="tel" value={form.referencePhone} onChange={(e) => update('referencePhone', formatPhone(e.target.value, form.referencePhone))} aria-invalid={!!errors.referencePhone} />
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
  /** Returning flow: purposes were picked on their own step, show a summary here. */
  compactPurposes?: boolean;
  onChangePurposes?: () => void;
  /** Returning flow: the payout account has its own confirmation step. */
  hideAccount?: boolean;
  previousAmount?: number;
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
  compactPurposes,
  onChangePurposes,
  hideAccount,
  previousAmount,
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

      <Field
        label="Loan amount (₦)"
        id="loanAmount"
        error={errors.loanAmount}
        help={
          previousAmount
            ? `You asked for ${formatNaira(previousAmount)} last time — confirm it or enter a new amount.`
            : undefined
        }
        required
      >
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

      {compactPurposes ? (
        <div className="form-group">
          <label>Applying for</label>
          <div className="purpose-summary">
            <span>{form.purposes.map(purposeLabel).join(', ') || 'Nothing selected yet'}</span>
            <button type="button" className="review-edit-btn" onClick={onChangePurposes}>
              Change
            </button>
          </div>
          {errors.purposes && <span className="field-error">{errors.purposes}</span>}
        </div>
      ) : (
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
      )}

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

      {!hideAccount && form.purposes.includes('Other') && (
        <PayoutAccountFields
          form={form}
          update={update}
          errors={errors}
          banks={banks}
          banksLoading={banksLoading}
          accountStatus={accountStatus}
        />
      )}
    </div>
  );
}

interface PayoutAccountProps extends StepProps {
  banks: Bank[];
  banksLoading: boolean;
  accountStatus: AccountStatus;
  hideIntro?: boolean;
}

function PayoutAccountFields({ form, update, errors, banks, banksLoading, accountStatus, hideIntro }: PayoutAccountProps) {
  return (
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
        <SearchSelect
          id="bankCode"
          value={form.bankName}
          options={banks.map((b) => b.name)}
          placeholder="Search your bank"
          loading={banksLoading}
          invalid={!!errors.bankName}
          onSelect={(name) => {
            const bank = banks.find((b) => b.name === name);
            update('bankCode', bank?.code || '');
            update('bankName', name);
            if (form.accountName) update('accountName', '');
          }}
        />
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
          ? "We couldn't verify this account — double-check the number and bank, or type the account name exactly as your bank has it"
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
  );
}

const purposeLabel = (p: Purpose) => (p === 'Other' ? 'Others' : p);

interface ReviewStepProps extends StepProps {
  breakdownTotal: number;
  loanAmountNum: number;
  vendors: Vendor[];
  isEditMode: boolean;
  returning?: boolean;
  existing?: Partial<Record<FileField, string>>;
  onEdit: (step: StepKey) => void;
}

function ReviewStep({
  form,
  update,
  errors,
  breakdownTotal,
  loanAmountNum,
  vendors,
  isEditMode,
  returning,
  existing,
  onEdit,
}: ReviewStepProps) {
  const vendorName = (p: Purpose) => {
    const v = vendors.find((x) => x._id === form.vendorIds[p]);
    return v ? `${v.businessName} — ${v.area} (${v.partnerCode})` : '—';
  };
  const vendorPurposes = form.purposes.filter((p) => p !== 'Other');
  const missingFileNote = isEditMode ? 'Keeping previously uploaded file' : 'Not uploaded';
  const chipName = (k: FileField) => {
    const fresh = form[k]?.name;
    if (fresh) return fresh;
    if (returning && existing?.[k]) return `On file · ${existing[k]}`;
    return undefined;
  };
  const personalStep: StepKey = returning ? 'records' : 'personal';

  return (
    <div>
      <div className="section-title">Review & submit</div>
      <p className="review-intro">
        Almost done — confirm everything below is correct. Use <strong>Edit</strong> to jump back
        to a section.
      </p>

      <div className="review-grid">
        <ReviewCard title="Personal" onEdit={() => onEdit(personalStep)}>
          <ReviewRow label="Full name" value={[form.surname, form.firstName, form.middleName].filter(Boolean).join(' ')} />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Address" value={[form.houseAddress, form.lga, form.state, form.country].filter(Boolean).join(', ')} />
          <ReviewRow label="Mobile" value={`${form.mobileNumber}${form.altNumber ? ` · Alt: ${form.altNumber}` : ''}`} />
          <ReviewRow label="BVN" value={form.bvn} />
          <ReviewRow label="NIN" value={form.nin} />
          <div className="review-files">
            <FileChip label="Valid ID" name={chipName('validId')} fallback={missingFileNote} />
            <FileChip label="Proof of address" name={chipName('proofOfAddress')} fallback={missingFileNote} />
          </div>
        </ReviewCard>

        <ReviewCard title="Employment" onEdit={() => onEdit(personalStep)}>
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
                <FileChip label="Offer letter" name={chipName('offerLetter')} fallback={missingFileNote} />
                <FileChip label="Bank statement" name={chipName('bankStatement')} fallback={missingFileNote} />
                <FileChip label="Staff ID" name={chipName('staffId')} fallback={missingFileNote} />
              </div>
            </>
          )}
        </ReviewCard>

        <ReviewCard title="Loan request" onEdit={() => onEdit('loan')}>
          <ReviewRow label="Amount borrowed" value={formatNaira(loanAmountNum)} />
          <ReviewRow label="Total to repay" value={formatNaira(totalRepayable(loanAmountNum))} emphasis />
          <ReviewRow label="Purpose" value={form.purposes.map(purposeLabel).join(', ')} />
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
          {form.purposes.includes('Other') && !returning && (
            <>
              <ReviewRow label="Bank" value={form.bankName} />
              <ReviewRow label="Account number" value={form.accountNumber} />
              <ReviewRow label="Account name" value={form.accountName} />
            </>
          )}
        </ReviewCard>

        {form.purposes.includes('Other') && returning && (
          <ReviewCard title="Receiving account" onEdit={() => onEdit('account')}>
            <ReviewRow label="Bank" value={form.bankName} />
            <ReviewRow label="Account number" value={form.accountNumber} />
            <ReviewRow label="Account name" value={form.accountName} />
          </ReviewCard>
        )}
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

/**
 * Combobox: type to filter long option lists (countries, states, banks…)
 * instead of scrolling a native select. Committed value comes only from
 * picking an option — free text resets on blur.
 */
function SearchSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  loading,
  invalid,
  onSelect,
}: {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  onSelect: (v: string) => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const q = (query ?? '').trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  const visible = filtered.slice(0, 60);

  const commit = (v: string) => {
    onSelect(v);
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className="search-select">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        autoComplete="off"
        placeholder={loading ? 'Loading…' : placeholder}
        disabled={disabled || loading}
        value={query ?? value}
        aria-invalid={invalid || undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, visible.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            if (open && visible[highlight]) {
              e.preventDefault();
              commit(visible[highlight]);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
            setQuery(null);
          }
        }}
        onBlur={() => {
          // Let option mousedown commit before closing
          window.setTimeout(() => {
            setOpen(false);
            setQuery(null);
          }, 150);
        }}
      />
      {open && !disabled && !loading && (
        <div className="search-select-list" role="listbox" id={`${id}-listbox`}>
          {visible.length === 0 ? (
            <div className="search-select-empty">No matches</div>
          ) : (
            visible.map((o, i) => (
              <button
                type="button"
                key={o}
                role="option"
                aria-selected={o === value}
                className={`search-select-option${i === highlight ? ' active' : ''}${o === value ? ' selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(o);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {o}
              </button>
            ))
          )}
          {filtered.length > visible.length && (
            <div className="search-select-empty">
              {filtered.length - visible.length} more — keep typing to narrow down
            </div>
          )}
        </div>
      )}
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

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ACCEPTED_LABEL = 'PDF, PNG, or JPG';

function FileUpload({
  label,
  id,
  file,
  onChange,
  error,
  help,
  required,
  existing,
}: {
  label: string;
  id: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  help?: string;
  required?: boolean;
  /** Name of the document already on file; shown when no new file is attached. */
  existing?: string;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError || error;
  const keeping = !file && !!existing && !required;
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
        {required && <span className="req-star" aria-hidden="true"> *</span>}
      </label>
      <label className={`file-drop ${file ? 'has-file' : keeping ? 'on-file' : ''}`}>
        <span className="file-drop-label">
          {file
            ? file.name
            : existing
            ? `On file: ${existing}`
            : `Click to upload ${label.toLowerCase()}`}
        </span>
        <span className="file-drop-meta">
          {file
            ? `${(file.size / 1024).toFixed(0)} KB`
            : existing
            ? required
              ? `A new ${label.toLowerCase()} is needed — click to upload (${ACCEPTED_LABEL}, max ${MAX_FILE_BYTES / MB} MB)`
              : `We'll keep this one. Click to replace it (${ACCEPTED_LABEL}, max ${MAX_FILE_BYTES / MB} MB)`
            : `${help ? `${help} · ` : ''}${ACCEPTED_LABEL} · max ${MAX_FILE_BYTES / MB} MB`}
        </span>
        <input
          id={id}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={async (e) => {
            const raw = e.target.files?.[0] || null;
            if (!raw) {
              setLocalError(null);
              return onChange(null);
            }
            if (!ACCEPTED_TYPES.includes(raw.type)) {
              setLocalError(
                `"${raw.name}" is not a supported format — please upload a ${ACCEPTED_LABEL} file.`
              );
              onChange(null);
              return;
            }
            const f = await compressImageFile(raw);
            if (f.size > MAX_FILE_BYTES) {
              setLocalError(
                `This file is ${(f.size / MB).toFixed(1)} MB — over the ${MAX_FILE_BYTES / MB} MB limit. Please upload a smaller ${ACCEPTED_LABEL} file.`
              );
              onChange(null);
              return;
            }
            setLocalError(null);
            onChange(f);
          }}
        />
      </label>
      {shownError && <span className="field-error">{shownError}</span>}
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  editLabel = 'Edit',
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="review-card">
      <div className="review-card-head">
        <h3>{title}</h3>
        <button type="button" className="review-edit-btn" onClick={onEdit}>
          {editLabel}
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

/* ---------- Returning-customer steps ---------- */

const PURPOSE_COPY: Record<Purpose, string> = {
  Groceries: 'Paid directly to a partner grocery store you pick.',
  Medications: 'Paid directly to a partner pharmacy you pick.',
  Other: 'Other essentials — paid into your bank account.',
};

function PurposeStep({
  form,
  togglePurpose,
  errors,
}: {
  form: ApplyFormState;
  togglePurpose: (p: Purpose) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <div className="section-title">What are you applying for?</div>
      <p className="review-intro">
        Pick everything that applies. You can choose groceries and medications together; "Others"
        is on its own because it's paid to your account instead of a vendor.
      </p>
      <div className="purpose-grid" role="group" aria-label="Loan purpose">
        {PURPOSES.map((p) => {
          const checked = form.purposes.includes(p);
          return (
            <label key={p} className={`purpose-card ${checked ? 'checked' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => togglePurpose(p)} />
              <span className="purpose-card-check" aria-hidden="true">{checked ? '✓' : ''}</span>
              <span className="purpose-card-body">
                <strong>{purposeLabel(p)}</strong>
                <span>{PURPOSE_COPY[p]}</span>
              </span>
            </label>
          );
        })}
      </div>
      {errors.purposes && <span className="field-error">{errors.purposes}</span>}
    </div>
  );
}

interface RecordsStepProps extends FileStepProps {
  geo: GeoLists;
  view: 'summary' | 'edit';
  onChangeView: (v: 'summary' | 'edit') => void;
  addressChanged: boolean;
  employerChanged: boolean;
}

function RecordsStep(props: RecordsStepProps) {
  const { form, existing, view, onChangeView, addressChanged, employerChanged } = props;
  const onFile = (k: FileField) => (existing?.[k] ? `On file · ${existing[k]}` : undefined);

  if (view === 'edit') {
    return (
      <div>
        <div className="section-title">Update your records</div>
        <div className="alert alert-info">
          Change anything that's different now. Documents on file are kept unless you upload a
          replacement
          {addressChanged && ' — since your address changed, please upload a new proof of address'}
          {employerChanged && ' — since your employer changed, please upload your new offer letter, staff ID and a recent bank statement'}
          .
        </div>
        <PersonalStep {...props} />
        <EmploymentStep {...props} />
        <div className="records-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChangeView('summary')}>
            Back to summary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">Your saved records</div>
      <p className="review-intro">
        These are the details from your last application. If they're still correct, confirm and
        carry on. If anything has changed, update it first.
      </p>

      <div className="review-grid">
        <ReviewCard title="Personal" onEdit={() => onChangeView('edit')} editLabel="Update">
          <ReviewRow label="Full name" value={[form.surname, form.firstName, form.middleName].filter(Boolean).join(' ')} />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Address" value={[form.houseAddress, form.lga, form.state, form.country].filter(Boolean).join(', ')} />
          <ReviewRow label="Mobile" value={`${form.mobileNumber}${form.altNumber ? ` · Alt: ${form.altNumber}` : ''}`} />
          <ReviewRow label="BVN" value={form.bvn} />
          <ReviewRow label="NIN" value={form.nin} />
          <div className="review-files">
            <FileChip label="Valid ID" name={form.validId?.name || onFile('validId')} fallback="Not on file" />
            <FileChip label="Proof of address" name={form.proofOfAddress?.name || onFile('proofOfAddress')} fallback="Not on file" />
          </div>
        </ReviewCard>

        <ReviewCard title="Employment" onEdit={() => onChangeView('edit')} editLabel="Update">
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
                <FileChip label="Offer letter" name={form.offerLetter?.name || onFile('offerLetter')} fallback="Not on file" />
                <FileChip label="Bank statement" name={form.bankStatement?.name || onFile('bankStatement')} fallback="Not on file" />
                <FileChip label="Staff ID" name={form.staffId?.name || onFile('staffId')} fallback="Not on file" />
              </div>
            </>
          )}
        </ReviewCard>
      </div>

      <div className="records-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onChangeView('edit')}>
          Something has changed — update my details
        </button>
      </div>
    </div>
  );
}

interface AccountStepProps extends PayoutAccountProps {
  sourceApp: Application;
  view: 'keep' | 'change';
  onChangeView: (v: 'keep' | 'change') => void;
}

function AccountStep({ sourceApp, view, onChangeView, ...fields }: AccountStepProps) {
  const saved = hasSavedAccount(sourceApp);
  return (
    <div>
      <div className="section-title">Receiving account</div>
      <p className="review-intro">
        If approved, the "Others" part of your loan is paid straight into this account.
      </p>

      {saved && view === 'keep' ? (
        <>
          <div className="saved-account">
            <div className="saved-account-body">
              <div className="saved-account-bank">{sourceApp.bankName}</div>
              <div className="saved-account-number mono">{sourceApp.accountNumber}</div>
              <div className="saved-account-name">{sourceApp.accountName}</div>
            </div>
            <span className="badge badge-approved">On file</span>
          </div>
          <div className="records-actions">
            <button type="button" className="btn btn-secondary" onClick={() => onChangeView('change')}>
              Use a different account
            </button>
          </div>
        </>
      ) : (
        <>
          {saved && (
            <div className="records-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChangeView('keep')}>
                ← Keep my saved account ({sourceApp.bankName} · {sourceApp.accountNumber})
              </button>
            </div>
          )}
          <div className="alert alert-info">
            New account details are verified with your bank before we can pay into them.
          </div>
          <PayoutAccountFields {...fields} hideIntro />
        </>
      )}
    </div>
  );
}
