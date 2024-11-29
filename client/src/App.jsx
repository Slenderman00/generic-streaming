import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LoginPage from './pages/login.jsx'
import RegisterPage from './pages/register.jsx'
import { auth } from './frameworks/auth.js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/home.jsx'

function App() {


  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!!auth.isAuthenticated()) {
      if (currentPath === '/login' || currentPath === '/register') {
        window.location.replace('/');
      }
    } else {
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.replace('/login');
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage /> } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;