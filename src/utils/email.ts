import emailjs from '@emailjs/browser';
import { formatDate, formatRef } from './format';

const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || '';
const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '';
const TEMPLATES = {
  registration: process.env.REACT_APP_EMAILJS_TEMPLATE_REGISTRATION || '',
  received: process.env.REACT_APP_EMAILJS_TEMPLATE_RECEIVED || '',
  approved: process.env.REACT_APP_EMAILJS_TEMPLATE_APPROVED || '',
  rejected: process.env.REACT_APP_EMAILJS_TEMPLATE_REJECTED || '',
  adminReceived: process.env.REACT_APP_EMAILJS_TEMPLATE_ADMIN_RECEIVED || '',
  contact: process.env.REACT_APP_EMAILJS_TEMPLATE_CONTACT || '',
};

const COMPANY_EMAIL = process.env.REACT_APP_ESENA_EMAIL || 'grofinng@gmail.com';
const COMPANY_PHONE = '+234 901 244 1292';
const CONTACT_LINE = `Questions? Call or WhatsApp ${COMPANY_PHONE} or reply to this email.`;

function configured(template: string) {
  return SERVICE_ID && PUBLIC_KEY && template;
}

async function send(template: string, params: Record<string, unknown>) {
  if (!configured(template)) {
    console.info('[Esena Africa] EmailJS not configured — skipping email', { template, params });
    return null;
  }
  try {
    // Templates may greet with either {{name}} or {{to_name}} — send both.
    const withAliases = { name: params.to_name, support_phone: COMPANY_PHONE, support_email: COMPANY_EMAIL, ...params };
    return await emailjs.send(SERVICE_ID, template, withAliases, { publicKey: PUBLIC_KEY });
  } catch (err) {
    console.error('[Esena Africa] EmailJS send failed', err);
    return null;
  }
}

export const emailNotifications = {
  registration: (to: { email: string; firstName: string }) =>
    send(TEMPLATES.registration, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: 'Welcome to Esena Africa',
      message: `Hi ${to.firstName}, welcome to Esena Africa. Your account is ready — you can now apply for support with your everyday essentials.`,
    }),

  applicationReceived: (to: { email: string; firstName: string; loanAmount: number; applicationId: string }) =>
    send(TEMPLATES.received, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: `Esena Africa — Application ${formatRef(to.applicationId)} received`,
      reference: formatRef(to.applicationId),
      application_id: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      message: `Hi ${to.firstName}, we've received your loan application for ₦${to.loanAmount.toLocaleString()} (ref ${formatRef(to.applicationId)}). It is now being processed.\n\n${CONTACT_LINE}`,
    }),

  applicationApproved: (to: {
    email: string;
    firstName: string;
    loanAmount: number;
    applicationId: string;
    totalRepayable: number;
    dueDate?: string | null;
    repaymentBank: string;
    repaymentAccountNumber: string;
    repaymentAccountName: string;
    graceDays: number;
    lateRate: number;
  }) => {
    const due = to.dueDate ? formatDate(to.dueDate) : '29 days from approval';
    const ref = formatRef(to.applicationId);
    const dailyLate = Math.round((to.totalRepayable * to.lateRate) / 100);
    const latePolicy =
      `If payment is more than ${to.graceDays} day${to.graceDays === 1 ? '' : 's'} late, ` +
      `${to.lateRate}% of the total repayable (₦${dailyLate.toLocaleString()}) is added for every extra day.`;
    const accountDetails =
      `Bank: ${to.repaymentBank}\n` +
      `Account number: ${to.repaymentAccountNumber}\n` +
      `Account name: ${to.repaymentAccountName}`;
    return send(TEMPLATES.approved, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: `Esena Africa — Loan ${ref} approved`,
      reference: ref,
      application_id: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      total_repayable: to.totalRepayable.toLocaleString(),
      due_date: due,
      repayment_bank: to.repaymentBank,
      repayment_account_number: to.repaymentAccountNumber,
      repayment_account_name: to.repaymentAccountName,
      account_details: accountDetails,
      grace_days: String(to.graceDays),
      late_interest_rate: String(to.lateRate),
      daily_late_interest: dailyLate.toLocaleString(),
      late_policy: latePolicy,
      message:
        `Great news ${to.firstName}! Your Esena Africa loan request of ₦${to.loanAmount.toLocaleString()} (ref ${ref}) has been approved.\n\n` +
        `Please repay ₦${to.totalRepayable.toLocaleString()} by ${due} into:\n${accountDetails}\n\n` +
        `${latePolicy}\n\nQuote ref ${ref} when you pay. ${CONTACT_LINE}`,
    });
  },

  applicationRejected: (to: {
    email: string;
    firstName: string;
    loanAmount: number;
    applicationId: string;
    reason: string;
    canEdit: boolean;
  }) =>
    send(TEMPLATES.rejected, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: `Esena Africa — Application ${formatRef(to.applicationId)} not approved`,
      reference: formatRef(to.applicationId),
      application_id: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      reason: to.reason,
      can_edit: to.canEdit ? 'yes' : 'no',
      message:
        `Hi ${to.firstName}, your Esena Africa application (ref ${formatRef(to.applicationId)}) for ₦${to.loanAmount.toLocaleString()} was not approved. Reason: ${to.reason}.` +
        (to.canEdit
          ? ' You can update your application and resubmit it from the My Applications page.'
          : '') +
        `\n\n${CONTACT_LINE}`,
    }),

  contactUs: (from: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }) =>
    send(TEMPLATES.contact, {
      to_email: COMPANY_EMAIL,
      to_name: 'Esena Africa',
      from_name: from.name,
      from_email: from.email,
      reply_to: from.email,
      phone: from.phone || '—',
      subject: from.subject || 'Contact form enquiry',
      message: `From ${from.name} <${from.email}>${from.phone ? ` · ${from.phone}` : ''}\n\n${from.message}`,
    }),

  applicationReceivedAdmin: (to: {
    email: string;
    firstName: string;
    applicantName: string;
    applicantEmail: string;
    loanAmount: number;
    applicationId: string;
  }) =>
    send(TEMPLATES.adminReceived, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: `Esena Africa — New loan application ${formatRef(to.applicationId)} from ${to.applicantName}`,
      reference: formatRef(to.applicationId),
      application_id: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      applicant_name: to.applicantName,
      applicant_email: to.applicantEmail,
      message: `New loan application: ${to.applicantName} (${to.applicantEmail}) requested ₦${to.loanAmount.toLocaleString()}. Ref ${formatRef(to.applicationId)}. Review it in the Esena Africa admin dashboard.`,
    }),
};
