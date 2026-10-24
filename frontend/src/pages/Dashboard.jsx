import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Utensils, HeartHandshake, Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Activity, Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import RescueFlowModal from '../components/RescueFlowModal.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [myDonations, setMyDonations] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [wasteInsights, setWasteInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  // RescueFlow modal state
  const [rescueDonationId, setRescueDonationId] = useState(null);
  const [rescueModalOpen, setRescueModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [metRes, donRes, reqRes, insRes] = await Promise.all([
        fetch('/api/impact/metrics'),
        fetch('/api/donations/my'),
        fetch('/api/requests/my'),
        fetch('/api/ai/waste-insights')
      ]);

      if (metRes.ok) setMetrics(await metRes.json());
      if (donRes.ok) {
        const d = await donRes.json();
        setMyDonations(d.donations || []);
      }
      if (reqRes.ok) {
        const r = await reqRes.json();
        setMyRequests(r.requests || []);
      }
      if (insRes.ok) {
        setWasteInsights(await insRes.json());
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openRescueFlow = (donId) => {
    setRescueDonationId(donId);
    setRescueModalOpen(true);
  };

  return (
    <div className="container page-enter" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Header with Greeting & Quick Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            {t('dash_welcome')}, {user ? user.name : 'Partner'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Locality: <strong>{user?.area}, {user?.district}</strong> • Account: <strong>{user?.org_type}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link to="/donations/create" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>Share Surplus Food</span>
          </Link>
          <Link to="/requests/create" className="btn btn-secondary">
            <HeartHandshake size={18} />
            <span>Post Food Request</span>
          </Link>
        </div>
      </div>

      {/* Real Metrics Cards Grid */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('dash_available_food')}
            </span>
            <Utensils size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
            {metrics ? metrics.availableFoodQuantity : 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            across {metrics ? metrics.activeDonationsCount : 0} active listings
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Outstanding Needs
            </span>
            <HeartHandshake size={18} color="var(--deep-clay)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
            {metrics ? metrics.outstandingFoodQuantity : 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            across {metrics ? metrics.openRequestsCount : 0} open requests
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Pending Reservations
            </span>
            <Clock size={18} color="#B45309" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309' }}>
            {metrics ? metrics.pendingReservationsCount : 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            awaiting pickup approvals
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('dash_verified_collected')}
            </span>
            <CheckCircle2 size={18} color="#16A34A" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16A34A' }}>
            {metrics ? metrics.verifiedCollectedQuantity : 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            strictly confirmed collections
          </div>
        </div>
      </div>

      {/* AI Feature D — Food Waste Insights Card */}
      {wasteInsights && (
        <div
          className="card"
          style={{
            marginBottom: '2.5rem',
            borderLeft: '4px solid var(--accent-primary)',
            backgroundColor: '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              Food Waste & Recovery Insights
            </h3>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              {wasteInsights.isDataSufficient ? 'Gemini Analyzed' : 'Descriptive Baseline'}
            </span>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            {wasteInsights.summary}
          </p>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <strong>Recommendation:</strong> {wasteInsights.recommendation}
          </div>
        </div>
      )}

      {/* Two Column Section: My Active Requests & My Active Donations */}
      <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
        {/* User Requests */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              My Food Requests ({myRequests.length})
            </h3>
            <Link to="/my-requests" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              View All →
            </Link>
          </div>

          {myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No food requests posted yet.
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/requests/create" className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                  Post a Request
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myRequests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-base)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{req.title}</div>
                    <span className={`badge ${req.status === 'Open' ? 'badge-available' : 'badge-reserved'}`}>
                      {req.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span>Quantity: <strong>{req.quantity} {req.unit}</strong></span>
                    <span>Remaining Need: <strong>{req.outstanding_quantity} {req.unit}</strong></span>
                    <span>Needed by: <strong>{new Date(req.needed_by).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Link
                      to={`/matches/request/${req.id}`}
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                    >
                      Find Matching Surplus
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Donations */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              My Surplus Listings ({myDonations.length})
            </h3>
            <Link to="/my-donations" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              View All →
            </Link>
          </div>

          {myDonations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              You have not listed any surplus food yet.
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/donations/create" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                  List Surplus Food
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myDonations.slice(0, 3).map((don) => (
                <div
                  key={don.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-base)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{don.title}</div>
                    <span className={`badge ${don.status === 'Available' ? 'badge-available' : 'badge-reserved'}`}>
                      {don.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span>Available: <strong>{don.available_quantity} / {don.quantity} {don.unit}</strong></span>
                    <span>Reserved: <strong>{don.reserved_quantity} {don.unit}</strong></span>
                    <span>Deadline: <strong>{new Date(don.collection_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {don.available_quantity > 0 && don.status !== 'Cancelled' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                        onClick={() => openRescueFlow(don.id)}
                      >
                        <Layers size={13} />
                        <span>RescueFlow</span>
                      </button>
                    )}
                    <Link
                      to={`/donations/${don.id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                    >
                      Manage Listing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Platform Activity Audit Trail */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Activity size={18} color="var(--deep-clay)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
            {t('dash_recent_activity')}
          </h3>
        </div>

        {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {metrics.recentActivity.slice(0, 6).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <strong>{item.user_name || 'System'}</strong>: {item.action.replace(/_/g, ' ')}
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({item.entity_type} #{item.entity_id})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            No recent activity recorded yet.
          </div>
        )}
      </div>

      {/* RescueFlow Modal */}
      {rescueModalOpen && (
        <RescueFlowModal
          isOpen={rescueModalOpen}
          onClose={() => setRescueModalOpen(false)}
          donationId={rescueDonationId}
          onConfirmed={loadDashboardData}
        />
      )}
    </div>
  );
}
