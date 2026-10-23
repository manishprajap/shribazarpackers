import React from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import {
  timeOutline,
  thumbsUpOutline,
  archiveOutline,
  cubeOutline,
  bicycleOutline,
  checkmarkDoneOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import type { OrderStatus, PackerOrder } from './PackerDashboard';
import './PackerDashboard.css';

// Sirf woh statuses jo packer khud select kar sakta hai (is modal se)
const STATUS_FLOW: OrderStatus[] = [
  'accepted',
  'packing',
  'ready_for_delivery',
  'assigned_to_delivery',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'New',
  accepted: 'Accepted',
  packing: 'Packing',
  ready_for_delivery: 'Packed',
  assigned_to_delivery: 'Handed Over',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: timeOutline,
  accepted: thumbsUpOutline,
  packing: archiveOutline,
  ready_for_delivery: cubeOutline,
  assigned_to_delivery: checkmarkDoneOutline,
  out_for_delivery: bicycleOutline,
  completed: checkmarkDoneOutline,
  cancelled: timeOutline,
};

interface Props {
  order: PackerOrder | null;
  onClose: () => void;
  onSelect: (status: OrderStatus) => void;
}

const ChangeStatusModal: React.FC<Props> = ({ order, onClose, onSelect }) => {
  return (
    <IonModal
      className="packer-dash"
      isOpen={!!order}
      onDidDismiss={onClose}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5, 0.75]}
    >
      <div className="pd-sheet">
        <div className="pd-sheet-handle" />

        <div className="pd-sheet-header">
          <p className="pd-sheet-eyebrow">Update Status</p>
          <h3 className="pd-sheet-title">{order?.order_number}</h3>
          <p className="pd-sheet-sub">{order?.customer_name}</p>
        </div>

        <div className="pd-status-options">
          {STATUS_FLOW.map(s => {
            const isCurrent = order?.status === s;
            return (
              <button
                key={s}
                className={`pd-status-option ${isCurrent ? 'selected' : ''}`}
                data-status={s}
                onClick={() => onSelect(s)}
              >
                <span className="pd-status-option-icon">
                  <IonIcon icon={STATUS_ICONS[s]} />
                </span>
                <span className="pd-status-option-label">{STATUS_LABELS[s]}</span>
                {isCurrent && (
                  <IonIcon icon={checkmarkCircle} className="pd-status-option-check" />
                )}
              </button>
            );
          })}
        </div>

        <button className="pd-sheet-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </IonModal>
  );
};

export default ChangeStatusModal;