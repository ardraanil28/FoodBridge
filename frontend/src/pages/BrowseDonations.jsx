import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Clock, MapPin, PlusCircle, Search, Filter, AlertCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BrowseDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dietary, setDietary] = useState('');
  const [status, setStatus] = useState('');

  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    async function loadDonations() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category) params.append('category', category);
        if (dietary) params.append('dietary_class', dietary);
        if (status) params.append('status', status);

        const res = await fetch(`/api/donations?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDonations(data.donations || []);
        }
      } catch (err) {
        console.error('Failed to load donations:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadDonations, 250);
    return () => clearTimeout(timer);
  }, [search, category, dietary, status]);

  return (
    <div className="container page-enter" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            {t('nav_donations')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Available food surplus listed by verified community donors in Kerala.
          </p>
        </div>

        <Link to="/donations/create" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>{t('btn_donate_food')}</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
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
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '13px', left: '12px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search by food title or item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="cooked_meals">Cooked Meals</option>
          <option value="bakery">Bakery & Bread</option>
          <option value="raw_produce">Fresh Produce / Veg</option>
          <option value="packaged_groceries">Packaged Groceries</option>
          <option value="beverages">Beverages</option>
        </select>

        <select
          className="form-select"
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
        >
          <option value="">All Dietary Classes</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="non-vegetarian">Non-Vegetarian</option>
          <option value="unknown">Unknown</option>
        </select>

        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Active (Available & Partial)</option>
          <option value="Available">Available Only</option>
          <option value="Partially reserved">Partially Reserved</option>
          <option value="Fully reserved">Fully Reserved</option>
          <option value="Collected">Collected</option>
        </select>
      </div>

      {/* List of Donations */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading available surplus listings...
        </div>
      ) : donations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Utensils size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
            No surplus listings match your filters
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Try widening your filters or be the first to list surplus food in your area.
          </p>
          <Link to="/donations/create" className="btn btn-primary">
            List Food Surplus Now
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {donations.map((don) => {
            const isAvailable = don.status === 'Available';
            const deadline = new Date(don.collection_deadline);
            const isExpiringSoon = (deadline.getTime() - Date.now()) < (3 * 3600000);

            return (
              <div key={don.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <span className={`badge ${isAvailable ? 'badge-available' : 'badge-reserved'}`}>
                      {don.status}
                    </span>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {don.dietary_class}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                    {don.title}
                  </h3>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    By <strong>{don.donor_name}</strong> ({don.donor_org_type})
                  </div>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1rem', minHeight: '40px' }}>
                    {don.description || 'Fresh surplus food available for prompt pickup.'}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Utensils size={15} color="var(--accent-primary)" />
                      <span>
                        Available: <strong>{don.available_quantity} {don.unit}</strong> (Total: {don.quantity})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={15} color="var(--deep-clay)" />
                      <span>
                        {don.area}, {don.district}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpiringSoon ? '#B45309' : undefined }}>
                      <Clock size={15} color={isExpiringSoon ? '#B45309' : 'var(--text-secondary)'} />
                      <span>
                        Must collect by: <strong>{deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({deadline.toLocaleDateString()})</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                  <Link
                    to={`/donations/${don.id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  >
                    View Details
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
