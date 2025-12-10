import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatFloatingButton from './ChatFloatingButton';
import ChatSidebar from './ChatSidebar';
import api from '../services/api';

const Layout = ({ children, currentPerson = null }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Check if AI assistant is enabled
  useEffect(() => {
    const checkAiStatus = async () => {
      try {
        const response = await api.get('/settings/ai');
        setAiEnabled(response.data.settings.ai_assistant_enabled);
      } catch (err) {
        console.error('Failed to check AI status:', err);
      }
    };

    checkAiStatus();
  }, []);

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Social Capital</h2>
          <p>{user?.email}</p>
        </div>

        <ul className="sidebar-nav">
          <li>
            <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/people" className={isActive('/people') ? 'active' : ''}>
              People
            </Link>
          </li>
          <li>
            <Link to="/relationships" className={isActive('/relationships') ? 'active' : ''}>
              Relationships
            </Link>
          </li>
          <li>
            <Link to="/interactions" className={isActive('/interactions') ? 'active' : ''}>
              Interactions
            </Link>
          </li>
          <li>
            <Link to="/assets" className={isActive('/assets') ? 'active' : ''}>
              Assets
            </Link>
          </li>
          <li>
            <Link to="/network" className={isActive('/network') ? 'active' : ''}>
              Network Graph
            </Link>
          </li>
        </ul>

        <div className="sidebar-footer">
          <Link to="/settings" className={isActive('/settings') ? 'active' : ''}>
            Settings
          </Link>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">{children}</main>

      {/* AI Assistant Chat */}
      {aiEnabled && (
        <>
          <ChatFloatingButton
            onClick={() => setChatOpen(!chatOpen)}
            isOpen={chatOpen}
          />
          <ChatSidebar
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            currentPerson={currentPerson}
          />
        </>
      )}
    </div>
  );
};

export default Layout;
