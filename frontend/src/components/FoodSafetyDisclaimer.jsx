import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function FoodSafetyDisclaimer({ checked, onChange, required = false }) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginTop: '1.25rem',
        marginBottom: '1.25rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <ShieldAlert size={22} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#92400E', marginBottom: '0.35rem' }}>
            {t('food_safety_title')}
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#78350F', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            {t('food_safety_text')}
          </p>
          {onChange && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#92400E' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                required={required}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
              />
              <span>{t('food_safety_agree')}</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
