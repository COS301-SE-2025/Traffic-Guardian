import React from 'react';
import './App.css';
import { ThemeProvider } from './consts/ThemeContext';
import { SocketProvider } from './consts/SocketContext';
import { LiveFeedProvider } from './contexts/LiveFeedContext';
import { UserProvider } from './contexts/UserContext';
import NavBar from './components/NavBar';
import GlobalAlertBadge from './components/GlobalAlertBadge';
import DataAttribution from './components/DataAttribution';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Map from './pages/Map';
import Incidents from './pages/Incidents';
import Account from './pages/Account';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Archives from './pages/Archives';
import Help from './pages/Help';
import IncidentManagement from './pages/IncidentManagement';
import PageWrapper from './components/PageWrapper';
import ProtectedRoute from './utils/ProtectedRoute';

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dataPrefetchService from './services/DataPrefetchService';

const AnimatedRoutes = () => {
  const location = useLocation();

  const isLandingPage = location.pathname === '/';

  return (
    <>
      {!isLandingPage && <NavBar />}

      {/* Global Alert Badge - appears on all pages except landing, account, signup */}
      <GlobalAlertBadge />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/dashboard"
            element={
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            }
          />
          <Route
            path="/live-feed"
            element={
              <PageWrapper>
                <LiveFeed />
              </PageWrapper>
            }
          />
          <Route
            path="/map"
            element={
              <PageWrapper>
                <Map />
              </PageWrapper>
            }
          />
          <Route
            path="/incidents"
            element={
              <PageWrapper>
                <Incidents />
              </PageWrapper>
            }
          />
          <Route
            path="/account"
            element={
              <PageWrapper>
                <Account />
              </PageWrapper>
            }
          />
          <Route
            path="/analytics"
            element={
              <PageWrapper>
                <Analytics />
              </PageWrapper>
            }
          />
          <Route
            path="/archives"
            element={
              <PageWrapper>
                <Archives />
              </PageWrapper>
            }
          />
          <Route
            path="/signup"
            element={
              <PageWrapper>
                <SignUp />
              </PageWrapper>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PageWrapper>
                  <Profile />
                </PageWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/incident-management"
            element={
              <PageWrapper>
                <IncidentManagement />
              </PageWrapper>
            }
          />
          <Route
            path="/help"
            element={
              <PageWrapper>
                <Help />
              </PageWrapper>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const App: React.FC = () => {
  const initialTheme = localStorage.getItem('theme');
  const isDarkMode = initialTheme ? initialTheme === 'dark' : true;

  // Check if user is already logged in and start prefetching
  React.useEffect(() => {
    const apiKey = sessionStorage.getItem('apiKey');
    if (apiKey) {
      console.log('🔄 App startup: Starting background data prefetching...');
      dataPrefetchService.startPrefetching();
    }

    // Cleanup on unmount
    return () => {
      dataPrefetchService.stopPrefetching();
    };
  }, []);

  return (
    <ThemeProvider initialDarkMode={isDarkMode}>
      <UserProvider>
        <Router>
          <SocketProvider>
            <LiveFeedProvider>
            <div className="App">
              <AnimatedRoutes />
              <DataAttribution />

              {/* Global Toast Container for real-time notifications */}
              <ToastContainer
                position="top-right"
                autoClose={8000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                style={{ zIndex: 99999 }}
              />
            </div>
          </LiveFeedProvider>
        </SocketProvider>
      </Router>
    </UserProvider>
    </ThemeProvider>
  );
};

export default App;
