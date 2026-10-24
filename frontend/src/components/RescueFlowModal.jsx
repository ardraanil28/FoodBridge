import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, Clock, MapPin, AlertTriangle, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function RescueFlowModal({ isOpen, onClose, donationId, onConfirmed }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen || !donationId) return;

    async function loadRescueProposal() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rescueflow/propose/${donationId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to calculate RescueFlow allocations');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        addToast({ message: err.message, type: 'error' });
        onClose();
      } finally {
        setLoading(false);
      }
    }

    loadRescueProposal();
  }, [isOpen, donationId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!data || !data.proposed_allocations || data.proposed_allocations.length === 0) return;

    setConfirming(true);
    try {
      const res = await fetch('/api/rescueflow/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId,
          allocations: data.proposed_allocations,
          notes: notes || 'Allocated via FoodBridge RescueFlow'
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to confirm RescueFlow allocations');

      addToast({
        message: `RescueFlow successfully allocated ${resData.result.totalAllocated} portions to ${resData.result.reservations.length} backup recipient(s)!`,
        type: 'success'
      });
      if (onConfirmed) onConfirmed();
      onClose();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setConfirming(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          maxWidth: '620px',
          width: '100%',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.45rem', borderRadius: 'var(--radius-sm)' }}>
              <Layers size={22} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
                FoodBridge RescueFlow™
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Recover & allocate unreserved surplus to verified backup recipients
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            Calculating eligible backup recipients and safe allocation splits...
          </div>
        ) : !data || data.proposed_allocations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <AlertTriangle size={36} color="#D97706" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
              No Eligible Backup Recipients Available
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {data?.message || `All unallocated surplus (${data?.unallocated_quantity || 0} units) currently has no active matching requests satisfying dietary and deadline criteria in this locality.`}
            </p>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <div>
            {/* Unallocated Food Banner */}
            <div
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                fontSize: '0.88rem'
              }}
            >
              <div>
                <strong>{data.donation.title}</strong> ({data.donation.area}, {data.donation.district})
              </div>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                {data.unallocated_quantity} {data.donation.unit} Available
              </div>
            </div>

            {/* AI / Algorithmic Summary */}
            {data.ai_summary && (
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.84rem',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{data.ai_summary}</span>
              </div>
            )}

            {/* Proposed Split Breakdown */}
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.65rem' }}>
              Proposed Allocation Across {data.proposed_allocations.length} Candidate(s):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {data.proposed_allocations.map((alloc, idx) => (
                <div
                  key={alloc.request_id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1rem',
                    fontSize: '0.86rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--deep-clay)' }}>
                      #{idx + 1}: {alloc.requester_name} ({alloc.requester_org_type})
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                      +{alloc.allocated_quantity} {alloc.unit}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    "{alloc.title}" • {alloc.area} • Needs: {alloc.outstanding_quantity} {alloc.unit}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Match Score: <strong>{alloc.score}/100</strong> — {alloc.reasons[0] || 'Eligible locality & category fit'}
                  </div>
                </div>
              ))}
            </div>

            {/* Unresolved Surplus Note if Any */}
            {data.unresolved_surplus > 0 && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  color: '#92400E',
                  marginBottom: '1.25rem'
                }}
              >
                <strong>Unresolved Surplus:</strong> {data.unresolved_surplus} {data.donation.unit} will remain available for future community requests.
              </div>
            )}

            {/* Optional Coordination Notes */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="rescue-notes" style={{ fontSize: '0.84rem' }}>
                Pickup & Hand-off Instructions for Backup Recipients (Optional)
              </label>
              <input
                id="rescue-notes"
                type="text"
                className="form-input"
                placeholder="e.g. Please pick up at back kitchen door before 7 PM."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={confirming}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={confirming}
              >
                <CheckCircle2 size={16} />
                <span>{confirming ? 'Creating Allocations...' : `Confirm & Allocate (${data.proposed_allocations.length} Recipients)`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
