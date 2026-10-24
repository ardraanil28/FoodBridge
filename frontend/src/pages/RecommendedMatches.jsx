import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layers, CheckCircle2, Clock, MapPin, AlertTriangle, ArrowRight, ArrowLeft, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function RecommendedMatches() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [combination, setCombination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [geminiExplanation, setGeminiExplanation] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const loadMatches = async () => {
    try {
      const res = await fetch(`/api/matches/request/${id}`);
      if (!res.ok) throw new Error('Failed to load recommendations');
      const data = await res.json();
      setRequest(data.request);
      setMatches(data.matches || []);
      setCombination(data.combination);
    } catch (err) {
      console.error(err);
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [id]);

  // Request single allocation reservation
  const handleReserveSingle = async (donationId, quantity) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/matches/request/${id}` } } });
      return;
    }

    setReserving(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: Number(id),
          items: [{ donationId, quantity }],
          requesterNotes: `Reservation for ${quantity} ${request.unit}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reservation failed');

      addToast({
        message: 'Reservation submitted! The donor was notified.',
        type: 'success'
      });
      navigate('/my-requests');
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setReserving(false);
    }
  };

  // Reserve entire multi-donor proposed combination (Section 9 signature feature)
  const handleReserveEntireCombination = async () => {
    if (!combination || !combination.allocations) return;
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/matches/request/${id}` } } });
      return;
    }

    setReserving(true);
    try {
      const items = combination.allocations.map(a => ({
        donationId: a.donation_id,
        quantity: a.allocated_quantity
      }));

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: Number(id),
          items,
          requesterNotes: `Multi-donor batch reservation for ${combination.total_allocated} ${request.unit}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch reservation failed');

      addToast({
        message: `Multi-donor reservation created across ${combination.donor_count} donors!`,
        type: 'success'
      });
      navigate('/my-requests');
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setReserving(false);
    }
  };

  // Optional Gemini match explanation
  const handleGenerateAiExplanation = async () => {
    if (matches.length === 0) return;
    setLoadingAi(true);
    try {
      const topMatch = matches[0];
      const res = await fetch('/api/ai/explain-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchInfo: {
            score: topMatch.score,
            contributable_quantity: topMatch.contributable_quantity,
            unit: request.unit,
            reasons: topMatch.reasons,
            warnings: topMatch.warnings
          }
        })
      });
      const data = await res.json();
      if (data.explanation) {
        setGeminiExplanation(data.explanation);
      }
    } catch (err) {
      console.warn('AI explanation error:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>Running deterministic matching engine...</div>;
  }
  if (!request) {
    return <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>Food request not found.</div>;
  }

  const isOwner = user && user.id === request.requester_id;

  return (
    <div className="container page-enter" style={{ maxWidth: '860px', padding: '2rem 1.25rem 4rem' }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Request Header Banner */}
      <div className="card" style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-neutral">Needs-First Engine</span>
          <span className="badge badge-available">Status: {request.status}</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.35rem' }}>
          Recommendations for: {request.title}
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>
          <div>Outstanding Need: <strong>{request.outstanding_quantity} {request.unit}</strong></div>
          <div>Dietary: <strong>{request.dietary_requirements}</strong></div>
          <div>Locality: <strong>{request.area}, {request.district}</strong></div>
          <div>Needed by: <strong>{new Date(request.needed_by).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
        </div>
      </div>

      {/* Signature Feature: Multi-Donor Proposed Combination */}
      {combination && combination.allocations.length > 1 && (
        <div
          className="card"
          style={{
            border: '2px solid var(--accent-primary)',
            backgroundColor: '#FFFFFF',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                <Layers size={20} color="var(--accent-primary)" />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
                Multi-Donor Partial Fulfilment Proposed
              </h2>
            </div>
            <span className="badge badge-available" style={{ fontSize: '0.82rem' }}>
              {combination.fully_fulfilled ? '100% Demand Fulfilled' : `${Math.round((combination.total_allocated / combination.requested_quantity) * 100)}% Demand Met`}
            </span>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            No single donor has enough surplus, but FoodBridge AI found <strong>{combination.donor_count} compatible donors</strong> in {request.district} that together provide <strong>{combination.total_allocated} of your requested {combination.requested_quantity} {request.unit}</strong>:
          </p>

          {/* Allocation Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            {combination.allocations.map((alloc, idx) => (
              <div
                key={alloc.donation_id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--deep-clay)' }}>
                    Donor {String.fromCharCode(65 + idx)}: {alloc.donor_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    "{alloc.donation_title}" • {alloc.area} • Deadline: {new Date(alloc.collection_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    +{alloc.allocated_quantity}
                  </span>{' '}
                  <span style={{ fontSize: '0.85rem' }}>{alloc.unit}</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score: {alloc.score}/100</div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--accent-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontWeight: 700
            }}
          >
            <span>Total Combined Surplus:</span>
            <span style={{ color: 'var(--deep-clay)', fontSize: '1.15rem' }}>
              {combination.total_allocated} / {combination.requested_quantity} {request.unit}
              {combination.remaining_unmet > 0 && (
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#B45309', marginLeft: '8px' }}>
                  ({combination.remaining_unmet} {request.unit} remaining)
                </span>
              )}
            </span>
          </div>

          {isOwner ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
              onClick={handleReserveEntireCombination}
              disabled={reserving}
            >
              <CheckCircle2 size={18} />
              <span>{reserving ? 'Reserving...' : `Reserve Entire Proposed Combination (${combination.donor_count} Donors)`}</span>
            </button>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Logged in as a guest/other user. Log in as requester to confirm reservations.
            </div>
          )}
        </div>
      )}

      {/* Optional Gemini Rewritten Explanation */}
      {matches.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
            All Eligible Recommendations ({matches.length})
          </div>

          {!geminiExplanation && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.3rem 0.65rem' }}
              onClick={handleGenerateAiExplanation}
              disabled={loadingAi}
            >
              <Sparkles size={14} color="var(--accent-primary)" />
              <span>{loadingAi ? 'Summarizing...' : 'Gemini Summary'}</span>
            </button>
          )}
        </div>
      )}

      {geminiExplanation && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.88rem',
            color: '#1E40AF',
            lineHeight: 1.5
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={15} />
            <span>Gemini Match Insight:</span>
          </div>
          {geminiExplanation}
        </div>
      )}

      {/* Individual Matches List */}
      {matches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <AlertTriangle size={36} color="#D97706" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--deep-clay)', marginBottom: '0.5rem' }}>
            No eligible surplus food currently available
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem' }}>
            Our deterministic engine checked for active donations in <strong>{request.district}</strong> matching <strong>{request.unit}</strong> and <strong>{request.dietary_requirements}</strong> requirements. None currently satisfy the collection deadline and allergen criteria.
          </p>

          <div
            style={{
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              textAlign: 'left',
              maxWidth: '480px',
              margin: '0 auto',
              fontSize: '0.85rem'
            }}
          >
            <strong>Recommended Next Steps:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Extend the needed-by time window if flexible.</li>
              <li>Split the request into smaller quantities to allow more donors to match.</li>
              <li>Check back in an hour as restaurants list afternoon/evening surplus.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {matches.map((match) => {
            const don = match.donation;
            const isFullContribute = match.contributable_quantity >= request.outstanding_quantity;

            return (
              <div
                key={don.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${match.score >= 80 ? 'var(--accent-primary)' : 'var(--deep-clay)'}`
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
                      {don.title}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Donor: <strong>{don.donor_name}</strong> ({don.donor_org_type}) • {don.area}, {don.district}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {match.score}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/100</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Match Compatibility
                    </div>
                  </div>
                </div>

                {/* Score breakdown tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    Deadline: {match.breakdown.deadline}/30
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    Quantity: {match.breakdown.quantity}/25
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    Locality: {match.breakdown.locality}/20
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    Dietary: {match.breakdown.dietary}/15
                  </span>
                  {match.breakdown.fairness > 0 && (
                    <span className="badge badge-available" style={{ fontSize: '0.72rem' }}>
                      Fairness Boost: +{match.breakdown.fairness}/10
                    </span>
                  )}
                </div>

                {/* Reasons List */}
                <div style={{ backgroundColor: 'var(--bg-base)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', marginBottom: '0.85rem' }}>
                  <strong>Recommendation Reasons:</strong>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {match.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Warnings (if any) */}
                {match.warnings && match.warnings.length > 0 && (
                  <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
                    {match.warnings.map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={14} />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer bar with reserve button */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    Contributable Quantity:{' '}
                    <strong>{match.contributable_quantity} {request.unit}</strong>{' '}
                    (Available: {don.available_quantity})
                  </div>

                  {isOwner ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                      onClick={() => handleReserveSingle(don.id, match.contributable_quantity)}
                      disabled={reserving}
                    >
                      Reserve {match.contributable_quantity} {request.unit}
                    </button>
                  ) : (
                    <Link to={`/donations/${don.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                      View Donation
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
