import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Clock, ArrowRight, HeartHandshake, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (notifId) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      addToast({ message: 'All notifications marked as read', type: 'info' });
    } catch (err) {
      addToast({ message: 'Failed to mark all as read', type: 'error' });
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '680px', padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={22} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
            Notifications
          </h1>
        </div>

        {notifications.some(n => !n.is_read) && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            onClick={handleMarkAllRead}
          >
            <CheckCheck size={15} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Bell size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--deep-clay)', marginBottom: '0.35rem' }}>
            No notifications right now
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            You'll receive updates here when matches are calculated or reservation statuses change.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '1rem',
                backgroundColor: n.is_read ? '#FFFFFF' : 'var(--bg-base)',
                borderLeft: `4px solid ${n.is_read ? 'var(--border-color)' : 'var(--accent-primary)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
              onClick={() => !n.is_read && handleMarkAsRead(n.id)}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4, marginBottom: '0.35rem' }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={12} />
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {!n.is_read && (
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', marginLeft: '6px' }}>
                      New
                    </span>
                  )}
                </div>
              </div>

              {n.link && (
                <Link
                  to={n.link}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', flexShrink: 0 }}
                  onClick={() => handleMarkAsRead(n.id)}
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
