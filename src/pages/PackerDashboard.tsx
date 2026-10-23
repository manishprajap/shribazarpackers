import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonAlert,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonMenu,
  IonMenuToggle,
  IonMenuButton,
  IonButtons,
  IonButton,
  IonPopover,
  IonList,
  IonItem,
} from '@ionic/react';

import {
  cubeOutline,
  checkmarkDoneOutline,
  logOutOutline,
  bicycleOutline,
  menuOutline,
  notificationsOutline,
  chevronDownOutline,
  gridOutline,
  timeOutline,
  cogOutline,
  personOutline,
  archiveOutline,
  thumbsUpOutline,
} from 'ionicons/icons';

import type { RefresherEventDetail } from '@ionic/core';
import { apiGet, getUser } from '../api';
import './PackerDashboard.css';
import PackerProfileModal from './Packerprofilemodal';

export interface PackerOrderItem {
  weight: string | undefined;
  price: number;
  name: string;
  quantity: number;
  variant?: string;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'packing'
  | 'ready_for_delivery'
  | 'assigned_to_delivery'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export interface PackerOrder {
  id: number;
  order_number: string;
  customer_name: string;
  address: string;
  items_count: number;
  status: OrderStatus;
  delivery_boy: any;
  items?: PackerOrderItem[];
}

const STATUS_FLOW: OrderStatus[] = [
  'pending',
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

const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'P';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const MENU_ID = 'packer-menu';
const CONTENT_ID = 'packer-main-content';
const POLL_INTERVAL_MS = 20000;

const PackerDashboard: React.FC = () => {
  const history = useHistory();
  const packer = getUser();

  const [orders, setOrders] = useState<PackerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', color: 'success' });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const previousPendingIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      
      const ctx = audioCtxRef.current;
      if (!ctx) return; // Fixes: 'ctx' is possibly 'null' compile error

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.log('Notification sound auto-play restrictions met:', e);
    }
  };

  const loadOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiGet('/packer/orders');

      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];

      const currentPendingIds = new Set<number>(
        list.filter((o: PackerOrder) => o.status === 'pending').map((o: PackerOrder) => o.id)
      );

      if (!isFirstLoad.current) {
        const newOnes = [...currentPendingIds].filter(
          id => !previousPendingIds.current.has(id)
        );

        if (newOnes.length > 0) {
          setToast({
            open: true,
            message:
              newOnes.length === 1
                ? '🔔 Naya order aaya hai!'
                : `🔔 ${newOnes.length} naye orders aaye hain!`,
            color: 'success',
          });
          playNotificationSound();
        }
      }

      previousPendingIds.current = currentPendingIds;
      isFirstLoad.current = false;
      setOrders(list);
    } catch (err: any) {
      if (!silent) {
        setToast({
          open: true,
          message: err.message || 'Unable to load orders',
          color: 'danger',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    pollTimerRef.current = setInterval(() => {
      loadOrders(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleRefresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await loadOrders();
    e.detail.complete();
  };

  const stats = useMemo(() => {
    const c: Record<OrderStatus, number> = {} as any;
    STATUS_FLOW.forEach(s => (c[s] = 0));
    orders.forEach(o => {
      if (c[o.status] !== undefined) c[o.status]++;
    });
    return c;
  }, [orders]);

  const handleLogout = () => {
    localStorage.clear();
    history.replace('/login');
  };

  const goToStatusPage = (status: OrderStatus | 'all') => {
    history.push(`/packer/orders/${status}`);
  };

  return (
    <>
      {/* SIDEBAR MENU */}
      <IonMenu className="packer-dash pd-menu" menuId={MENU_ID} contentId={CONTENT_ID} side="start">
        <IonHeader className="ion-no-border">
          <IonToolbar className="pd-menu-header-toolbar">
            <div className="pd-menu-header-profile">
              <div className="pd-profile-avatar-md">
                {getInitials(packer?.name)}
              </div>
              <div className="pd-menu-user-details">
                <h3>{packer?.name || 'Packer'}</h3>
                <p>{packer?.email || 'packer@app.com'}</p>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent className="packer-dash">
          <div className="pd-menu-list">
            <IonMenuToggle autoHide={false} menu={MENU_ID}>
              <IonItem
                lines="none"
                button
                className="pd-menu-item"
                onClick={() => goToStatusPage('all')}
              >
                <IonIcon icon={gridOutline} />
                All Orders
                <span className="pd-menu-count">{orders.length}</span>
              </IonItem>
            </IonMenuToggle>

            {STATUS_FLOW.map(s => (
              <IonMenuToggle autoHide={false} menu={MENU_ID} key={s}>
                <IonItem
                  lines="none"
                  button
                  className="pd-menu-item"
                  onClick={() => goToStatusPage(s)}
                >
                  <IonIcon icon={STATUS_ICONS[s]} />
                  {STATUS_LABELS[s]}
                  <span className="pd-menu-count">{stats[s]}</span>
                </IonItem>
              </IonMenuToggle>
            ))}

            <IonMenuToggle autoHide={false} menu={MENU_ID}>
              <IonItem lines="none" button className="pd-menu-item" onClick={() => setProfileOpen(true)}>
                <IonIcon icon={personOutline} />
                My Profile
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false} menu={MENU_ID}>
              <IonItem lines="none" button className="pd-menu-item">
                <IonIcon icon={cogOutline} />
                Settings
              </IonItem>
            </IonMenuToggle>
          </div>

          <div className="pd-menu-footer">
            <div className="pd-menu-logout" onClick={() => setLogoutConfirmOpen(true)}>
              <IonIcon icon={logOutOutline} />
              Logout
            </div>
          </div>
        </IonContent>
      </IonMenu>

      {/* MAIN VIEW PAGE */}
      <IonPage className="packer-dash" id={CONTENT_ID}>
        <IonHeader className="ion-no-border">
          <IonToolbar className="pd-topbar">
            <div className="pd-topbar-inner">
              <IonButtons slot="start">
                <IonMenuButton className="pd-menu-btn" menu={MENU_ID} autoHide={false}>
                  <IonIcon icon={menuOutline} />
                </IonMenuButton>
              </IonButtons>

              <div className="pd-topbar-right">
                <IonButton fill="clear" className="pd-bell-btn">
                  <IonIcon icon={notificationsOutline} />
                  <span className="pd-bell-dot" />
                </IonButton>

                <div id="pd-page-profile-trigger" className="pd-profile-trigger">
                  <div className="pd-profile-avatar-sm">
                    {getInitials(packer?.name)}
                  </div>
                  <IonIcon icon={chevronDownOutline} className="pd-profile-caret" />
                </div>

                <IonPopover trigger="pd-page-profile-trigger" dismissOnSelect side="bottom" alignment="end">
                  <div className="packer-dash pd-profile-popover">
                    <div className="pd-popover-head">
                      <p className="pd-popover-name">{packer?.name}</p>
                      <p className="pd-popover-email">{packer?.email}</p>
                    </div>
                    <IonList lines="none">
                      <div className="pd-popover-item" onClick={() => setProfileOpen(true)}>
                        <IonIcon icon={personOutline} />
                        My Profile
                      </div>
                      <div className="pd-popover-item danger" onClick={() => setLogoutConfirmOpen(true)}>
                        <IonIcon icon={logOutOutline} />
                        Logout
                      </div>
                    </IonList>
                  </div>
                </IonPopover>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent fullscreen className="packer-dash">
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          {/* GREETING HERO */}
          <div className="pd-hero">
            <div className="pd-hero-avatar">
              {getInitials(packer?.name)}
            </div>
            <div>
              <p className="pd-hero-greeting">{getGreeting()},</p>
              <h2 className="pd-hero-name">{packer?.name || 'Packer'}</h2>
              <p className="pd-hero-sub">Here's your packing summary for today</p>
            </div>
          </div>

          {/* OVERVIEW STATS */}
          <div className="pd-section-title">Overview</div>

          <div className="pd-stats-grid">
            {STATUS_FLOW.map(s => (
              <div
                key={s}
                className="pd-stat-card"
                data-status={s}
                onClick={() => goToStatusPage(s)}
              >
                <span className="pd-stat-icon-wrap">
                  <IonIcon icon={STATUS_ICONS[s]} />
                </span>
                <h2 className="pd-stat-value">{stats[s]}</h2>
                <div className="pd-stat-label">{STATUS_LABELS[s]}</div>
              </div>
            ))}
          </div>

          {loading && <p className="pd-loading">Loading orders...</p>}

          <PackerProfileModal
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
          />

          <IonAlert
            isOpen={logoutConfirmOpen}
            header="Logout?"
            message="Are you sure you want to log out?"
            buttons={[
              { text: 'Cancel', role: 'cancel' },
              { text: 'Logout', handler: handleLogout },
            ]}
            onDidDismiss={() => setLogoutConfirmOpen(false)}
          />

          <IonToast
            isOpen={toast.open}
            message={toast.message}
            duration={2500}
            color={toast.color}
            onDidDismiss={() => setToast({ ...toast, open: false })}
          />
        </IonContent>
      </IonPage>
    </>
  );
};

export default PackerDashboard;