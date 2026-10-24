import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HeartHandshake, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import KeralaLocalitySelect from '../components/KeralaLocalitySelect.jsx';
import VoiceInputButton from '../components/VoiceInputButton.jsx';

const COMMON_ALLERGIES = ['peanuts', 'dairy', 'gluten', 'soy', 'eggs', 'fish', 'shellfish', 'nuts'];

export default function CreateEditRequest() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [foodType, setFoodType] = useState('cooked_meals');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('portions');
  const [dietaryRequirements, setDietaryRequirements] = useState('vegetarian');
  const [allergiesToAvoid, setAllergiesToAvoid] = useState([]);
  const [district, setDistrict] = useState(user?.district || 'Ernakulam');
  const [area, setArea] = useState(user?.area || 'Kakkanad');
  const [neededBy, setNeededBy] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      // Default needed-by 6 hours from now
      const target = new Date(Date.now() + 6 * 60 * 60 * 1000);
      setNeededBy(target.toISOString().slice(0, 16));
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      async function loadRequest() {
        try {
          const res = await fetch(`/api/requests/${id}`);
          if (res.ok) {
            const data = await res.json();
            const r = data.request;
            setTitle(r.title);
            setFoodType(r.food_type);
            setQuantity(r.quantity);
            setUnit(r.unit);
            setDietaryRequirements(r.dietary_requirements);
            setAllergiesToAvoid(r.allergies_to_avoid || []);
            setDistrict(r.district);
            setArea(r.area);
            setNeededBy(r.needed_by ? r.needed_by.slice(0, 16) : '');
            setDescription(r.description || '');
            setPriority(r.priority || 'normal');
          }
        } catch (err) {
          console.error('Failed to load request for editing:', err);
        }
      }
      loadRequest();
    }
  }, [id, isEditing]);

  const toggleAllergy = (alg) => {
    setAllergiesToAvoid(prev =>
      prev.includes(alg) ? prev.filter(a => a !== alg) : [...prev, alg]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title,
        food_type: foodType,
        quantity: parseFloat(quantity),
        unit,
        dietary_requirements: dietaryRequirements,
        allergies_to_avoid: allergiesToAvoid,
        district,
        area,
        needed_by: new Date(neededBy).toISOString(),
        description,
        priority
      };

      const url = isEditing ? `/api/requests/${id}` : '/api/requests';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save request');

      addToast({
        message: isEditing ? 'Food request updated!' : 'Food request posted! Finding matches...',
        type: 'success'
      });

      const newId = isEditing ? id : data.request.id;
      navigate(`/matches/request/${newId}`);
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '680px', padding: '2rem 1.25rem 4rem' }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="card">
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
            {isEditing ? 'Edit Food Request' : 'Post Community Food Request'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Tell us what food your shelter, family, or community group needs.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="req-title">Request Title *</label>
            <input
              id="req-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. 50 Vegetarian Meals for Evening Distribution"
            />
          </div>

          {/* Description & voice */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label className="form-label" htmlFor="req-desc" style={{ marginBottom: 0 }}>
                Details & Purpose (Optional)
              </label>
              <VoiceInputButton onTranscript={(txt) => setDescription(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
            <textarea
              id="req-desc"
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain who this food will support, dietary preferences, or timing details..."
            />
          </div>

          {/* Food Type & Dietary Requirement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-foodtype">Food Type *</label>
              <select
                id="req-foodtype"
                className="form-select"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
              >
                <option value="cooked_meals">Cooked Meals</option>
                <option value="bakery">Bakery & Bread</option>
                <option value="raw_produce">Fresh Produce / Vegetables</option>
                <option value="packaged_groceries">Packaged Groceries</option>
                <option value="other">Other Food</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-dietary">Dietary Requirements *</label>
              <select
                id="req-dietary"
                className="form-select"
                value={dietaryRequirements}
                onChange={(e) => setDietaryRequirements(e.target.value)}
              >
                <option value="vegetarian">Vegetarian Only</option>
                <option value="vegan">Vegan Only</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="any">Any Food (No strict dietary restriction)</option>
              </select>
            </div>
          </div>

          {/* Quantity & Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-qty">Quantity Needed *</label>
              <input
                id="req-qty"
                type="number"
                step="any"
                min="0.1"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="e.g. 50"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-unit">Unit *</label>
              <select
                id="req-unit"
                className="form-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={isEditing}
              >
                <option value="portions">Portions</option>
                <option value="meals">Meals</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="packets">Packets</option>
              </select>
              {isEditing && <div className="form-hint">Unit cannot be altered after creation.</div>}
            </div>
          </div>

          {/* Allergies / Ingredients to avoid */}
          <div className="form-group">
            <label className="form-label">Allergies / Ingredients to Avoid</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
              {COMMON_ALLERGIES.map((alg) => (
                <button
                  type="button"
                  key={alg}
                  onClick={() => toggleAllergy(alg)}
                  className={`btn ${allergiesToAvoid.includes(alg) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', textTransform: 'capitalize' }}
                >
                  Avoid {alg}
                </button>
              ))}
            </div>
            <div className="form-hint">
              Any declared conflict blocks matches automatically. Unknown allergen listings will be flagged for your review.
            </div>
          </div>

          {/* Kerala Locality Select */}
          <div className="form-group">
            <KeralaLocalitySelect
              district={district}
              area={area}
              onDistrictChange={setDistrict}
              onAreaChange={setArea}
              required
            />
          </div>

          {/* Needed By & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-neededby">Needed By Date & Time *</label>
              <input
                id="req-neededby"
                type="datetime-local"
                className="form-input"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-priority">Urgency / Priority</label>
              <select
                id="req-priority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent Priority (+12 pts match score)</option>
                <option value="low">Low / Flexible</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Submitting Request...' : (isEditing ? 'Save Request Changes' : 'Submit & Find Matches')}
          </button>
        </form>
      </div>
    </div>
  );
}
