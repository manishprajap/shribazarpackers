import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonButton,
  IonToast,
} from '@ionic/react';

import {
  closeOutline,
  createOutline,
  saveOutline,
  personOutline,
  callOutline,
  mailOutline,
  locationOutline,
  cubeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons';

import { apiGet, apiPost, getUser } from '../api';
import './Packerprofilemodal.css';

interface PackerProfile {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
}

interface PackerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getInitials = (name?: string) => {
  if (!name) return 'P';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const PackerProfileModal: React.FC<PackerProfileModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<PackerProfile>({});
  const [form, setForm] = useState<PackerProfile>({});
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', color: 'success' });

  // ================= LOAD PROFILE =================
  // Primary source: locally cached user (always available, never crashes).
  // Optional: try refreshing from API if an endpoint is configured.
  useEffect(() => {
    if (!isOpen) return;

    setEditMode(false);

    const cached = getUser() || {};
    setProfile(cached);
    setForm(cached);

    // Optional live refresh — safe no-op if this endpoint doesn't exist on your backend.
    (async () => {
      try {
        const res = await apiGet('/packer/profile');
        const data = res?.data ?? res;
        if (data && typeof data === 'object') {
          setProfile((prev) => ({ ...prev, ...data }));
          setForm((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // Silent — fall back to cached local user, no toast/error shown.
      }
    })();
  }, [isOpen]);

  const handleChange = (field: keyof PackerProfile, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setForm(profile);
    setEditMode(false);
  };

  // ================= SAVE =================
  const handleSave = async () => {
    if (!form.name?.trim() || !form.phone?.trim()) {
      setToast({ open: true, message: 'Name and phone are required', color: 'danger' });
      return;
    }

    setSaving(true);
    try {
      // NOTE: adjust this endpoint/path to match your actual backend route.
      await apiPost('/packer/profile-update', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
      });

      setProfile(form);
      setEditMode(false);
      setToast({ open: true, message: 'Profile updated successfully', color: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Update failed', color: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = profile.status === 'Available' ? 'Unavailable' : 'Available';
    const prevProfile = profile;

    // optimistic update
    setProfile(prev => ({ ...prev, status: newStatus }));
    setForm(prev => ({ ...prev, status: newStatus }));

    try {
      await apiPost('/packer/profile-update', { status: newStatus });
      setToast({ open: true, message: `Marked as ${newStatus}`, color: 'success' });
    } catch (err: any) {
      // revert on failure
      setProfile(prevProfile);
      setForm(prevProfile);
      setToast({ open: true, message: err?.message || 'Failed to update status', color: 'danger' });
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="ppm-modal">
      <IonHeader className="ion-no-border">
        <IonToolbar className="ppm-toolbar">
          <div className="ppm-toolbar-inner">
            <h3 className="ppm-title">My Profile</h3>
            <IonButton fill="clear" className="ppm-close-btn" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ppm-content">
        {/* HERO */}
        <div className="ppm-hero">
          <div className="ppm-avatar">{getInitials(profile.name)}</div>
          <h2 className="ppm-name">{profile.name || 'Packer'}</h2>

          <div
            className={`ppm-status-chip ${profile.status === 'Available' ? 'available' : 'unavailable'}`}
            onClick={toggleAvailability}
          >
            <IonIcon icon={profile.status === 'Available' ? checkmarkCircleOutline : closeCircleOutline} />
            {profile.status === 'Available' ? 'Available' : 'Unavailable'}
            <span className="ppm-status-hint">(tap to toggle)</span>
          </div>
        </div>

        {/* DETAILS / FORM */}
        <div className="ppm-card">
          <div className="ppm-card-head">
            <span>Personal Details</span>
            {!editMode && (
              <button className="ppm-edit-btn" onClick={() => setEditMode(true)}>
                <IonIcon icon={createOutline} />
                Edit
              </button>
            )}
          </div>

          {/* NAME */}
          <div className="ppm-field">
            <label>
              <IonIcon icon={personOutline} /> Full Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={form.name || ''}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Enter full name"
              />
            ) : (
              <p>{profile.name || '-'}</p>
            )}
          </div>

          {/* PHONE */}
          <div className="ppm-field">
            <label>
              <IonIcon icon={callOutline} /> Phone Number
            </label>
            {editMode ? (
              <input
                type="tel"
                value={form.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="Enter phone number"
                maxLength={10}
              />
            ) : (
              <p>{profile.phone || '-'}</p>
            )}
          </div>

          {/* EMAIL */}
          <div className="ppm-field">
            <label>
              <IonIcon icon={mailOutline} /> Email
            </label>
            {editMode ? (
              <input
                type="email"
                value={form.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            ) : (
              <p>{profile.email || '-'}</p>
            )}
          </div>

          {/* ADDRESS */}
          <div className="ppm-field">
            <label>
              <IonIcon icon={locationOutline} /> Address
            </label>
            {editMode ? (
              <textarea
                value={form.address || ''}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Enter address"
                rows={3}
              />
            ) : (
              <p>{profile.address || '-'}</p>
            )}
          </div>

          {/* STATIC ID */}
          {profile.id !== undefined && (
            <div className="ppm-field">
              <label>
                <IonIcon icon={cubeOutline} /> Packer ID
              </label>
              <p>#{profile.id}</p>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        {editMode && (
          <div className="ppm-actions">
            <button className="ppm-btn cancel" onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </button>
            <button className="ppm-btn save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (
                <>
                  <IonIcon icon={saveOutline} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        <IonToast
          isOpen={toast.open}
          message={toast.message}
          duration={2000}
          color={toast.color}
          onDidDismiss={() => setToast({ ...toast, open: false })}
        />
      </IonContent>
    </IonModal>
  );
};

export default PackerProfileModal;