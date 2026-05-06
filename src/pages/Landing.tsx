import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? '/apply' : '/signup';
  const ctaLabel = user ? 'Apply for Food' : 'Get started';

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="hero-tag">Lagos-based fintech</span>
            <h1>Get what you need, when you need it.</h1>
            <p style={{ fontSize: '1.05rem', maxWidth: 540 }}>
              GroFin makes everyday essentials easier to afford. We focus on what truly matters:
              your well-being and daily living — groceries, medications, and more.
            </p>
            <div className="hero-cta">
              <Link to={ctaTo} className="btn">
                {ctaLabel}
              </Link>
              <Link to={user ? '/applications' : '/login'} className="btn btn-secondary">
                {user ? 'Apply for Medicine' : 'Sign in'}
              </Link>
            </div>
          </div>

          <div className="hero-art">
            <div>
              <div className="hero-art-label">Sample loan</div>
              <div className="hero-art-amount">₦150,000</div>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <Row label="Groceries" value="₦90,000" />
              <Row label="Medications" value="₦60,000" />
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.25)' }} />
              <Row label="Status" value="Approved" emphasis />
            </div>
          </div>
        </div>
      </section>

      <section className="container features">
        <Feature
          n="1"
          title="Apply in Minutes"
          body="Enter your details and get instant eligibility check. We use simple, modern checks to approve eligible customers quickly."
        />
        <Feature
          n="2"
          title="Shop at Partner Stores"
          body="Select groceries or medication from approved vendors. We focus on what matters: your health and your home."
        />
        <Feature
          n="3"
          title="Pay Later Easily"
          body="We pay the store instantly, you repay on your own schedule. Flexible repayment designed for real life in Nigeria"
        />
      </section>

      <section className="container" style={{ padding: '1rem 1.25rem 3rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>Ready to apply?</h2>
          <p>Create an account and submit your loan request — it only takes a few minutes.</p>
          <Link to={ctaTo} className="btn">{ctaLabel}</Link>
        </div>
      </section>
    </>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: emphasis ? 700 : 500 }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Feature({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="feature">
      <div className="feature-icon">{n}</div>
      <h3>{title}</h3>
      <p style={{ marginBottom: 0 }}>{body}</p>
    </div>
  );
}
