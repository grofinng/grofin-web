export type Purpose = 'Groceries' | 'Medications';

export const PURPOSES: Purpose[] = ['Groceries', 'Medications'];

export type VendorCategory = 'Pharmacy' | 'Grocery';

export const VENDOR_CATEGORIES: VendorCategory[] = ['Pharmacy', 'Grocery'];

export const PURPOSE_TO_CATEGORY: Record<Purpose, VendorCategory> = {
  Groceries: 'Grocery',
  Medications: 'Pharmacy',
};

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
  employerName: string;
  officeAddress: string;
  offerLetter?: UploadedFile;
  bankStatement?: UploadedFile;
  staffId?: UploadedFile;
  validId?: UploadedFile;
  termsAccepted: boolean;
  status: ApplicationStatus;
  statusNote?: string;
  allowEdit?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
}
