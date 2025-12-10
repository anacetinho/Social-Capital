import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ConnectionPath from './ConnectionPath';
import '../styles/ChatSidebar.css';

const ChatMessage = ({ message }) => {
  const { role, content, tool_calls, created_at, isEmpty } = message;
  const [expandedTools, setExpandedTools] = useState({});

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const toggleToolExpanded = (index) => {
    setExpandedTools(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderToolCall = (toolCall, index) => {
    const isExpanded = expandedTools[index];

    let toolIcon = '🔧';
    let toolDescription = '';

    switch (toolCall.tool) {
      case 'search_network':
        toolIcon = '🔍';
        toolDescription = `Searched network for: "${toolCall.args?.query}"`;
        break;
      case 'get_person_summary':
        toolIcon = '📄';
        toolDescription = 'Retrieved person information';
        break;
      case 'find_connection_path':
        toolIcon = '🔗';
        toolDescription = 'Found connection path';
        break;
      case 'get_network_context':
        toolIcon = '🌐';
        toolDescription = 'Retrieved network context';
        break;
      default:
        toolDescription = `Executed: ${toolCall.tool}`;
    }

    return (
      <div key={index} className="tool-call-card">
        <div
          className="tool-call-header"
          onClick={() => toggleToolExpanded(index)}
        >
          <span className="tool-icon">{toolIcon}</span>
          <span className="tool-description">{toolDescription}</span>
          <span className="tool-expand-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {isExpanded && toolCall.result && (
          <div className="tool-call-result">
            {/* Special handling for connection path results */}
            {toolCall.tool === 'find_connection_path' && toolCall.result.found ? (
              <ConnectionPath pathData={toolCall.result} />
            ) : toolCall.tool === 'search_network' && Array.isArray(toolCall.result) ? (
              <div className="search-results">
                <div className="result-count">
                  Found {toolCall.result.length} {toolCall.result.length === 1 ? 'person' : 'people'}
                </div>
                {toolCall.result.slice(0, 5).map((person, idx) => (
                  <div key={idx} className="search-result-item">
                    <strong>{person.name}</strong>
                    {person.connection && (
                      <span className="connection-info">
                        {' '}({person.connection.degrees} degree{person.connection.degrees !== 1 ? 's' : ''} away)
                      </span>
                    )}
                  </div>
                ))}
                {toolCall.result.length > 5 && (
                  <div className="result-more">
                    ...and {toolCall.result.length - 5} more
                  </div>
                )}
              </div>
            ) : (
              <pre className="tool-result-json">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`chat-message ${role}`}>
      <div className="message-avatar">
        {role === 'user' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        )}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="message-role">
            {role === 'user' ? 'You' : 'AI Assistant'}
          </span>
          {created_at && (
            <span className="message-timestamp">
              {formatTimestamp(created_at)}
            </span>
          )}
        </div>

        {/* Tool calls (if any) */}
        {tool_calls && tool_calls.length > 0 && (
          <div className="tool-calls-container">
            {tool_calls.map((tc, idx) => renderToolCall(tc, idx))}
          </div>
        )}

        {/* Message content with markdown */}
        <div className={`message-text ${isEmpty ? 'message-empty' : ''}`}>
          {isEmpty && (
            <div className="empty-response-warning">
              ⚠️ Empty Response - Please check backend logs or try again
            </div>
          )}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // Make links open in new tab
              a({ node, children, ...props }) {
                return (
                  <a {...props} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              }
            }}
          >
            {content || ''}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
