import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import KeralaLocalitySelect from '../components/KeralaLocalitySelect.jsx';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Ernakulam');
  const [area, setArea] = useState('Kakkanad');
  const [orgType, setOrgType] = useState('individual');
  const [bio, setBio] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('You must accept the terms of service and privacy policy to register.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        phone: phone.trim(),
        district,
        area,
        org_type: orgType,
        bio: bio.trim(),
        accept_terms: acceptTerms
      });
      addToast({ message: 'Account created successfully! Welcome to FoodBridge AI.', type: 'success' });
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '580px', padding: '2.5rem 1.25rem' }}>
      <div className="card" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
            <UserPlus size={26} color="var(--accent-primary)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-clay)', marginBottom: '0.25rem' }}>
            Create FoodBridge AI Account
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            One unified account enables you to both share surplus food and request community assistance.
          </p>
        </div>

        {errorMsg && (
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
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name or Organization Name *</label>
            <input
              id="reg-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Sneha Bhavan, Malabar Bakers, or Rahul Nair"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address *</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="name@domain.com"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password (6+ chars) *</label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirmpassword">Confirm Password *</label>
              <input
                id="reg-confirmpassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone Number (Optional)</label>
              <input
                id="reg-phone"
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98470 XXXXX"
              />
              <div className="form-hint">Private; revealed only after accepted reservation.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-orgtype">Account Role / Type</label>
              <select
                id="reg-orgtype"
                className="form-select"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option value="individual">Individual / Household</option>
                <option value="restaurant">Restaurant / Eatery</option>
                <option value="bakery">Bakery / Cafe</option>
                <option value="hostel">Hostel / Dormitory</option>
                <option value="cafeteria">Cafeteria / Food Court</option>
                <option value="community_kitchen">Community Kitchen / Shelter</option>
                <option value="charity">Charity / NGO</option>
                <option value="event_organizer">Event / Wedding Caterer</option>
                <option value="other">Other Group</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <KeralaLocalitySelect
              district={district}
              area={area}
              onDistrictChange={setDistrict}
              onAreaChange={setArea}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-bio">Short Overview / Bio (Optional)</label>
            <textarea
              id="reg-bio"
              className="form-textarea"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other community partners about your surplus meals or distribution work..."
            />
          </div>

          {/* Terms & Privacy Policy Checkbox (Required) */}
          <div className="form-group" style={{ backgroundColor: 'var(--bg-base)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }}
              />
              <span>
                I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>. I understand FoodBridge AI coordinates surplus food redistribution and that food safety responsibility lies with food donors.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.98rem', marginTop: '0.5rem' }}
            disabled={loading || !acceptTerms}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
