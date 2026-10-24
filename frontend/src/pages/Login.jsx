import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogIn, KeyRound, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password reset modal states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = enter email, 2 = enter token & new password
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const { login } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      addToast({ message: 'Welcome back to FoodBridge AI!', type: 'success' });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetToken = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetLoading(true);
    setResetSuccessMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request reset code');

      if (data.resetToken) {
        setResetToken(data.resetToken);
        setResetSuccessMsg(`Reset code generated: ${data.resetToken}`);
      } else {
        setResetSuccessMsg(data.message);
      }
      setResetStep(2);
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleExecutePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword || newPassword.length < 6) {
      addToast({ message: 'Please enter the 6-digit code and a password of at least 6 characters.', type: 'error' });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          token: resetToken.trim(),
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      addToast({ message: data.message, type: 'success' });
      setResetModalOpen(false);
      setResetStep(1);
      setEmail(resetEmail);
      setPassword('');
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '440px', padding: '3.5rem 1.25rem' }}>
      <div className="card" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-light)',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.85rem'
            }}
          >
            <LogIn size={26} color="var(--accent-primary)" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            Sign In to FoodBridge AI
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Welcome back. Please sign in to access food listings, active allocations, and requests.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-sm)',
              color: '#991B1B',
              fontSize: '0.86rem',
              marginBottom: '1.25rem'
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@domain.org"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetModalOpen(true);
                }}
                style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
            Register Account
          </Link>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
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
          onClick={() => setResetModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
                  Reset Your Password
                </h3>
              </div>
              <button onClick={() => setResetModalOpen(false)} aria-label="Close dialog">
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetToken}>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Enter your registered email address to receive a 6-digit password reset verification code.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-email">Account Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    className="form-input"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="name@domain.com"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setResetModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={resetLoading || !resetEmail.trim()}>
                    {resetLoading ? 'Generating...' : 'Get Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecutePasswordReset}>
                {resetSuccessMsg && (
                  <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', marginBottom: '1rem' }}>
                    {resetSuccessMsg}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-token">6-Digit Reset Code</label>
                  <input
                    id="reset-token"
                    type="text"
                    className="form-input"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    maxLength={6}
                    placeholder="e.g. 849201"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-newpassword">New Password (6+ characters)</label>
                  <input
                    id="reset-newpassword"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setResetStep(1)}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={resetLoading || !newPassword}>
                    {resetLoading ? 'Resetting...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
