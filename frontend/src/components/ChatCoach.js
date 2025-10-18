// frontend/src/components/ChatCoach.js
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaTimes, FaLightbulb } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const SUGGESTED_QUESTIONS = [
  { icon: '🎯', text: 'Help me with my goals', query: 'Based on my current goals, what should I focus on today?' },
  { icon: '💪', text: 'Improve my habits', query: 'How can I improve consistency with my habits?' },
  { icon: '📅', text: 'Optimize my schedule', query: 'When are my best free time slots this week?' },
  { icon: '🚀', text: 'Boost productivity', query: 'Give me 3 personalized productivity tips based on my data' },
];

function ChatCoach({ isOpen, onClose }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const conversationId = 'default';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Socket connection
  useEffect(() => {
    if (!isOpen || !token) return;

    console.log('[ChatCoach] Connecting to:', SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
      setError(null);
      newSocket.emit('authenticate', token);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err);
      setError('Connection failed. Please try again.');
      setConnected(false);
    });

    newSocket.on('authenticated', (response) => {
      console.log('✅ Authenticated:', response);
      if (response.success) {
        newSocket.emit('getChatHistory', { conversationId });
      } else {
        setError(response.error);
        setConnected(false);
      }
    });

    newSocket.on('chatHistory', (data) => {
      console.log('✅ Chat history:', data.messages.length, 'messages');
      const formattedMessages = data.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      setMessages(formattedMessages);
      if (formattedMessages.length > 0) {
        setShowSuggestions(false);
      }
    });

    newSocket.on('chatResponse', (data) => {
      console.log('✅ AI response received');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: data.timestamp,
        },
      ]);
      setShowSuggestions(false);
    });

    newSocket.on('typing', (typing) => {
      setIsTyping(typing);
    });

    newSocket.on('error', (err) => {
      console.error('❌ Socket error:', err);
      setError(err.message);
    });

    setSocket(newSocket);

    return () => {
      console.log('[ChatCoach] Closing socket');
      newSocket.close();
    };
  }, [isOpen, token]);

  const sendMessage = (messageText = inputMessage) => {
    if (!messageText.trim() || !socket || !connected) return;

    console.log('[ChatCoach] Sending:', messageText);

    const userMsg = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    socket.emit('chatMessage', {
      message: messageText,
      conversationId,
    });

    setInputMessage('');
    setShowSuggestions(false);
  };

  const handleSuggestedQuestion = (query) => {
    sendMessage(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportChat = () => {
  const chatText = messages.map((msg) => {
    const time = new Date(msg.timestamp).toLocaleString();
    const sender = msg.role === 'user' ? 'You' : 'AI Coach';
    return `[${time}] ${sender}: ${msg.content}`;
  }).join('\n\n');

  const blob = new Blob([chatText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-coach-chat-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      setMessages([]);
      setShowSuggestions(true);
      // TODO: Add backend API call to delete from database
      console.log('[ChatCoach] Chat cleared locally');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header - with action buttons */}
        <div
          className="p-4 rounded-t-xl"
          style={{ background: 'linear-gradient(135deg, #31B7BA 0%, #26949E 100%)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <FaRobot className="text-teal-500 text-xl" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">AI Coach</h3>
                <p className="text-teal-100 text-xs">
                  {connected ? '🟢 Online' : error ? `🔴 ${error}` : '🟡 Connecting...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
              title="Close"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Action buttons */}
          {messages.length > 0 && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={exportChat}
                className="flex items-center gap-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs rounded-lg transition"
                title="Export chat as text file"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/>
                </svg>
                Export
              </button>
              <button
                onClick={clearChat}
                className="flex items-center gap-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs rounded-lg transition"
                title="Clear chat history"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                Clear
              </button>
            </div>
          )}
        </div>


        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && !error && (
            <div className="text-center text-gray-500 mt-8">
              <FaRobot className="text-5xl mx-auto mb-3 text-teal-400" />
              <p className="text-lg font-medium">Hi! I'm your AI Coach 👋</p>
              <p className="text-sm mt-2">Ask me anything about your habits, goals, or productivity!</p>
            </div>
          )}

          {error && !connected && (
            <div className="text-center text-red-500 mt-8 p-4 bg-red-50 rounded-lg">
              <p className="font-semibold">Connection Error</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Reload Page
              </button>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-2 max-w-[80%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-teal-500' : 'bg-gray-300'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <FaUser className="text-white text-sm" />
                  ) : (
                    <FaRobot className="text-gray-700 text-sm" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-teal-500 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-sm prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>
                            ) : (
                              <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto">{children}</code>
                            ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-teal-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <FaRobot className="text-gray-700 text-sm" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {showSuggestions && messages.length === 0 && !isTyping && connected && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FaLightbulb className="text-yellow-500" />
                <p className="text-sm font-semibold text-gray-700">Suggested questions:</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_QUESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(suggestion.query)}
                    className="flex items-center gap-3 p-3 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 hover:border-teal-400 transition-all text-left group"
                  >
                    <span className="text-2xl">{suggestion.icon}</span>
                    <span className="text-sm text-gray-700 group-hover:text-teal-700 font-medium">
                      {suggestion.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={connected ? "Type your message..." : "Connecting..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              disabled={!connected}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || !connected}
              className="px-6 py-3 rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: inputMessage.trim() && connected ? '#31B7BA' : undefined }}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatCoach;
