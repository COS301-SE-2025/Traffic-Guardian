// src/App.tsx
import React from 'react';
import './App.css';
import NavBar from './components/NavBar';  

const App: React.FC = () => {
  return (
    <div className='page'>
      <NavBar /> 
    </div>
  );
};

export default App;