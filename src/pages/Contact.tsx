import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { emailNotifications } from '../utils/email';
import { contactRequestsApi } from '../api/contactRequests';
import { extractApiError } from '../api/client';

export function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Your name is required');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email');
    if (!form.message.trim()) return setError('Please write a short message');

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      };
      await contactRequestsApi.submit(payload);
      // Fire-and-forget email — already saved to DB, so don't block on email failure
      emailNotifications.contactUs(payload).catch(() => {});
      toast.success('Message sent — we\'ll be in touch.');
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setError(extractApiError(err, 'Could not send right now. Please email us at grofinng@gmail.com.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-sm page">
      <div className="page-title" style={{ marginBottom: '1rem' }}>
        <h1>Contact us</h1>
        <p>
          Questions, feedback, or need help with an application? Send us a note and the team will reply
          by email. You can also email{' '}
          <a href="mailto:grofinng@gmail.com">grofinng@gmail.com</a> directly.
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {sent && (
          <div className="alert alert-success">
            Thanks — your message is on its way. We typically reply within 1 business day.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Your name</label>
              <input id="name" value={form.name} onChange={update('name')} />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" inputMode="tel" value={form.phone} onChange={update('phone')} />
              <span className="field-help">Optional</span>
            </div>
            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input id="subject" value={form.subject} onChange={update('subject')} />
              <span className="field-help">Optional</span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              value={form.message}
              onChange={update('message')}
              rows={6}
              placeholder="How can we help?"
            />
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Send message'}
          </button>
          <Link to="/" className="btn btn-ghost" style={{ marginLeft: '0.5rem' }}>
            Back home
          </Link>
        </form>
      </div>
    </div>
  );
}
