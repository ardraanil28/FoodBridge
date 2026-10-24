import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Utensils, MapPin, Clock, ShieldAlert, ArrowLeft, Flag, Edit, Check, X, AlertTriangle, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ReportModal from '../components/ReportModal.jsx';
import RescueFlowModal from '../components/RescueFlowModal.jsx';

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [donation, setDonation] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [rescueFlowOpen, setRescueFlowOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/donations/${id}`);
      if (!res.ok) throw new Error('Donation not found');
      const data = await res.json();
      setDonation(data.donation);
      setReservations(data.reservations || []);
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAcceptReservation = async (reservationId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Accepted by donor. Ready for collection.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept');
      addToast({ message: 'Reservation accepted! Recipient notified.', type: 'success' });
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReservation = async (reservationId) => {
    const reason = prompt('Please provide a reason for declining this reservation:');
    if (reason === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Declined by donor' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline');
      addToast({ message: 'Reservation declined and quantity released.', type: 'info' });
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDonation = async () => {
    if (!confirm('Are you sure you want to cancel this surplus donation?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/donations/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel donation');
      addToast({ message: 'Donation cancelled successfully.', type: 'info' });
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>Loading donation details...</div>;
  }
  if (!donation) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <h2>Donation listing not found</h2>
        <Link to="/donations" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Surplus</Link>
      </div>
    );
  }

  const isOwner = user && user.id === donation.donor_id;

  return (
    <div className="container page-enter" style={{ maxWidth: '820px', padding: '2rem 1.25rem 4rem' }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="card" style={{ marginBottom: '2rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`badge ${donation.status === 'Available' ? 'badge-available' : 'badge-reserved'}`}>
              {donation.status}
            </span>
            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
              {donation.dietary_class}
            </span>
            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
              {donation.category.replace('_', ' ')}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {isOwner ? (
              <>
                {donation.available_quantity > 0 && donation.status !== 'Cancelled' && donation.status !== 'Expired' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => setRescueFlowOpen(true)}
                  >
                    <Layers size={14} />
                    <span>RescueFlow: Find Backup Recipients</span>
                  </button>
                )}
                <Link to={`/donations/${donation.id}/edit`} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                  <Edit size={14} />
                  <span>Edit</span>
                </Link>
                {donation.status !== 'Cancelled' && donation.status !== 'Collected' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', color: '#DC2626' }}
                    onClick={handleCancelDonation}
                    disabled={actionLoading}
                  >
                    Cancel Listing
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setReportModalOpen(true)}
              >
                <Flag size={14} color="var(--deep-clay)" />
                <span>Report</span>
              </button>
            )}
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
          {donation.title}
        </h1>

        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Listed by <strong>{donation.donor_name}</strong> ({donation.donor_org_type})
        </div>

        {donation.image_url && (
          <div style={{ marginBottom: '1.25rem' }}>
            <img
              src={donation.image_url}
              alt={donation.title}
              style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
            />
          </div>
        )}

        <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {donation.description || 'No additional description provided.'}
        </p>

        {/* Quantities & Location Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Available Quantity
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {donation.available_quantity} <span style={{ fontSize: '0.9rem' }}>{donation.unit}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: {donation.quantity} • Reserved: {donation.reserved_quantity} • Collected: {donation.collected_quantity}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Pickup Locality
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              {donation.area}, {donation.district}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Storage: <strong>{donation.storage_info}</strong>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Collection Deadline
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#B45309' }}>
              {new Date(donation.collection_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Date: {new Date(donation.collection_deadline).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Declared Allergens info */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Declared Allergens:
          </div>
          {donation.declared_allergens && donation.declared_allergens.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {donation.declared_allergens.map((alg) => (
                <span key={alg} className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                  {alg}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No common allergens declared by donor.
            </span>
          )}
          {Boolean(donation.has_unknown_allergens) && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={15} />
              <span>Donor noted uncertified or unknown allergen status. Human recipient review required.</span>
            </div>
          )}
        </div>

        {/* Food Safety Notice */}
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
          Food safety responsibility lies with the donor. FoodBridge AI does not certify safety.
        </div>
      </div>

      {/* If Owner: Active Reservations Management */}
      {isOwner && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '1rem' }}>
            Active Reservations for this Donation ({reservations.length})
          </h3>

          {reservations.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              No active reservations currently received for this food.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reservations.map((res) => (
                <div
                  key={res.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-base)'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <strong>Reservation #{res.id}</strong> by <strong>{res.requester_name}</strong>
                    </div>
                    <span className={`badge ${res.status === 'accepted' ? 'badge-available' : 'badge-reserved'}`}>
                      {res.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Quantity: <strong>{res.quantity} {donation.unit}</strong> • From: {res.requester_area}, {res.requester_district}
                    {res.requester_phone && (
                      <span style={{ marginLeft: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        📞 {res.requester_phone}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {res.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => handleAcceptReservation(res.id)}
                          disabled={actionLoading}
                        >
                          <Check size={14} />
                          Accept Reservation
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#DC2626' }}
                          onClick={() => handleRejectReservation(res.id)}
                          disabled={actionLoading}
                        >
                          <X size={14} />
                          Decline
                        </button>
                      </>
                    )}
                    <Link
                      to={`/reservations/${res.id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      View Details & Coordination
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity History */}
      {history.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.75rem' }}>
            Listing Activity History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
            {history.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.35rem' }}>
                <span>{h.action.replace('_', ' ')}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        listingType="donation"
        listingId={donation.id}
        listingTitle={donation.title}
      />

      {/* RescueFlow Modal */}
      <RescueFlowModal
        isOpen={rescueFlowOpen}
        onClose={() => setRescueFlowOpen(false)}
        donationId={donation.id}
        onConfirmed={loadData}
      />
    </div>
  );
}
