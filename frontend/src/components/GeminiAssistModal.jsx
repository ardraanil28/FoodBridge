import React, { useState } from 'react';
import { Sparkles, X, Check, Mic } from 'lucide-react';
import VoiceInputButton from './VoiceInputButton.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function GeminiAssistModal({ isOpen, onClose, onApply }) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/parse-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse text');
      setExtracted(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndApply = () => {
    if (extracted) {
      onApply(extracted);
      onClose();
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
          maxWidth: '560px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={22} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              {t('ai_assistant_title')}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
          {t('ai_assistant_hint')}
        </p>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
            <VoiceInputButton onTranscript={(txt) => setInputText(prev => prev ? `${prev} ${txt}` : txt)} />
          </div>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder='e.g. "We have around 25 packed vegetarian meals from a lunch conference in Kakkanad, ready now, collect before 7 PM"'
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '1rem' }}
          onClick={handleExtract}
          disabled={loading || !inputText.trim()}
        >
          {loading ? 'Analyzing with Gemini...' : 'Extract Food Details'}
        </button>

        {errorMsg && (
          <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {extracted && (
          <div
            style={{
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--deep-clay)' }}>
                Proposed Form Fields
              </h4>
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                {extracted.source === 'gemini_ai' ? 'Gemini 2.5 Flash' : 'Rule Engine Fallback'}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong>Title:</strong> {extracted.title}</div>
              <div><strong>Category:</strong> {extracted.category}</div>
              <div><strong>Quantity:</strong> {extracted.quantity} {extracted.unit}</div>
              <div><strong>Dietary:</strong> {extracted.dietary_class}</div>
              <div><strong>Storage:</strong> {extracted.storage_info}</div>
              {extracted.notes_for_user && (
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {extracted.notes_for_user}
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#B45309', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
              {t('ai_disclaimer')}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.85rem' }}
              onClick={handleConfirmAndApply}
            >
              <Check size={16} />
              Review & Fill Into Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
