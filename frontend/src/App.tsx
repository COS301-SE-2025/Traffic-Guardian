// src/App.tsx
import React from 'react';
import './App.css';
import NavBar from './components/NavBar';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Incidents from './pages/Incidents';
import Account from './pages/Account';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import IncidentManagement from './pages/IncidentManagement';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';  

const App: React.FC = () => {
  return (
    <Router>
      <NavBar />
      <Routes>
       <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/live-feed" element={<LiveFeed />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/account" element={<Account/>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/incident-management" element={<IncidentManagement />} />
      </Routes> 
    </Router>
  );
};

export default App;