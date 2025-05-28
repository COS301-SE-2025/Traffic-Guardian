// src/App.tsx
import React from 'react';
import './App.css';
import { ThemeProvider } from './consts/ThemeContext'
import NavBar from './components/NavBar';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Incidents from './pages/Incidents';
import Account from './pages/Account';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Archives from './pages/Archives';
import IncidentManagement from './pages/IncidentManagement';
import PageWrapper from './components/PageWrapper';

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/live-feed" element={<PageWrapper><LiveFeed /></PageWrapper>} />
        <Route path="/incidents" element={<PageWrapper><Incidents /></PageWrapper>} />
        <Route path="/account" element={<PageWrapper><Account /></PageWrapper>} />
        <Route path="/analytics" element={<PageWrapper><Analytics /></PageWrapper>} />
        <Route path="/archives" element={<PageWrapper><Archives /></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><SignUp /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
        <Route path="/incident-management" element={<PageWrapper><IncidentManagement /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <NavBar />
        <AnimatedRoutes />
      </Router>
    </ThemeProvider>
  );
};

export default App;
