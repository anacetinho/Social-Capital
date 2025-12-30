import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ThinkingIndicator from './ThinkingIndicator';
import StreamingText from './StreamingText';
import api from '../services/api';
import '../styles/ChatSidebar.css';

const ChatSidebar = ({ isOpen, onClose, currentPerson = null }) => {
  // State
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [toolCalls, setToolCalls] = useState([]);
  const [error, setError] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);

  // Persona state
  const [people, setPeople] = useState([]);
  const [askingAs, setAskingAs] = useState(null);
  const [talkingTo, setTalkingTo] = useState(null);
  const [, setKeyPerson] = useState(null); // keyPerson value not used, only setter

  // Chat management state
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Refs
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadPeople = useCallback(async () => {
    try {
      const response = await api.get('/people/dropdown/list');
      setPeople(response.data.people || []);
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  }, []);

  const loadKeyPerson = useCallback(async () => {
    try {
      const response = await api.get('/settings/ai');
      if (response.data.settings.key_person) {
        setKeyPerson(response.data.settings.key_person);
        setAskingAs(response.data.settings.key_person);
      }
    } catch (err) {
      console.error('Failed to load key person:', err);
    }
  }, []);

  const loadChat = useCallback(async (chatId) => {
    try {
      const response = await api.get(`/chats/${chatId}`);
      setCurrentChat(response.data.chat);
      setMessages(response.data.messages || []);

      // Set personas from chat
      if (response.data.chat.asking_as_person) {
        setAskingAs(response.data.chat.asking_as_person);
      }
      if (response.data.chat.talking_to_person) {
        setTalkingTo(response.data.chat.talking_to_person);
      }

      setError('');
    } catch (err) {
      setError('Failed to load chat');
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const response = await api.get('/chats');
      setChats(response.data.chats || []);

      // Load the most recent chat if exists
      if (response.data.chats && response.data.chats.length > 0 && !currentChat) {
        loadChat(response.data.chats[0].id);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, [currentChat, loadChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load data when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadChats();
      loadPeople();
      loadKeyPerson();
    }
  }, [isOpen, loadChats, loadPeople, loadKeyPerson]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const createNewChat = async (message) => {
    try {
      // Build context object if currentPerson is available
      const context = currentPerson ? {
        personId: currentPerson.id,
        personName: currentPerson.name,
        personGender: currentPerson.gender,
        personAddress: currentPerson.address
      } : null;

      const response = await api.post('/chats', {
        message,
        context,
        askingAsPersonId: askingAs?.id || null,
        talkingToPersonId: talkingTo?.id || null
      });
      const newChat = response.data.chat;

      setChats(prev => [newChat, ...prev]);
      setCurrentChat(newChat);

      // Add user message to display immediately
      setMessages([{
        id: 'temp-' + Date.now(),
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      }]);

      // Start streaming the response
      startStreaming(newChat.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create chat');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    const messageContent = input.trim();
    setInput('');
    setError('');

    try {
      if (!currentChat) {
        // Create new chat with first message
        await createNewChat(messageContent);
      } else {
        // Add message to existing chat
        await api.post(`/chats/${currentChat.id}/messages`, {
          content: messageContent
        });

        // Add user message to display
        setMessages(prev => [...prev, {
          id: 'temp-' + Date.now(),
          role: 'user',
          content: messageContent,
          created_at: new Date().toISOString()
        }]);

        // Start streaming
        startStreaming(currentChat.id);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    }
  };

  const startStreaming = (chatId) => {
    setStreaming(true);
    setStreamingContent('');
    setToolCalls([]);

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setStreaming(false);
      return;
    }

    // Create EventSource with token
    const eventSource = new EventSource(
      `/api/v1/chats/${chatId}/stream?token=${token}`
    );
    eventSourceRef.current = eventSource;

    let fullContent = '';

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setStreaming(false);

        // Add complete message to messages array
        // Always add the message, even if empty, so user knows something happened
        const messageContent = fullContent || 'No response generated. This may indicate an issue with the AI assistant.';

        setMessages(prev => [...prev, {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: messageContent,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          created_at: new Date().toISOString(),
          isEmpty: !fullContent // Mark empty responses
        }]);
        setStreamingContent('');
        setToolCalls([]);

        // Reload chat list to update timestamps
        loadChats();
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data.type === 'thinking') {
          // Show thinking indicator
          setStreamingContent('');
        } else if (data.type === 'content') {
          // Append content chunk
          fullContent += data.content;
          setStreamingContent(fullContent);
        } else if (data.type === 'tool_call') {
          // Handle tool call
          setToolCalls(prev => {
            const existing = prev.find(tc => tc.tool === data.tool);
            if (existing) {
              return prev.map(tc =>
                tc.tool === data.tool
                  ? { ...tc, status: data.status, result: data.result, args: data.args }
                  : tc
              );
            } else {
              return [...prev, {
                tool: data.tool,
                status: data.status,
                result: data.result,
                args: data.args
              }];
            }
          });
        } else if (data.type === 'done') {
          fullContent = data.content || fullContent;
          setStreamingContent(fullContent);
        } else if (data.type === 'error') {
          setError(data.error);
          setStreaming(false);
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      setError('Connection lost. Please try again.');
      setStreaming(false);
      eventSource.close();
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat?')) return;

    try {
      await api.delete(`/chats/${chatId}`);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to delete chat');
    }
  };

  const handleRenameChat = async (chatId, newTitle) => {
    try {
      await api.patch(`/chats/${chatId}`, { title: newTitle });
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, title: newTitle } : c
      ));
      if (currentChat?.id === chatId) {
        setCurrentChat({ ...currentChat, title: newTitle });
      }
      setEditingChatId(null);
      setEditingTitle('');
    } catch (err) {
      setError('Failed to rename chat');
    }
  };

  const startNewChat = async () => {
    // Prevent creating multiple chats simultaneously
    if (creatingChat || streaming) return;

    setCreatingChat(true);
    setError('');

    try {
      // Validate that personas exist if selected
      if (askingAs && !people.find(p => p.id === askingAs.id)) {
        setError('Selected "Asking as" person is invalid. Please reselect.');
        setCreatingChat(false);
        return;
      }

      if (talkingTo && !people.find(p => p.id === talkingTo.id)) {
        setError('Selected "Talking to" person is invalid. Please reselect.');
        setCreatingChat(false);
        return;
      }

      // Build context object if currentPerson is available
      const context = currentPerson ? {
        personId: currentPerson.id,
        personName: currentPerson.name,
        personGender: currentPerson.gender,
        personAddress: currentPerson.address
      } : null;

      // Create new empty chat with current persona selections
      const response = await api.post('/chats', {
        context,
        askingAsPersonId: askingAs?.id || null,
        talkingToPersonId: talkingTo?.id || null
        // No message - creates empty chat
      });

      const newChat = response.data.chat;

      // Update state with new chat
      setChats(prev => [newChat, ...prev]);
      setCurrentChat(newChat);
      setMessages([]);
      setStreamingContent('');
      setError('');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to create chat';
      const errorDetails = err.response?.data?.details;
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    } finally {
      setCreatingChat(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="chat-sidebar-overlay" onClick={onClose}>
      <div className="chat-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="chat-sidebar-header">
          <h2>AI Assistant</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="chat-sidebar-content">
          {/* Left panel - Chat history */}
          <div className="chat-list-panel">
            <div className="chat-list-header">
              <button 
                className="new-chat-btn" 
                onClick={startNewChat}
                disabled={creatingChat || streaming}
              >
                {creatingChat ? 'Creating...' : '+ New Chat'}
              </button>
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="chat-search"
              />
            </div>

            <div className="chat-list">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => loadChat(chat.id)}
                >
                  {editingChatId === chat.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleRenameChat(chat.id, editingTitle)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRenameChat(chat.id, editingTitle)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="chat-rename-input"
                    />
                  ) : (
                    <>
                      <div className="chat-item-title">{chat.title}</div>
                      <div className="chat-item-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(chat.id);
                            setEditingTitle(chat.title);
                          }}
                          className="chat-action-btn"
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="chat-action-btn delete"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel - Active chat */}
          <div className="chat-messages-panel">
            {/* Persona dropdowns */}
            <div className="persona-controls">
              <div className="persona-dropdown">
                <label>Asking as:</label>
                <select
                  value={askingAs?.id || ''}
                  onChange={async (e) => {
                    const person = people.find(p => p.id === e.target.value);
                    setAskingAs(person || null);
                    
                    // Update current chat if one is loaded
                    if (currentChat) {
                      try {
                        await api.patch(`/chats/${currentChat.id}`, {
                          askingAsPersonId: person?.id || null
                        });
                        // Update currentChat object to stay in sync
                        setCurrentChat(prev => ({
                          ...prev,
                          asking_as_person_id: person?.id || null,
                          asking_as_person: person || null
                        }));
                      } catch (err) {
                        console.error('Failed to update chat persona:', err);
                        setError('Failed to update persona selection');
                      }
                    }
                  }}
                  className="persona-select"
                >
                  <option value="">Select person...</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
                {askingAs && (
                  <div className="persona-indicator">
                    🔍 Finding connections from {askingAs.name}'s perspective
                  </div>
                )}
              </div>

              <div className="persona-dropdown">
                <label>Talking to:</label>
                <select
                  value={talkingTo?.id || ''}
                  onChange={async (e) => {
                    const person = people.find(p => p.id === e.target.value);
                    setTalkingTo(person || null);
                    
                    // Update current chat if one is loaded
                    if (currentChat) {
                      try {
                        await api.patch(`/chats/${currentChat.id}`, {
                          talkingToPersonId: person?.id || null
                        });
                        // Update currentChat object to stay in sync
                        setCurrentChat(prev => ({
                          ...prev,
                          talking_to_person_id: person?.id || null,
                          talking_to_person: person || null
                        }));
                      } catch (err) {
                        console.error('Failed to update chat persona:', err);
                        setError('Failed to update persona selection');
                      }
                    }
                  }}
                  className="persona-select"
                >
                  <option value="">Generic AI Assistant</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
                {talkingTo && (
                  <div className="persona-indicator roleplay">
                    💬 Simulating {talkingTo.name}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <ChatMessage key={msg.id || idx} message={msg} />
              ))}

              {streaming && (
                <div className="message assistant">
                  {streamingContent ? (
                    <>
                      <StreamingText text={streamingContent} />
                      {toolCalls.length > 0 && (
                        <div className="tool-calls">
                          {toolCalls.map((tc, idx) => (
                            <div key={idx} className={`tool-call ${tc.status}`}>
                              {tc.status === 'detected' && `🔧 Detected: ${tc.tool}`}
                              {tc.status === 'running' && `⏳ Running: ${tc.tool}`}
                              {tc.status === 'complete' && `✓ ${tc.tool} completed`}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <ThinkingIndicator />
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error display */}
            {error && (
              <div className="chat-error">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="chat-input-container">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your network..."
                className="chat-input"
                rows="3"
                disabled={streaming}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="send-btn"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
