import React from 'react';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
} from '@ionic/react';
import {
  menuOutline,
  notificationsOutline,
  chevronDownOutline,
  personOutline,
  logOutOutline,
} from 'ionicons/icons';
import { getUser } from '../api';
import './PackerDashboard.css';

const getInitials = (name?: string) =>
  name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';

interface Props {
  menuId?: string;           // agar diya to hamburger button dikhega
  backHref?: string;         // agar diya to back button dikhega (menuId ke bajaye)
  title?: string;            // back-variant ke sath title
  icon?: string;             // back-variant ke sath icon
  onProfileClick: () => void;
  onLogoutClick: () => void;
}

const PackerHeader: React.FC<Props> = ({
  menuId,
  backHref,
  title,
  icon,
  onProfileClick,
  onLogoutClick,
}) => {
  const packer = getUser();

  return (
    <IonHeader className="ion-no-border">
      <IonToolbar className="pd-topbar">
        <div className="pd-topbar-inner">
          <div className="pd-topbar-left">
            <IonButtons>
              {backHref ? (
                <IonBackButton defaultHref={backHref} text="" className="pd-back-btn" />
              ) : (
                <IonMenuButton className="pd-menu-btn" menu={menuId} autoHide={false}>
                  <IonIcon icon={menuOutline} />
                </IonMenuButton>
              )}
            </IonButtons>

            {title && (
              <div className="pd-status-page-title">
                {icon && <IonIcon icon={icon} />}
                <span>{title}</span>
              </div>
            )}
          </div>

          <div className="pd-topbar-right">
            <IonButton fill="clear" className="pd-bell-btn">
              <IonIcon icon={notificationsOutline} />
              <span className="pd-bell-dot" />
            </IonButton>

            <div id="pd-profile-trigger" className="pd-profile-trigger">
              <div className="pd-profile-avatar-sm">
                {getInitials(packer?.name)}
              </div>
              <div className="pd-profile-caret-wrap">
                <IonIcon icon={chevronDownOutline} className="pd-profile-caret" />
              </div>
            </div>

            <IonPopover
              trigger="pd-profile-trigger"
              dismissOnSelect
              side="bottom"
              alignment="end"
              className="pd-profile-pop"
            >
              <div className="pd-profile-popover">
                <div className="pd-popover-head">
                  <p className="pd-popover-name">{packer?.name}</p>
                  <p className="pd-popover-email">{packer?.email}</p>
                </div>
                <IonList lines="none">
                  <div className="pd-popover-item" onClick={onProfileClick}>
                    <IonIcon icon={personOutline} />
                    My Profile
                  </div>
                  <div className="pd-popover-item danger" onClick={onLogoutClick}>
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
  );
};

export default PackerHeader;