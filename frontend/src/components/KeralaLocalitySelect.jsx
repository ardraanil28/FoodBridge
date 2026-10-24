import React, { useState, useEffect } from 'react';

export default function KeralaLocalitySelect({
  district,
  area,
  onDistrictChange,
  onAreaChange,
  required = true,
  disabled = false
}) {
  const [data, setData] = useState({ districts: [], localities: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocalities() {
      try {
        const res = await fetch('/api/auth/localities');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load Kerala localities:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLocalities();
  }, []);

  const availableAreas = (district && data.localities[district]) ? data.localities[district] : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <label className="form-label" htmlFor="select-district">
          District (കേരളം) {required && '*'}
        </label>
        <select
          id="select-district"
          className="form-select"
          value={district || ''}
          onChange={(e) => {
            const newDist = e.target.value;
            onDistrictChange(newDist);
            // Default to first area in selected district if present
            if (data.localities[newDist] && data.localities[newDist].length > 0) {
              onAreaChange(data.localities[newDist][0]);
            } else {
              onAreaChange('');
            }
          }}
          required={required}
          disabled={disabled || loading}
        >
          <option value="">-- Select District --</option>
          {data.districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label" htmlFor="select-area">
          Area / Locality {required && '*'}
        </label>
        <select
          id="select-area"
          className="form-select"
          value={area || ''}
          onChange={(e) => onAreaChange(e.target.value)}
          required={required}
          disabled={disabled || !district || availableAreas.length === 0}
        >
          <option value="">-- Select Area --</option>
          {availableAreas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
