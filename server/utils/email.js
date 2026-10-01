// Server-side EmailJS sender. Uses the REST API with the account's private
// key (EmailJS blocks server calls without it). Shares the same service and
// templates as the browser, so nothing changes in the EmailJS dashboard.
const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || '';
const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const COMPANY_EMAIL = process.env.ESENA_EMAIL || 'grofinng@gmail.com';

// One template covers every reminder: the job varies {{subject}}, {{message}},
// {{reminder_kind}} and the day counts. Set EMAILJS_TEMPLATE_OVERDUE only if
// you want a separate design for overdue notices.
const REMINDER_TEMPLATE = process.env.EMAILJS_TEMPLATE_REMINDER || '';
const TEMPLATES = {
  reminder: REMINDER_TEMPLATE,
  overdue: process.env.EMAILJS_TEMPLATE_OVERDUE || REMINDER_TEMPLATE,
};

function isConfigured(templateId) {
  return Boolean(SERVICE_ID && PUBLIC_KEY && PRIVATE_KEY && templateId);
}

async function sendEmail(templateId, params) {
  if (!isConfigured(templateId)) {
    console.info('[email] EmailJS not configured on the server — skipping', { templateId, to: params.to_email });
    return { skipped: true };
  }
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: templateId,
      user_id: PUBLIC_KEY,
      accessToken: PRIVATE_KEY,
      // Templates greet with either {{name}} or {{to_name}}.
      template_params: { name: params.to_name, from_email: COMPANY_EMAIL, ...params },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`EmailJS ${res.status}: ${text || res.statusText}`);
  }
  return { skipped: false };
}

module.exports = { sendEmail, isConfigured, TEMPLATES, COMPANY_EMAIL };
