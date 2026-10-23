import React from 'react';
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
} from '@ionic/react';
import { closeOutline, locationOutline } from 'ionicons/icons';
import type { PackerOrder } from './PackerDashboard';
import './PackerDashboard.css';

interface Props {
    order: PackerOrder | null;
    onClose: () => void;
}

const OrderItemsModal: React.FC<Props> = ({ order, onClose }) => {
    // Grand Total Calculation (Price * Quantity)
    const grandTotal = order?.items?.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0) ?? 0;

    return (
        <IonModal
            isOpen={!!order}
            onDidDismiss={onClose}
            className="pd-items-modal"
            initialBreakpoint={0.65}
            breakpoints={[0, 0.65, 0.95]}
        >
            <IonHeader className="ion-no-border">
                <IonToolbar>
                    <IonTitle>{order ? `Order Details` : ''}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose}>
                            <IonIcon icon={closeOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="packer-dash">
                {order && (
                    <>
                        {/* Customer Info Section */}
                        <div className="pd-modal-order-info">
                            <div className="pd-modal-order-top">
                                <h3>{order.order_number}</h3>
                            </div>
                            <p className="pd-customer">{order.customer_name}</p>
                            <p className="pd-address">
                                <IonIcon icon={locationOutline} />
                                {order.address}
                            </p>
                        </div>

                        {/* Section Title with Badge style count */}
                        <div className="pd-items-section-header">
                            <span className="pd-section-title">ITEMS ORDERED</span>
                            <span className="pd-section-badge">{order.items?.length ?? 0}</span>
                        </div>

                        {order.items && order.items.length > 0 ? (
                            <div className="pd-table-container">
                                <table className="pd-items-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center">#</th>
                                            <th className="text-left">Product</th>
                                            <th className="text-center">Qty</th>
                                            <th className="text-center">Weight</th>
                                            <th className="text-right">Price</th>
                                            <th className="text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item, idx) => {
                                            const subtotal = (item.price || 0) * (item.quantity || 0);
                                            return (
                                                <tr key={idx}>
                                                    <td className="text-center pd-col-idx">{idx + 1}</td>
                                                    <td className="text-left pd-col-product">
                                                        <span className="pd-item-name">{item.name}</span>
                                                        {/* Weight display control */}
                                                        {item.weight && item.weight !== '0' && (
                                                            <span className="pd-item-weight">
                                                                {/* Agar number hai toh 'g' jod do, agar pehle se text hai toh direct dikhao */}
                                                                ({isNaN(Number(item.weight)) ? item.weight : `${Math.floor(Number(item.weight))}g`})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-center pd-col-qty">
                                                        <span className="pd-table-qty-badge">x{item.quantity}</span>
                                                    </td>
                                                    <td className="text-center pd-col-weight">
                                                        {item.weight && item.weight !== '0' && (
                                                            <span className="pd-item-weight">
                                                                {/* Agar number hai toh 'g' jod do, agar pehle se text hai toh direct dikhao */}
                                                                ({isNaN(Number(item.weight)) ? item.weight : `${Math.floor(Number(item.weight))}g`})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-right pd-col-price">₹{item.price || 0}</td>
                                                    <td className="text-right pd-col-subtotal">₹{subtotal}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Grand Total Footer Row */}
                                        <tr className="pd-grand-total-row">
                                            <td colSpan={3}></td>
                                            <td className="text-right pd-total-label">Grand Total</td>
                                            <td className="text-right pd-total-value">₹{grandTotal}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="pd-items-empty">
                                <div className="pd-items-empty-icon">📦</div>
                                <p className="pd-items-empty-title">No item details available</p>
                                <p className="pd-items-empty-sub">
                                    Item breakdown wasn't returned for this order
                                </p>
                            </div>
                        )}
                    </>
                )}
            </IonContent>
        </IonModal>
    );
};

export default OrderItemsModal;