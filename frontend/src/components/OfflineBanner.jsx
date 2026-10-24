import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      style={{
        backgroundColor: '#FEF3C7',
        color: '#92400E',
        padding: '0.65rem 1rem',
        textAlign: 'center',
        fontSize: '0.88rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderBottom: '1px solid #FDE68A'
      }}
    >
      <WifiOff size={18} />
      <span>{t('offline_banner')}</span>
    </div>
  );
}
