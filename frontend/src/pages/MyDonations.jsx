import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Utensils, Clock, MapPin, Edit, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function MyDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const loadDonations = async () => {
    try {
      const res = await fetch('/api/donations/my');
      if (res.ok) {
        const data = await res.json();
        setDonations(data.donations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  return (
    <div className="container page-enter" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            {t('nav_my_donations')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Manage your surplus listings, monitor pickups, and approve reservations.
          </p>
        </div>

        <Link to="/donations/create" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>{t('btn_donate_food')}</span>
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading your donations...</div>
      ) : donations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Utensils size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
            You haven't listed any surplus food yet
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Have extra meals from catering or your kitchen? Share them in minutes.
          </p>
          <Link to="/donations/create" className="btn btn-primary">
            List Food Surplus
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {donations.map((don) => (
            <div
              key={don.id}
              className="card"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                borderLeft: `4px solid ${don.status === 'Available' ? 'var(--accent-primary)' : 'var(--deep-clay)'}`
              }}
            >
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className={`badge ${don.status === 'Available' ? 'badge-available' : 'badge-reserved'}`}>
                    {don.status}
                  </span>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {don.category.replace('_', ' ')}
                  </span>
                  {don.pending_reservations_count > 0 && (
                    <span className="badge badge-warning">
                      {don.pending_reservations_count} Pending Review
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.35rem' }}>
                  {don.title}
                </h3>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>Available: <strong>{don.available_quantity} / {don.quantity} {don.unit}</strong></span>
                  <span>Reserved: <strong>{don.reserved_quantity} {don.unit}</strong></span>
                  <span>Collected: <strong>{don.collected_quantity} {don.unit}</strong></span>
                  <span>Locality: <strong>{don.area}, {don.district}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/donations/${don.id}/edit`} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}>
                  <Edit size={14} />
                  <span>Edit</span>
                </Link>
                <Link to={`/donations/${don.id}`} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                  <span>Manage Reservations</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
