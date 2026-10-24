import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Clock, MapPin, PlusCircle, Search, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BrowseRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [foodType, setFoodType] = useState('');
  const [dietary, setDietary] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');

  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    async function loadRequests() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (foodType) params.append('food_type', foodType);
        if (dietary) params.append('dietary_requirements', dietary);
        if (priority) params.append('priority', priority);
        if (status) params.append('status', status);

        const res = await fetch(`/api/requests?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } catch (err) {
        console.error('Failed to load requests:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadRequests, 250);
    return () => clearTimeout(timer);
  }, [foodType, dietary, priority, status]);

  return (
    <div className="container page-enter" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            {t('nav_requests')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Active food requests from shelters, community kitchens, and individuals in Kerala.
          </p>
        </div>

        <Link to="/requests/create" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>{t('btn_request_food')}</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}
      >
        <select
          className="form-select"
          value={foodType}
          onChange={(e) => setFoodType(e.target.value)}
        >
          <option value="">All Food Types</option>
          <option value="cooked_meals">Cooked Meals</option>
          <option value="bakery">Bakery & Bread</option>
          <option value="raw_produce">Fresh Produce</option>
          <option value="packaged_groceries">Packaged Groceries</option>
        </select>

        <select
          className="form-select"
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
        >
          <option value="">All Dietary Needs</option>
          <option value="vegetarian">Vegetarian Only</option>
          <option value="vegan">Vegan Only</option>
          <option value="non-vegetarian">Non-Vegetarian</option>
          <option value="any">Any Food</option>
        </select>

        <select
          className="form-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Active (Open & Partial)</option>
          <option value="Open">Open Only</option>
          <option value="Partially fulfilled">Partially Fulfilled</option>
          <option value="Fulfilled">Fully Fulfilled</option>
        </select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading community requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <HeartHandshake size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
            No community food requests match your criteria
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Are you coordinating meals for a shelter or family? Post a request to receive recommendations.
          </p>
          <Link to="/requests/create" className="btn btn-primary">
            Post Food Request
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {requests.map((req) => {
            const isUrgent = req.priority === 'urgent';
            const neededTime = new Date(req.needed_by);

            return (
              <div key={req.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <span className={`badge ${req.status === 'Open' ? 'badge-available' : 'badge-reserved'}`}>
                      {req.status}
                    </span>
                    {isUrgent && (
                      <span className="badge badge-warning">
                        Urgent Need
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                    {req.title}
                  </h3>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Requested by <strong>{req.requester_name}</strong> ({req.requester_org_type})
                  </div>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1rem', minHeight: '36px' }}>
                    {req.description || 'Community food assistance request.'}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <HeartHandshake size={15} color="var(--accent-primary)" />
                      <span>
                        Needed: <strong>{req.outstanding_quantity} {req.unit}</strong> (Total: {req.quantity})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={15} color="var(--deep-clay)" />
                      <span>{req.area}, {req.district}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={15} color="var(--text-secondary)" />
                      <span>
                        Needed by: <strong>{neededTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({neededTime.toLocaleDateString()})</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <Link
                    to={`/matches/request/${req.id}`}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    View Matching Surplus
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
