export type Purpose = 'Groceries' | 'Medications' | 'Other';

export const PURPOSES: Purpose[] = ['Groceries', 'Medications', 'Other'];

/** Purposes fulfilled through a partner vendor ('Other' pays out to the applicant's account). */
export type VendorPurpose = Exclude<Purpose, 'Other'>;

export type VendorCategory = 'Pharmacy' | 'Grocery';

export const VENDOR_CATEGORIES: VendorCategory[] = ['Pharmacy', 'Grocery'];

export const PURPOSE_TO_CATEGORY: Record<VendorPurpose, VendorCategory> = {
  Groceries: 'Grocery',
  Medications: 'Pharmacy',
};

export interface Bank {
  name: string;
  code: string;
}

export interface Vendor {
  _id: string;
  businessName: string;
  address: string;
  contactPhone: string;
  area: string;
  category: VendorCategory;
  partnerCode: string;
  ownerName: string;
  ownerPhone: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorSelection {
  purpose: Purpose;
  vendor: Vendor | string;
}

export type UserRole = 'user' | 'manager' | 'admin';

export interface StaffUser {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  role: UserRole;
  receiveApplicationEmails?: boolean;
  createdAt?: string;
}

export type ApplicationStatus = 'received' | 'processing' | 'approved' | 'rejected';

export type EmploymentStatus = 'employed' | 'not-working';

export interface PurposeBreakdownItem {
  purpose: Purpose;
  amount: number;
}

export interface User {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  role: UserRole;
  nin: string;
  receiveApplicationEmails: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadedFile {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface PopulatedUserRef {
  _id: string;
  firstName: string;
  surname: string;
  email: string;
}

export interface Application {
  _id: string;
  user: string | PopulatedUserRef;
  surname: string;
  firstName: string;
  middleName?: string;
  email: string;
  houseAddress: string;
  country?: string;
  lga: string;
  state: string;
  mobileNumber: string;
  altNumber?: string;
  bvn: string;
  nin: string;
  referredBy: string;
  referralContact?: string;
  loanAmount: number;
  purposes: Purpose[];
  purposeBreakdown: PurposeBreakdownItem[];
  vendorSelections: VendorSelection[];
  employmentStatus: EmploymentStatus;
  employerName?: string;
  officeAddress?: string;
  referenceName?: string;
  referenceRelationship?: string;
  referencePhone?: string;
  referenceAddress?: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  offerLetter?: UploadedFile;
  bankStatement?: UploadedFile;
  staffId?: UploadedFile;
  validId?: UploadedFile;
  proofOfAddress?: UploadedFile;
  termsAccepted: boolean;
  status: ApplicationStatus;
  statusNote?: string;
  allowEdit?: boolean;
  interestRate?: number;
  approvedAt?: string | null;
  dueDate?: string | null;
  repaymentBank?: string;
  repaymentAccountNumber?: string;
  repaymentAccountName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
}

export type VendorRequestStatus = 'pending' | 'approved' | 'rejected';
export type ContactRequestStatus = 'pending' | 'resolved';

export type StatIcon = 'chart' | 'box' | 'trending' | 'meal' | 'naira' | 'users' | 'home' | 'leaf';
export const STAT_ICONS: StatIcon[] = ['chart', 'box', 'trending', 'meal', 'naira', 'users', 'home', 'leaf'];

export interface ImpactStat {
  _id: string;
  key: string;
  label: string;
  value: string;
  icon: StatIcon;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactRequest {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactRequestStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRequest {
  _id: string;
  businessName: string;
  address: string;
  area: string;
  category: VendorCategory;
  contactPhone: string;
  cacRegistered: 'Yes' | 'No';
  storefrontPhoto?: UploadedFile;
  goodsPhoto?: UploadedFile;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  notes: string;
  status: VendorRequestStatus;
  adminNote: string;
  approvedVendor?: { _id: string; partnerCode: string; businessName: string } | null;
  createdAt: string;
  updatedAt: string;
}
