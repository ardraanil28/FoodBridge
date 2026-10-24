import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function ReportModal({ isOpen, onClose, listingType, listingId, listingTitle }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_type: listingType,
          listing_id: listingId,
          reason: reason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');

      addToast({ message: data.message, type: 'success' });
      setReason('');
      onClose();
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
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
          maxWidth: '460px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flag size={20} color="var(--deep-clay)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--deep-clay)' }}>Report Listing</h3>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Help us keep FoodBridge AI safe. Please tell us why you are reporting "<strong>{listingTitle}</strong>".
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="Describe concerns (e.g. hygiene concern, inaccurate quantity, misleading dietary label, inappropriate content)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !reason.trim()}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
