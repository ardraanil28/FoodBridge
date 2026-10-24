import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HeartHandshake, Bell, Globe, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Poll unread notification count only when authenticated
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    async function fetchUnread() {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch {
        // ignore network error
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
        {/* Brand */}
        <Link to={user ? '/dashboard' : '/login'} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-light)',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HeartHandshake size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--deep-clay)', lineHeight: 1.1 }}>
              {t('app_title')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Food Redistribution Platform
            </div>
          </div>
        </Link>

        {/* Authenticated Desktop Navigation */}
        {user && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }} className="desktop-nav">
            <Link
              to="/dashboard"
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive('/dashboard') ? 'var(--accent-primary)' : 'var(--text-main)',
                textDecoration: 'none'
              }}
            >
              {t('nav_dashboard')}
            </Link>
            <Link
              to="/donations"
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive('/donations') ? 'var(--accent-primary)' : 'var(--text-main)',
                textDecoration: 'none'
              }}
            >
              {t('nav_donations')}
            </Link>
            <Link
              to="/requests"
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive('/requests') ? 'var(--accent-primary)' : 'var(--text-main)',
                textDecoration: 'none'
              }}
            >
              {t('nav_requests')}
            </Link>
            <Link
              to="/impact"
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive('/impact') ? 'var(--accent-primary)' : 'var(--text-main)',
                textDecoration: 'none'
              }}
            >
              {t('nav_impact')}
            </Link>
            <Link
              to="/my-donations"
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive('/my-donations') ? 'var(--accent-primary)' : 'var(--text-main)',
                textDecoration: 'none'
              }}
            >
              {t('nav_my_donations')}
            </Link>
            <Link
              to="/my-requests"
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isActive('/my-requests') ? 'var(--accent-primary)' : 'var(--text-main)',
                textDecoration: 'none'
              }}
            >
              {t('nav_my_requests')}
            </Link>
          </nav>
        )}

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language Toggle Pill */}
          <button
            onClick={toggleLanguage}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', height: '36px' }}
            title="Toggle English / Malayalam"
            aria-label="Toggle Language"
          >
            <Globe size={15} color="var(--accent-primary)" />
            <span>{t('lang_toggle')}</span>
          </button>

          {/* User authenticated actions */}
          {user ? (
            <>
              {/* Notification Bell */}
              <Link
                to="/notifications"
                aria-label={`Notifications, ${unreadCount} unread`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  textDecoration: 'none'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    className="badge-pop"
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link
                to="/profile"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', height: '36px', fontSize: '0.85rem' }}
                title={user.name}
              >
                <User size={15} />
                <span className="profile-name" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name.split(' ')[0]}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', height: '36px' }}
                aria-label={t('nav_logout')}
                title={t('nav_logout')}
              >
                <LogOut size={16} color="var(--deep-clay)" />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary" style={{ height: '36px', fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                {t('nav_login')}
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ height: '36px', fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                {t('nav_register')}
              </Link>
            </div>
          )}

          {/* Mobile hamburger for authenticated users */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-hamburger"
              style={{ display: 'none', padding: '0.4rem', border: 'none', background: 'none' }}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && user && (
        <div style={{ padding: '1rem', backgroundColor: '#fff', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_dashboard')}</Link>
          <Link to="/donations" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_donations')}</Link>
          <Link to="/requests" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_requests')}</Link>
          <Link to="/impact" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_impact')}</Link>
          <Link to="/my-donations" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_my_donations')}</Link>
          <Link to="/my-requests" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_my_requests')}</Link>
          <Link to="/profile" onClick={() => setMobileMenuOpen(false)} style={{ fontWeight: 600 }}>{t('nav_profile')}</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: block !important; }
          .profile-name { display: none; }
        }
      `}</style>
    </header>
  );
}
