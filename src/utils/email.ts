import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || '';
const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '';
const TEMPLATES = {
  registration: process.env.REACT_APP_EMAILJS_TEMPLATE_REGISTRATION || '',
  received: process.env.REACT_APP_EMAILJS_TEMPLATE_RECEIVED || '',
  approved: process.env.REACT_APP_EMAILJS_TEMPLATE_APPROVED || '',
  rejected: process.env.REACT_APP_EMAILJS_TEMPLATE_REJECTED || '',
  adminReceived: process.env.REACT_APP_EMAILJS_TEMPLATE_ADMIN_RECEIVED || '',
};

const COMPANY_EMAIL = process.env.REACT_APP_GROFIN_EMAIL || 'grofinng@gmail.com';

function configured(template: string) {
  return SERVICE_ID && PUBLIC_KEY && template;
}

async function send(template: string, params: Record<string, unknown>) {
  if (!configured(template)) {
    console.info('[GroFin] EmailJS not configured — skipping email', { template, params });
    return null;
  }
  try {
    return await emailjs.send(SERVICE_ID, template, params, { publicKey: PUBLIC_KEY });
  } catch (err) {
    console.error('[GroFin] EmailJS send failed', err);
    return null;
  }
}

export const emailNotifications = {
  registration: (to: { email: string; firstName: string }) =>
    send(TEMPLATES.registration, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: 'Welcome to GroFin',
      message: `Hi ${to.firstName}, welcome to GroFin. Your account is ready — you can now apply for support with your everyday essentials.`,
    }),

  applicationReceived: (to: { email: string; firstName: string; loanAmount: number; applicationId: string }) =>
    send(TEMPLATES.received, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: 'GroFin — Application received',
      reference: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      message: `Hi ${to.firstName}, we've received your loan application for ₦${to.loanAmount.toLocaleString()} (ref ${to.applicationId}). It is now being processed.`,
    }),

  applicationApproved: (to: { email: string; firstName: string; loanAmount: number; applicationId: string }) =>
    send(TEMPLATES.approved, {
      to_email: to.email,
      to_name: to.firstName,
      from_email: COMPANY_EMAIL,
      subject: 'GroFin — Application approved',
      reference: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      message: `Great news ${to.firstName}! Your GroFin application (ref ${to.applicationId}) for ₦${to.loanAmount.toLocaleString()} has been approved.`,
    }),

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
      subject: 'GroFin — Application not approved',
      reference: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      reason: to.reason,
      can_edit: to.canEdit ? 'yes' : 'no',
      message:
        `Hi ${to.firstName}, your GroFin application (ref ${to.applicationId}) for ₦${to.loanAmount.toLocaleString()} was not approved. Reason: ${to.reason}.` +
        (to.canEdit
          ? ' You can update your application and resubmit it from the My Applications page.'
          : ' If you have questions, please reply to this email.'),
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
      subject: `GroFin — New loan application from ${to.applicantName}`,
      reference: to.applicationId,
      loan_amount: to.loanAmount.toLocaleString(),
      applicant_name: to.applicantName,
      applicant_email: to.applicantEmail,
      message: `New loan application: ${to.applicantName} (${to.applicantEmail}) requested ₦${to.loanAmount.toLocaleString()}. Ref ${to.applicationId}. Review it in the GroFin admin dashboard.`,
    }),
};
