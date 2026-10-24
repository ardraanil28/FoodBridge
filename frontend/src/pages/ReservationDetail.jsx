import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Phone, Mail, Share2, ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [reservation, setReservation] = useState(null);
  const [collections, setCollections] = useState([]);
  const [contactAuthorized, setContactAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Collection modal state
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectQty, setCollectQty] = useState('');
  const [isFinalCollection, setIsFinalCollection] = useState(true);
  const [collectNotes, setCollectNotes] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) throw new Error('Reservation not found');
      const data = await res.json();
      setReservation(data.reservation);
      setCollections(data.collections || []);
      setContactAuthorized(data.contactAuthorized);
      setCollectQty(data.reservation.quantity - (data.reservation.collected_quantity || 0));
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

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Accepted by donor.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept');
      addToast({ message: 'Reservation accepted! Coordination details unlocked.', type: 'success' });
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please enter a reason for declining:');
    if (reason === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Declined' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      addToast({ message: 'Reservation declined and quantities safely restored.', type: 'info' });
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      addToast({ message: 'Reservation cancelled and quantities restored.', type: 'info' });
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCollection = async (e) => {
    e.preventDefault();
    const qty = parseFloat(collectQty);
    if (isNaN(qty) || qty <= 0) {
      addToast({ message: 'Please enter a valid collected quantity.', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityCollected: qty,
          isFinal: isFinalCollection,
          notes: collectNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record collection');

      addToast({
        message: `Collection confirmed: ${qty} ${reservation.donation_unit} recorded into impact!`,
        type: 'success'
      });
      setCollectModalOpen(false);
      loadData();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>Loading reservation...</div>;
  }
  if (!reservation) {
    return <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>Reservation not found.</div>;
  }

  const isDonor = user?.id === reservation.donor_id;
  const isRequester = user?.id === reservation.requester_id;
  const otherPartyName = isDonor ? reservation.requester_name : reservation.donor_name;
  const otherPartyPhone = isDonor ? reservation.requester_phone : reservation.donor_phone;

  // WhatsApp share link
  const cleanPhone = otherPartyPhone ? otherPartyPhone.replace(/[^0-9]/g, '') : '';
  const waText = encodeURIComponent(`Hello! Re: FoodBridge reservation #${reservation.id} for "${reservation.donation_title}". Coordinating pickup at ${reservation.donation_area}.`);
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : null;

  return (
    <div className="container page-enter" style={{ maxWidth: '780px', padding: '2rem 1.25rem 4rem' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Reservation #{reservation.id}</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
              {reservation.donation_title}
            </h1>
          </div>

          <span className={`badge ${['accepted', 'completed'].includes(reservation.status) ? 'badge-available' : (reservation.status === 'pending' ? 'badge-reserved' : 'badge-neutral')}`}>
            {reservation.status}
          </span>
        </div>

        {/* Quantities summary */}
        <div
          style={{
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Reserved Quantity
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
              {reservation.quantity} {reservation.donation_unit}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Actually Collected
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16A34A' }}>
              {reservation.collected_quantity || 0} {reservation.donation_unit}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Uncollected Balance
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
              {reservation.uncollected_quantity || Math.max(0, reservation.quantity - (reservation.collected_quantity || 0))} {reservation.donation_unit}
            </div>
          </div>
        </div>

        {/* Pickup Locality & Deadline */}
        <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} color="var(--deep-clay)" />
            <span>Pickup Locality: <strong>{reservation.donation_area}, {reservation.donation_district}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--text-secondary)" />
            <span>Deadline: <strong>{new Date(reservation.donation_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(reservation.donation_deadline).toLocaleDateString()})</strong></span>
          </div>
        </div>

        {/* Contact Privacy Box (Section 4) */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            backgroundColor: contactAuthorized ? 'var(--accent-light)' : 'var(--bg-base)',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--deep-clay)', marginBottom: '0.35rem' }}>
            {contactAuthorized ? 'Pickup Coordination & Contact Unlocked' : 'Contact Details Protected'}
          </div>

          {contactAuthorized ? (
            <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>Other Party: <strong>{otherPartyName}</strong></div>
              {otherPartyPhone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <span>📞 <strong>{otherPartyPhone}</strong></span>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', height: '30px', color: '#16A34A' }}
                    >
                      <Share2 size={14} />
                      WhatsApp Coordination
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>No phone number registered by party.</div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              For user privacy, direct contact details remain hidden until the donor formally accepts this reservation request.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          {isDonor && reservation.status === 'pending' && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAccept}
                disabled={actionLoading}
              >
                <Check size={16} />
                Accept Reservation
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: '#DC2626' }}
                onClick={handleReject}
                disabled={actionLoading}
              >
                <X size={16} />
                Decline
              </button>
            </>
          )}

          {/* Confirm Collection (Section 9 & 10) */}
          {['accepted', 'partially_collected'].includes(reservation.status) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCollectModalOpen(true)}
              disabled={actionLoading}
            >
              <CheckCircle2 size={16} />
              Confirm Actual Food Pickup
            </button>
          )}

          {['pending', 'accepted'].includes(reservation.status) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </div>

      {/* Collection Audit Log */}
      {collections.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.75rem' }}>
            Confirmed Collection Records ({collections.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {collections.map((cr) => (
              <div
                key={cr.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <strong>{cr.quantity_collected} {reservation.donation_unit} collected</strong>
                  {cr.notes && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>— "{cr.notes}"</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(cr.collected_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collection Confirmation Modal */}
      {collectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(41, 38, 37, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setCollectModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
              Confirm Food Collection
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              FoodBridge AI records only verified, confirmed pickups towards public impact numbers. Support partial pickups if fewer portions were collected.
            </p>

            <form onSubmit={handleConfirmCollection}>
              <div className="form-group">
                <label className="form-label" htmlFor="col-qty">
                  Quantity Actually Collected ({reservation.donation_unit}) *
                </label>
                <input
                  id="col-qty"
                  type="number"
                  step="any"
                  min="0.1"
                  max={reservation.quantity - (reservation.collected_quantity || 0)}
                  className="form-input"
                  value={collectQty}
                  onChange={(e) => setCollectQty(e.target.value)}
                  required
                />
                <div className="form-hint">
                  Reserved: {reservation.quantity} {reservation.donation_unit}
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isFinalCollection}
                    onChange={(e) => setIsFinalCollection(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                  />
                  <span>
                    This concludes collection (any uncollected balance will be released back to the donor)
                  </span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="col-notes">Notes (Optional)</label>
                <input
                  id="col-notes"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 12 portions picked up by volunteer Rahul"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCollectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Recording...' : 'Confirm Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
