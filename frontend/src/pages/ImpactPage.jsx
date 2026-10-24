import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Utensils, HeartHandshake, ShieldCheck, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function ImpactPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetch('/api/impact/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>Loading verified impact data...</div>;
  }

  return (
    <div className="container page-enter" style={{ maxWidth: '860px', padding: '2rem 1.25rem 4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--deep-clay)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '0.75rem'
          }}
        >
          <ShieldCheck size={16} color="var(--accent-primary)" />
          <span>Strictly Verified Database Metrics</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
          Real Redistribution Impact
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
          FoodBridge AI reports only actual, confirmed food collections. We do not inflate numbers or claim meals merely listed or recommended as "saved".
        </p>
      </div>

      {/* Main 4 Metric Cards */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #16A34A' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Confirmed Meals Collected
            </span>
            <CheckCircle2 size={20} color="#16A34A" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#16A34A' }}>
            {metrics?.verifiedCollectedQuantity || 0}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Portions verified as physically picked up by shelters or individuals across {metrics?.totalCompletedDeliveries || 0} distribution handoffs.
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Food Listed
            </span>
            <Utensils size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
            {metrics?.totalListedQuantity || 0}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Total food quantities listed by restaurants, bakeries, hostels, and community members.
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #B45309' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Currently Reserved Food
            </span>
            <Award size={20} color="#B45309" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#B45309' }}>
            {metrics?.totalReservedQuantity || 0}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Portions actively locked in pending or accepted reservations awaiting pickup.
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--deep-clay)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Requests Fully Fulfilled
            </span>
            <HeartHandshake size={20} color="var(--deep-clay)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
            {metrics?.requestsFulfilledCount || 0}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Community food requests where 100% of the requested food was successfully delivered.
          </p>
        </div>
      </div>

      {/* Demo vs Real Database Records Distinction */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Database size={18} color="var(--deep-clay)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
            Audit Transparency: Demo vs User Records
          </h3>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
          In accordance with ground rules, we distinguish mock demo records from user-created entries in SQLite:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Seed Demo Listings</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              {metrics?.demoVsUserBreakdown?.demoDonations || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created by seed.js script</div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Live User Listings</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {metrics?.demoVsUserBreakdown?.userDonations || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created via web forms</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {metrics?.categoryStats && metrics.categoryStats.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '1rem' }}>
            Available Food by Category
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {metrics.categoryStats.map((cat) => (
              <div key={cat.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{cat.category.replace('_', ' ')}</span>
                  <span><strong>{cat.total_available} units</strong> ({cat.count} listings)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: 'var(--accent-primary)',
                      width: `${Math.min(100, Math.max(10, (cat.total_available / (metrics.availableFoodQuantity || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
