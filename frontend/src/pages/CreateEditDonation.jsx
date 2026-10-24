import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusCircle, Sparkles, Upload, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import KeralaLocalitySelect from '../components/KeralaLocalitySelect.jsx';
import FoodSafetyDisclaimer from '../components/FoodSafetyDisclaimer.jsx';
import VoiceInputButton from '../components/VoiceInputButton.jsx';
import GeminiAssistModal from '../components/GeminiAssistModal.jsx';

const ALLERGEN_OPTIONS = ['dairy', 'nuts', 'gluten', 'soy', 'eggs', 'fish', 'shellfish', 'peanuts'];

export default function CreateEditDonation() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('cooked_meals');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('portions');
  const [dietaryClass, setDietaryClass] = useState('vegetarian');
  const [declaredAllergens, setDeclaredAllergens] = useState([]);
  const [hasUnknownAllergens, setHasUnknownAllergens] = useState(false);
  const [preparationTime, setPreparationTime] = useState('');
  const [storageInfo, setStorageInfo] = useState('hot_held');
  const [district, setDistrict] = useState(user?.district || 'Ernakulam');
  const [area, setArea] = useState(user?.area || 'Kakkanad');
  const [availableFrom, setAvailableFrom] = useState('');
  const [collectionDeadline, setCollectionDeadline] = useState('');
  const [donorReference, setDonorReference] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [foodSafetyAcknowledged, setFoodSafetyAcknowledged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Set default deadline 4 hours from now for new listings
  useEffect(() => {
    if (!isEditing) {
      const now = new Date();
      setAvailableFrom(now.toISOString().slice(0, 16));
      const deadline = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      setCollectionDeadline(deadline.toISOString().slice(0, 16));
    }
  }, [isEditing]);

  // If editing, load existing donation
  useEffect(() => {
    if (isEditing) {
      async function loadDonation() {
        try {
          const res = await fetch(`/api/donations/${id}`);
          if (res.ok) {
            const data = await res.json();
            const d = data.donation;
            setTitle(d.title);
            setDescription(d.description || '');
            setCategory(d.category);
            setQuantity(d.quantity);
            setUnit(d.unit);
            setDietaryClass(d.dietary_class);
            setDeclaredAllergens(d.declared_allergens || []);
            setHasUnknownAllergens(Boolean(d.has_unknown_allergens));
            setPreparationTime(d.preparation_time || '');
            setStorageInfo(d.storage_info || 'ambient');
            setDistrict(d.district);
            setArea(d.area);
            setAvailableFrom(d.available_from ? d.available_from.slice(0, 16) : '');
            setCollectionDeadline(d.collection_deadline ? d.collection_deadline.slice(0, 16) : '');
            setDonorReference(d.donor_reference || '');
            setImageUrl(d.image_url || '');
            setFoodSafetyAcknowledged(true);
          }
        } catch (err) {
          console.error('Failed to load donation for editing:', err);
        }
      }
      loadDonation();
    }
  }, [id, isEditing]);

  const handleAllergenToggle = (alg) => {
    setDeclaredAllergens(prev =>
      prev.includes(alg) ? prev.filter(x => x !== alg) : [...prev, alg]
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      addToast({ message: 'Image must be under 1MB in size.', type: 'error' });
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/donations/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.imageUrl);
      addToast({ message: 'Image uploaded successfully!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleApplyAiExtraction = (extracted) => {
    if (extracted.title) setTitle(extracted.title);
    if (extracted.description) setDescription(extracted.description);
    if (extracted.category) setCategory(extracted.category);
    if (extracted.quantity) setQuantity(extracted.quantity);
    if (extracted.unit) setUnit(extracted.unit);
    if (extracted.dietary_class) setDietaryClass(extracted.dietary_class);
    if (extracted.storage_info) setStorageInfo(extracted.storage_info);
    if (extracted.declared_allergens && Array.isArray(extracted.declared_allergens)) {
      setDeclaredAllergens(extracted.declared_allergens.filter(a => a !== 'unknown'));
    }
    if (extracted.has_unknown_allergens !== undefined) {
      setHasUnknownAllergens(extracted.has_unknown_allergens);
    }
    addToast({ message: 'Details filled from Gemini! Please verify before submitting.', type: 'success' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!foodSafetyAcknowledged) {
      addToast({ message: 'Please acknowledge the food safety disclaimer.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        description,
        category,
        quantity: parseFloat(quantity),
        unit,
        dietary_class: dietaryClass,
        declared_allergens: declaredAllergens,
        has_unknown_allergens: hasUnknownAllergens,
        preparation_time: preparationTime,
        storage_info: storageInfo,
        district,
        area,
        available_from: new Date(availableFrom).toISOString(),
        collection_deadline: new Date(collectionDeadline).toISOString(),
        donor_reference: donorReference,
        image_url: imageUrl,
        food_safety_acknowledged: foodSafetyAcknowledged
      };

      const url = isEditing ? `/api/donations/${id}` : '/api/donations';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save donation listing');

      addToast({ message: isEditing ? 'Donation updated!' : 'Surplus listed successfully!', type: 'success' });
      navigate(isEditing ? `/donations/${id}` : '/dashboard');
    } catch (err) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '720px', padding: '2rem 1.25rem 4rem' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-clay)' }}>
              {isEditing ? 'Edit Surplus Donation' : 'Share Surplus Food'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Connect your food surplus with nearby shelters and community kitchens in Kerala.
            </p>
          </div>

          {!isEditing && (
            <button
              type="button"
              className="btn btn-accent-subtle"
              onClick={() => setAiModalOpen(true)}
              style={{ fontSize: '0.85rem' }}
            >
              <Sparkles size={16} color="var(--accent-primary)" />
              <span>{t('btn_ai_assist')}</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="don-title">Food Title / Description *</label>
            <input
              id="don-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. 25 Vegetable Biryani & Raita Portions"
            />
          </div>

          {/* Spoken description & voice typing */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label className="form-label" htmlFor="don-desc" style={{ marginBottom: 0 }}>
                Detailed Description & Packaging
              </label>
              <VoiceInputButton onTranscript={(txt) => setDescription(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
            <textarea
              id="don-desc"
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Freshly cooked lunch surplus packed in aluminium containers. Kept heated..."
            />
          </div>

          {/* Category & Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="don-cat">Category *</label>
              <select
                id="don-cat"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="cooked_meals">Cooked Meals</option>
                <option value="bakery">Bakery & Bread</option>
                <option value="raw_produce">Fresh Produce / Vegetables</option>
                <option value="packaged_groceries">Packaged Groceries</option>
                <option value="beverages">Beverages</option>
                <option value="other">Other Food</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="don-diet">Dietary Class *</label>
              <select
                id="don-diet"
                className="form-select"
                value={dietaryClass}
                onChange={(e) => setDietaryClass(e.target.value)}
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="unknown">Unknown / Not Specified</option>
              </select>
            </div>
          </div>

          {/* Quantity & Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="don-qty">Quantity *</label>
              <input
                id="don-qty"
                type="number"
                step="any"
                min="0.1"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="e.g. 20"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="don-unit">Unit of Measure *</label>
              <select
                id="don-unit"
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
              {isEditing && <div className="form-hint">Unit cannot be altered after listing.</div>}
            </div>
          </div>

          {/* Storage & Prep */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="don-storage">Storage Condition</label>
              <select
                id="don-storage"
                className="form-select"
                value={storageInfo}
                onChange={(e) => setStorageInfo(e.target.value)}
              >
                <option value="hot_held">Hot-held / Warmer</option>
                <option value="ambient">Ambient / Room Temperature</option>
                <option value="refrigerated">Refrigerated</option>
                <option value="frozen">Frozen</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="don-prep">Preparation or Packaging Time</label>
              <input
                id="don-prep"
                type="text"
                className="form-input"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                placeholder="e.g. Packed at 1:30 PM today"
              />
            </div>
          </div>

          {/* Declared Allergens with Unknown Option */}
          <div className="form-group">
            <label className="form-label">Declared Allergens</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
              {ALLERGEN_OPTIONS.map((alg) => (
                <button
                  type="button"
                  key={alg}
                  onClick={() => handleAllergenToggle(alg)}
                  className={`btn ${declaredAllergens.includes(alg) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', textTransform: 'capitalize' }}
                >
                  {alg}
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#92400E', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasUnknownAllergens}
                onChange={(e) => setHasUnknownAllergens(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              <span>Allergen information is unknown / cannot be guaranteed (flags human review)</span>
            </label>
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

          {/* Available From & Collection Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="don-availfrom">Available From *</label>
              <input
                id="don-availfrom"
                type="datetime-local"
                className="form-input"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="don-deadline">Collection Deadline *</label>
              <input
                id="don-deadline"
                type="datetime-local"
                className="form-input"
                value={collectionDeadline}
                onChange={(e) => setCollectionDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Image Upload (Nice-to-have, max 1MB) */}
          <div className="form-group">
            <label className="form-label">Food Photo (Optional, max 1MB)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                style={{ fontSize: '0.85rem' }}
              />
              {uploadingImage && <span style={{ fontSize: '0.82rem' }}>Uploading image...</span>}
              {imageUrl && (
                <span className="badge badge-available" style={{ fontSize: '0.78rem' }}>
                  Photo Attached
                </span>
              )}
            </div>
          </div>

          {/* Food Safety Disclaimer */}
          <FoodSafetyDisclaimer
            checked={foodSafetyAcknowledged}
            onChange={setFoodSafetyAcknowledged}
            required
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}
            disabled={loading || !foodSafetyAcknowledged}
          >
            {loading ? 'Saving Listing...' : (isEditing ? 'Save Changes' : 'List Food Surplus')}
          </button>
        </form>
      </div>

      {/* Gemini AI Smart Fill Assistant Modal */}
      <GeminiAssistModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApply={handleApplyAiExtraction}
      />
    </div>
  );
}
