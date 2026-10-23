import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/PackerDashboard';
import PackerOrderStatusPage from './pages/PackerOrderStatusPage';
import { getToken } from './api';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

setupIonicReact();

// ✅ Simple private route — agar token nahi hai to /login pe bhej do
const PrivateRoute: React.FC<{ path: string; exact?: boolean; children: React.ReactNode }> = ({
  path,
  exact,
  children,
}) => (
  <Route
    exact={exact}
    path={path}
    render={() => (getToken() ? children : <Redirect to="/login" />)}
  />
);

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        {/* ✅ Login — public route */}
        <Route exact path="/login">
          <Login />
        </Route>

        {/* ✅ Dashboard — top-level route */}
        <PrivateRoute exact path="/dashboard">
          <Dashboard />
        </PrivateRoute>

        {/* ✅ Status page — apna alag top-level route, Dashboard ke andar nested NAHI */}
        <PrivateRoute exact path="/packer/orders/:status">
          <PackerOrderStatusPage />
        </PrivateRoute>

        <PrivateRoute exact path="/home">
          <Home />
        </PrivateRoute>

        {/* ✅ Root "/" — login hai to dashboard, warna login page */}
        <Route exact path="/">
          <Redirect to={getToken() ? '/dashboard' : '/login'} />
        </Route>

        {/* ✅ Catch-all — koi bhi unknown route pe bhi blank screen na aaye */}
        <Route render={() => <Redirect to={getToken() ? '/dashboard' : '/login'} />} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;