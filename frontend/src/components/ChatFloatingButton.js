import React from 'react';
import '../styles/ChatSidebar.css';

const ChatFloatingButton = ({ onClick, isOpen }) => {
  return (
    <button
      className={`chat-floating-button ${isOpen ? 'active' : ''}`}
      onClick={onClick}
      aria-label="Toggle AI Assistant"
      title="AI Assistant"
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )}
      {!isOpen && <span className="notification-badge">AI</span>}
    </button>
  );
};

export default ChatFloatingButton;
