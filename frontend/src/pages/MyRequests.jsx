import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, HeartHandshake, ArrowRight, Edit } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requests/my');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="container page-enter" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            {t('nav_my_requests')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Track your food support requests and view automated surplus recommendations.
          </p>
        </div>

        <Link to="/requests/create" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>{t('btn_request_food')}</span>
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading your requests...</div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <HeartHandshake size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
            No community requests submitted yet
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Post a request for your shelter or group, and FoodBridge AI will immediately match available surplus.
          </p>
          <Link to="/requests/create" className="btn btn-primary">
            Post Food Request
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((req) => (
            <div
              key={req.id}
              className="card"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                borderLeft: `4px solid ${req.status === 'Open' ? 'var(--accent-primary)' : 'var(--deep-clay)'}`
              }}
            >
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className={`badge ${req.status === 'Open' ? 'badge-available' : 'badge-reserved'}`}>
                    {req.status}
                  </span>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {req.dietary_requirements}
                  </span>
                  {req.active_reservations_count > 0 && (
                    <span className="badge badge-warning">
                      {req.active_reservations_count} Active Reservation(s)
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.35rem' }}>
                  {req.title}
                </h3>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>Requested: <strong>{req.quantity} {req.unit}</strong></span>
                  <span>Reserved: <strong>{req.reserved_quantity} {req.unit}</strong></span>
                  <span>Collected: <strong>{req.collected_quantity} {req.unit}</strong></span>
                  <span>Remaining Need: <strong>{req.outstanding_quantity} {req.unit}</strong></span>
                  <span>Locality: <strong>{req.area}, {req.district}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/requests/${req.id}/edit`} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}>
                  <Edit size={14} />
                  <span>Edit</span>
                </Link>
                <Link to={`/matches/request/${req.id}`} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                  <span>View Matches</span>
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
