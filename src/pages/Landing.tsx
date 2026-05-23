import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { impactStatsApi } from '../api/impactStats';
import { ImpactStat } from '../types';
import { StatIcon } from '../components/StatIcon';

export function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? '/apply' : '/signup';
  const ctaLabel = user ? 'Apply for Food' : 'Get started';
  const customerName = user ? `${user.firstName} ${user.surname}` : 'Amaka Okafor';
  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  const [stats, setStats] = useState<ImpactStat[]>([]);
  useEffect(() => {
    let cancelled = false;
    impactStatsApi
      .list()
      .then((list) => !cancelled && setStats(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="hero-tag">Lagos-based fintech</span>
            <h1>Get what you need, when you need it.</h1>
            <p style={{ fontSize: '1.05rem', maxWidth: 540 }}>
              Esena Africa makes everyday essentials easier to afford. We focus on what truly matters:
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
            <div className="hero-art-head">
              <div>
                <div className="hero-art-label">Sample loan</div>
                <div className="hero-art-amount">₦150,000</div>
              </div>
              <span className="hero-art-badge">
                <img src="/Esena-logo.jpeg" alt="Esena Africa" />
              </span>
            </div>

            <div>
              <div className="hero-art-label">Customer</div>
              <div className="hero-art-name">{customerName}</div>
            </div>

            <div className="hero-art-rows">
              <Row label="Groceries" value="₦90,000" />
              <Row label="Medications" value="₦60,000" />
              <hr className="hero-art-divider" />
              <Row label="Status" value="Approved" emphasis />
            </div>
          </div>
        </div>
      </section>
      <section className="container features">
        <h2 className="section-heading">How it works</h2>
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

      {stats.length > 0 && (
        <section className="container impact-section">
          <h2 className="section-heading">Our impact so far</h2>
          <div className="impact-grid">
            {chunk(stats, 2).map((pair, i) => (
              <div
                className={`impact-card-grouped ${i === 0 ? 'green' : 'plain'}`}
                key={pair.map((s) => s._id).join('|')}
              >
                {pair.map((s, j) => (
                  <div key={s._id}>
                    <div className="impact-row">
                      <span className="impact-icon-chip" aria-hidden="true">
                        <StatIcon icon={s.icon} size={22} />
                      </span>
                      <div>
                        <div className="impact-value">{s.value}</div>
                        <div className="impact-label">{s.label}</div>
                      </div>
                    </div>
                    {j < pair.length - 1 && <hr className="impact-row-divider" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isStaff && (
        <section className="container landing-extras">
          <h2 className="section-heading">Get in touch</h2>
          <div className="card extra-card">
            <h3>Have a question?</h3>
            <p>Send a message and our team will get back to you by email.</p>
            <Link to="/contact" className="btn btn-secondary">Contact us</Link>
          </div>
          <div className="card extra-card">
            <h3>Run a pharmacy or grocery store?</h3>
            <p>Apply to partner with Esena Africa and serve our customers.</p>
            <Link to="/partner" className="btn btn-secondary">Partner with us</Link>
          </div>
        </section>
      )}
    </>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
