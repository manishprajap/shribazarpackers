import React from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import { callOutline, logoWhatsapp, bicycleOutline, closeOutline } from 'ionicons/icons';
import './PackerDashboard.css';

interface DeliveryBoy {
  name: string;
  phone: string;
}

interface PackerOrder {
  id: number;
  order_number: string;
  delivery_boy: DeliveryBoy | null;
}

interface Props {
  order: PackerOrder | null;
  onClose: () => void;
}

const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase();

const cleanPhone = (phone?: string) => (phone || '').replace(/[^\d+]/g, '');

const ContactDeliveryModal: React.FC<Props> = ({ order, onClose }) => {
  const boy = order?.delivery_boy;

  return (
    <IonModal
      className="packer-dash"
      isOpen={!!order}
      onDidDismiss={onClose}
      initialBreakpoint={0.45}
      breakpoints={[0, 0.45]}
    >
      <div className="pd-sheet">
        <div className="pd-sheet-handle" />

        <button className="pd-sheet-close" onClick={onClose}>
          <IonIcon icon={closeOutline} />
        </button>

        <div className="pd-sheet-header center">
          <p className="pd-sheet-eyebrow">{order?.order_number}</p>
        </div>

        {boy ? (
          <>
            <div className="pd-contact-card">
              <div className="pd-contact-avatar">{getInitials(boy.name)}</div>
              <h3 className="pd-contact-name">{boy.name}</h3>
              <p className="pd-contact-role">
                <IonIcon icon={bicycleOutline} /> Delivery Partner
              </p>
              <p className="pd-contact-phone">{boy.phone}</p>
            </div>

            <div className="pd-contact-actions">
              <a
                className="pd-contact-btn call"
                href={`tel:${cleanPhone(boy.phone)}`}
              >
                <IonIcon icon={callOutline} />
                Call
              </a>
              <a
                className="pd-contact-btn whatsapp"
                href={`https://wa.me/${cleanPhone(boy.phone).replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <IonIcon icon={logoWhatsapp} />
                WhatsApp
              </a>
            </div>
          </>
        ) : (
          <div className="pd-contact-empty">
            <div className="pd-contact-empty-icon">🚴</div>
            <h3 className="pd-empty-title">No delivery partner assigned</h3>
            <p className="pd-empty-sub">Assign a delivery boy once the order is packed</p>
          </div>
        )}
      </div>
    </IonModal>
  );
};

export default ContactDeliveryModal;