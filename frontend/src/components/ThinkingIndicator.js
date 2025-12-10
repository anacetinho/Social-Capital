import React from 'react';
import '../styles/ChatSidebar.css';

const ThinkingIndicator = () => {
  return (
    <div className="chat-message assistant">
      <div className="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="message-role">AI Assistant</span>
        </div>

        <div className="thinking-indicator">
          <div className="thinking-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="thinking-text">Thinking...</span>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
