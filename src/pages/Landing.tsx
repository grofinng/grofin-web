import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { impactStatsApi } from '../api/impactStats';
import { ImpactStat } from '../types';
import { StatIcon } from '../components/StatIcon';
import { CountUp } from '../components/CountUp';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useParallax } from '../hooks/useParallax';
import { useCursorGlow } from '../hooks/useCursorGlow';

const HERO_HEADING = 'Get what you need, when you need it.';

interface SampleCard {
  customer: string;
  amount: number;
  rows: { label: string; value: number }[];
  status: string;
}

interface ShopCategory {
  label: string;
  emoji: string;
  items: string;
  note?: string;
}

const SHOP_CATEGORIES: ShopCategory[] = [
  {
    label: 'Food & Beverages',
    emoji: '🍚 🥫 🧃',
    items:
      'Staple foodstuffs, packaged foods, cooking ingredients, non-alcoholic beverages, infant formula & baby food.',
  },
  {
    label: 'Household Consumables',
    emoji: '🧼 🧴 🧻',
    items: 'Cleaning products, hygiene products, toiletries, tissue & sanitary products.',
  },
  {
    label: 'Pharmaceutical & Medical',
    emoji: '💊 🩹 🩺',
    items:
      'Over-the-counter drugs, vitamins & supplements, medical devices, first aid supplies.',
    note: 'Prescription medicines via licensed pharmacies only',
  },
  {
    label: 'Agricultural Inputs',
    emoji: '🌾 🌱 🚜',
    items: 'Fertiliser and crop protection products.',
    note: 'Approved agri-focused partners only',
  },
];

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

  useScrollReveal(stats);
  useParallax();
  useCursorGlow();

  const sampleCards: SampleCard[] = useMemo(
    () => [
      {
        customer: customerName,
        amount: 150000,
        rows: [
          { label: 'Groceries', value: 90000 },
          { label: 'Medications', value: 60000 },
        ],
        status: 'Approved',
      },
      {
        customer: 'Tunde Bello',
        amount: 80000,
        rows: [{ label: 'Groceries', value: 80000 }],
        status: 'Approved',
      },
      {
        customer: 'Chinonso Eze',
        amount: 250000,
        rows: [
          { label: 'Groceries', value: 150000 },
          { label: 'Medications', value: 100000 },
        ],
        status: 'Processing',
      },
      {
        customer: 'Adunni Lawal',
        amount: 45000,
        rows: [{ label: 'Medications', value: 45000 }],
        status: 'Approved',
      },
    ],
    [customerName]
  );

  const [cardIndex, setCardIndex] = useState(0);
  useEffect(() => {
    const total = sampleCards.length;
    const id = window.setInterval(() => setCardIndex((i) => (i + 1) % total), 4500);
    return () => clearInterval(id);
  }, [sampleCards.length]);

  const current = sampleCards[cardIndex];

  return (
    <>
      <section className="hero">
        <div className="hero-mesh" data-parallax="0.18" aria-hidden="true" />
        <div className="hero-mesh hero-mesh-2" data-parallax="-0.10" aria-hidden="true" />
        <div className="container hero-grid">
          <div>
            <span className="hero-tag">Lagos-based fintech</span>
            <h1 className="hero-h1">
              {HERO_HEADING.split(' ').map((w, i) => (
                <span
                  key={i}
                  className="hero-word"
                  style={{ ['--word-delay' as string]: `${i * 70}ms` } as CSSProperties}
                >
                  {w}{' '}
                </span>
              ))}
            </h1>
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
            <div key={cardIndex} className="hero-art-slide">
              <div className="hero-art-head">
                <div>
                  <div className="hero-art-label">Sample loan</div>
                  <div className="hero-art-amount">₦{current.amount.toLocaleString()}</div>
                </div>
                <span className="hero-art-badge">
                  <img src="/Esena-logo.jpeg" alt="Esena Africa" />
                </span>
              </div>

              <div>
                <div className="hero-art-label">Customer</div>
                <div className="hero-art-name">{current.customer}</div>
              </div>

              <div className="hero-art-rows">
                {current.rows.map((r, i) => (
                  <Row key={i} label={r.label} value={`₦${r.value.toLocaleString()}`} />
                ))}
                <hr className="hero-art-divider" />
                <Row label="Status" value={current.status} emphasis />
              </div>

              <div className="hero-art-dots" aria-hidden="true">
                {sampleCards.map((_, i) => (
                  <span key={i} className={`hero-art-dot ${i === cardIndex ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cat-orbit-section">
        <h2 className="section-heading reveal">Essentials you can shop with Esena</h2>
        <p className="cat-orbit-sub reveal reveal-2">
          Your loan works across four categories of everyday essentials at our approved partner
          stores.
        </p>
        <div className="cat-orbit-scene reveal reveal-3">
          <div className="cat-orbit-ring">
            {/* Categories rendered twice around the ring (45° apart) so the next
                card is already peeking in while the current one faces front. */}
            {[...SHOP_CATEGORIES, ...SHOP_CATEGORIES].map((c, i, all) => (
              <article
                key={`${c.label}-${i}`}
                className={`cat-card${i >= SHOP_CATEGORIES.length ? ' cat-card-dup' : ''}`}
                style={
                  {
                    ['--cat-angle' as string]: `${(360 / all.length) * i}deg`,
                  } as CSSProperties
                }
              >
                <span className="cat-chip">{c.label}</span>
                <div className="cat-visual" aria-hidden="true">{c.emoji}</div>
                <p className="cat-items">{c.items}</p>
                {c.note && <span className="cat-note">{c.note}</span>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container features">
        <h2 className="section-heading reveal">How it works</h2>
        <Feature
          n="1"
          delayClass="reveal-1"
          title="Apply in Minutes"
          body="Enter your details and get an instant eligibility check. We use simple, modern checks to approve eligible customers quickly."
        />
        <Feature
          n="2"
          delayClass="reveal-2"
          title="Shop at Partner Stores"
          body="Select groceries or medication from approved vendors. We focus on what matters: your health and your home."
        />
        <Feature
          n="3"
          delayClass="reveal-3"
          title="Pay Later Easily"
          body="We pay the store instantly, you repay on your own schedule. Flexible repayment designed for real life in Nigeria."
        />
      </section>

      {stats.length > 0 && (
        <section className="container impact-section">
          <h2 className="section-heading reveal">Our impact so far</h2>
          <div className="impact-grid">
            {chunk(stats, 2).map((pair, i) => (
              <div
                className={`impact-card-grouped ${i === 0 ? 'green' : 'plain glow'} reveal reveal-${Math.min(i + 1, 4)}`}
                key={pair.map((s) => s._id).join('|')}
              >
                {pair.map((s, j) => (
                  <div key={s._id}>
                    <div className="impact-row">
                      <span className="impact-icon-chip" aria-hidden="true">
                        <StatIcon icon={s.icon} size={22} />
                      </span>
                      <div>
                        <div className="impact-value">
                          <CountUp value={s.value} />
                        </div>
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
          <h2 className="section-heading reveal">Get in touch</h2>
          <div className="card extra-card glow reveal reveal-1">
            <h3>Have a question?</h3>
            <p>Send a message and our team will get back to you by email.</p>
            <Link to="/contact" className="btn btn-secondary">Contact us</Link>
          </div>
          <div className="card extra-card glow reveal reveal-2">
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

function Feature({
  n,
  title,
  body,
  delayClass = '',
}: {
  n: string;
  title: string;
  body: string;
  delayClass?: string;
}) {
  return (
    <div className={`feature glow reveal ${delayClass}`.trim()}>
      <div className="feature-icon">{n}</div>
      <h3>{title}</h3>
      <p style={{ marginBottom: 0 }}>{body}</p>
    </div>
  );
}
