import React, { useState, useEffect } from 'react';
import { User, Shield, Check, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import KeralaLocalitySelect from '../components/KeralaLocalitySelect.jsx';

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [district, setDistrict] = useState(user?.district || 'Ernakulam');
  const [area, setArea] = useState(user?.area || 'Kakkanad');
  const [orgType, setOrgType] = useState(user?.org_type || 'individual');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setDistrict(user.district);
      setArea(user.area);
      setOrgType(user.org_type || 'individual');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        name,
        phone,
        district,
        area,
        org_type: orgType,
        bio
      });
      addToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '620px', padding: '2rem 1.25rem 4rem' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.5rem', borderRadius: '50%' }}>
            <User size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--deep-clay)' }}>
              Profile & Account Settings
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user?.email} • Member since {user ? new Date().getFullYear() : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="prof-name">Name or Organisation Name *</label>
            <input
              id="prof-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prof-phone">Phone Number</label>
              <input
                id="prof-phone"
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98470 XXXXX"
              />
              <div className="form-hint">Shown only to authorised pickup partners.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prof-orgtype">Account Role / Type</label>
              <select
                id="prof-orgtype"
                className="form-select"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option value="individual">Individual</option>
                <option value="restaurant">Restaurant</option>
                <option value="bakery">Bakery</option>
                <option value="hostel">Hostel</option>
                <option value="cafeteria">Cafeteria</option>
                <option value="community_kitchen">Community Kitchen</option>
                <option value="charity">Charity / Shelter</option>
                <option value="other">Other</option>
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
            <label className="form-label" htmlFor="prof-bio">Bio / Organisation Overview</label>
            <textarea
              id="prof-bio"
              className="form-textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other community partners about your surplus meals or distribution work..."
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            <Save size={16} />
            <span>{loading ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
