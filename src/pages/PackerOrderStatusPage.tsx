import React, { useState, useEffect, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonToast,
    IonAlert,
} from '@ionic/react';
import type { RefresherEventDetail } from '@ionic/core';

import {
    cubeOutline,
    checkmarkDoneOutline,
    callOutline,
    bicycleOutline,
    timeOutline,
    archiveOutline,
    thumbsUpOutline,
    closeOutline,
    eyeOutline,
} from 'ionicons/icons';

import { apiGet, apiPost } from '../api';
import './PackerDashboard.css';
import ChangeStatusModal from './Changestatusmodal';
import ContactDeliveryModal from './Contactdeliverymodal';
import OrderItemsModal from './OrderItemsModal';
import type { OrderStatus, PackerOrder } from './PackerDashboard';
import PackerProfileModal from './Packerprofilemodal';

const STATUS_LABELS: Record<string, string> = {
    all: 'All',
    pending: 'New',
    accepted: 'Accepted',
    packing: 'Packing',
    ready_for_delivery: 'Packed',
    assigned_to_delivery: 'Handed Over',
    out_for_delivery: 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STATUS_ICONS: Record<string, string> = {
    all: cubeOutline,
    pending: timeOutline,
    accepted: thumbsUpOutline,
    packing: archiveOutline,
    ready_for_delivery: cubeOutline,
    assigned_to_delivery: checkmarkDoneOutline,
    out_for_delivery: bicycleOutline,
    completed: checkmarkDoneOutline,
    cancelled: timeOutline,
};

const PackerOrderStatusPage: React.FC = () => {
    const { status } = useParams<{ status: string }>();
    const history = useHistory();

    const [orders, setOrders] = useState<PackerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ open: false, message: '', color: 'success' });
    const [statusTarget, setStatusTarget] = useState<PackerOrder | null>(null);
    const [contactTarget, setContactTarget] = useState<PackerOrder | null>(null);
    const [itemsTarget, setItemsTarget] = useState<PackerOrder | null>(null); 
    const [loadingItemsId, setLoadingItemsId] = useState<number | null>(null); // Loader per card tracking
    const [acceptingId, setAcceptingId] = useState<number | null>(null);
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    const pageTitle = STATUS_LABELS[status] || status;
    const pageIcon = STATUS_ICONS[status] || cubeOutline;

    // ================= LOAD MAIN LIST =================
    const loadOrders = async () => {
        try {
            setLoading(true);
            const query = status === 'all' ? '' : `?status=${status}`;
            const res = await apiGet(`/packer/orders${query}`);

            const list = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res?.data?.data)
                        ? res.data.data
                        : [];

            setOrders(list);
        } catch (err: any) {
            setToast({
                open: true,
                message: err.message || 'Unable to load orders',
                color: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const handleRefresh = async (e: CustomEvent<RefresherEventDetail>) => {
        await loadOrders();
        e.detail.complete();
    };

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => b.id - a.id);
    }, [orders]);

    // ================= FETCH SINGLE ORDER DETAILS WITH ITEMS =================
    const openItemsModal = async (order: PackerOrder) => {
        try {
            setLoadingItemsId(order.id);
            // Single order items API hit karenge
            const res = await apiGet(`/packer/order/${order.id}`); 
            
            const fullOrderDetails = res?.data || res; 

            if (fullOrderDetails && fullOrderDetails.items) {
                setItemsTarget(fullOrderDetails);
            } else {
                setItemsTarget(order); 
            }
        } catch (err: any) {
            setToast({ 
                open: true, 
                message: err.message || 'Failed to load item list details', 
                color: 'danger' 
            });
            setItemsTarget(order); 
        } finally {
            setLoadingItemsId(null);
        }
    };

    // ================= ACCEPT ORDER =================
    const acceptOrder = async (order: PackerOrder) => {
        setAcceptingId(order.id);
        try {
            await apiPost('/packer/order/accept', { order_id: order.id });

            const updatedOrder: PackerOrder = { ...order, status: 'accepted' as OrderStatus };

            setOrders(prev =>
                status === 'all'
                    ? prev.map(o => (o.id === order.id ? updatedOrder : o))
                    : prev.filter(o => o.id !== order.id)
            );

            setToast({ open: true, message: 'Order accepted', color: 'success' });
            
            // Accept hote hi fresh details modal open hoga
            await openItemsModal(updatedOrder);
        } catch (err: any) {
            setToast({ open: true, message: err.message || 'Failed to accept order', color: 'danger' });
        } finally {
            setAcceptingId(null);
        }
    };

    // ================= REJECT ORDER =================
    const rejectOrder = async (order: PackerOrder) => {
        setRejectingId(order.id);
        try {
            await apiPost('/packer/order/reject', { order_id: order.id });
            setOrders(prev => prev.filter(o => o.id !== order.id));
            setToast({ open: true, message: 'Order rejected', color: 'medium' });
        } catch (err: any) {
            setToast({ open: true, message: err.message || 'Failed to reject order', color: 'danger' });
        } finally {
            setRejectingId(null);
        }
    };

    // ================= STATUS UPDATE =================
    const updateStatus = async (newStatus: OrderStatus) => {
        if (!statusTarget) return;

        try {
            await apiPost('/packer/order/status', {
                order_id: statusTarget.id,
                status: newStatus,
            });

            setOrders(prev =>
                status === 'all'
                    ? prev.map(o => (o.id === statusTarget.id ? { ...o, status: newStatus } : o))
                    : prev.filter(o => o.id !== statusTarget.id)
            );

            setToast({ open: true, message: 'Status updated successfully', color: 'success' });
        } catch (err: any) {
            setToast({ open: true, message: err.message || 'Failed to update status', color: 'danger' });
        }

        setStatusTarget(null);
    };

    const handleLogout = () => {
        localStorage.clear();
        history.replace('/login');
    };

    return (
        <IonPage className="packer-dash">
            <IonHeader className="ion-no-border">
                <IonToolbar className="pd-topbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/packer/dashboard" text="" />
                    </IonButtons>
                    <div className="pd-status-page-title">
                        <IonIcon icon={pageIcon} />
                        <span>{pageTitle} Orders</span>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen className="packer-dash">
                <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
                    <IonRefresherContent />
                </IonRefresher>

                <div className="pd-section-title">
                    {pageTitle} Orders ({sortedOrders.length})
                </div>

                <div className="pd-list">
                    {loading ? (
                        <p className="pd-loading">Loading orders...</p>
                    ) : sortedOrders.length === 0 ? (
                        <div className="pd-empty">
                            <div className="pd-empty-icon">📦</div>
                            <h2 className="pd-empty-title">No orders found</h2>
                            <p className="pd-empty-sub">Orders in this stage will appear here</p>
                        </div>
                    ) : (
                        sortedOrders.map(order => (
                            <div className="pd-order-card" data-status={order.status} key={order.id}>
                                <div className="pd-order-top">
                                    <h3 className="pd-order-number">{order.order_number}</h3>
                                    <span className="pd-badge" data-status={order.status}>
                                        {STATUS_LABELS[order.status] || order.status}
                                    </span>
                                </div>

                                <p className="pd-customer">{order.customer_name}</p>
                                <p className="pd-address">{order.address}</p>

                                <div className="pd-meta-row">
                                    {order.items_count} item{order.items_count === 1 ? '' : 's'}
                                </div>

                                {order.delivery_boy && (
                                    <div
                                        className="pd-delivery-chip"
                                        onClick={() => setContactTarget(order)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <IonIcon icon={bicycleOutline} />
                                        {order.delivery_boy.name}
                                        <IonIcon icon={callOutline} style={{ marginLeft: 6 }} />
                                    </div>
                                )}

                                <div className="pd-actions">
                                    {order.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => rejectOrder(order)}
                                                disabled={rejectingId === order.id || acceptingId === order.id}
                                                className="pd-action-btn danger"
                                            >
                                                <IonIcon icon={closeOutline} />
                                                {rejectingId === order.id ? 'Rejecting...' : 'Reject'}
                                            </button>

                                            <button
                                                onClick={() => acceptOrder(order)}
                                                disabled={acceptingId === order.id || rejectingId === order.id}
                                                className="pd-action-btn primary"
                                            >
                                                <IonIcon icon={thumbsUpOutline} />
                                                {acceptingId === order.id ? 'Accepting...' : 'Accept'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {/* Final integrated View Items button loader check ke sath */}
                                            <button
                                                onClick={() => openItemsModal(order)}
                                                disabled={loadingItemsId !== null}
                                                className="pd-action-btn secondary"
                                            >
                                                <IonIcon icon={eyeOutline} />
                                                {loadingItemsId === order.id ? 'Loading...' : 'View Items'}
                                            </button>

                                            {order.status !== 'assigned_to_delivery' &&
                                                order.status !== 'completed' && (
                                                    <button
                                                        onClick={() => setStatusTarget(order)}
                                                        className="pd-action-btn primary"
                                                    >
                                                        <IonIcon icon={checkmarkDoneOutline} />
                                                        Update
                                                    </button>
                                                )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <ChangeStatusModal
                    order={statusTarget}
                    onClose={() => setStatusTarget(null)}
                    onSelect={updateStatus}
                />

                <ContactDeliveryModal
                    order={contactTarget}
                    onClose={() => setContactTarget(null)}
                />

                <OrderItemsModal
                    order={itemsTarget}
                    onClose={() => setItemsTarget(null)}
                />

                <IonToast
                    isOpen={toast.open}
                    message={toast.message}
                    duration={2000}
                    onDidDismiss={() => setToast({ ...toast, open: false })}
                />
            </IonContent>
            <PackerProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

            <IonAlert
                isOpen={logoutConfirmOpen}
                header="Logout?"
                buttons={[
                    { text: 'Cancel', role: 'cancel' },
                    { text: 'Logout', handler: handleLogout },
                ]}
                onDidDismiss={() => setLogoutConfirmOpen(false)}
            />
        </IonPage>
    );
};

export default PackerOrderStatusPage;