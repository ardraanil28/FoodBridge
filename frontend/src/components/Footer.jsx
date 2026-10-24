import React from 'react';
import { HeartHandshake, ShieldCheck, Cpu, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--border-color)',
        padding: '3rem 0 2rem',
        marginTop: 'auto'
      }}
    >
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <HeartHandshake size={22} color="var(--accent-primary)" />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
                FoodBridge AI
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A needs-first food redistribution platform connecting restaurants, hostels, and households with community kitchens in Kerala.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Redistribution
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              <Link to="/donations" style={{ color: 'var(--text-main)' }}>Browse Available Surplus</Link>
              <Link to="/requests" style={{ color: 'var(--text-main)' }}>Community Food Needs</Link>
              <Link to="/impact" style={{ color: 'var(--text-main)' }}>Verified Impact Statistics</Link>
            </div>
          </div>

          {/* Responsible AI & Safety */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Safety & AI Ethics
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>Deterministic Core:</strong> AI never decides eligibility or safety. Hard database rules prevent expired or allergen conflicts.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <Wifi size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>Low-Resource Viable:</strong> Built to operate smoothly on low-end smartphones with offline caching support.
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-light)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}
        >
          <div>
            © {new Date().getFullYear()} FoodBridge AI — Built for Social Impact & Sustainability.
          </div>
          <div>
            Terracotta Studio Palette • English & Malayalam (മലയാളം)
          </div>
        </div>
      </div>
    </footer>
  );
}
