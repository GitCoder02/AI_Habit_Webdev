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

const BRAND = {
  blue: "#2C7BE5",
  teal: "#31B7BA",
  gradient: "linear-gradient(135deg, #2C7BE5 0%, #31B7BA 100%)",
};

export default function ChatCoach({ isOpen, onClose }) {
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, showSuggestions]);

  // Socket connection (kept logic)
  useEffect(() => {
    if (!isOpen || !token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
      newSocket.emit('authenticate', token);
    });

    newSocket.on('connect_error', (err) => {
      setError('Connection failed. Please try again.');
      setConnected(false);
    });

    newSocket.on('authenticated', (response) => {
      if (response.success) {
        newSocket.emit('getChatHistory', { conversationId });
      } else {
        setError(response.error || 'Authentication failed');
        setConnected(false);
      }
    });

    newSocket.on('chatHistory', (data) => {
      const formatted = (data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
      setMessages(formatted);
      if (formatted.length > 0) setShowSuggestions(false);
    });

    newSocket.on('chatResponse', (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: data.timestamp },
      ]);
      setShowSuggestions(false);
    });

    newSocket.on('typing', (typing) => setIsTyping(typing));

    newSocket.on('error', (err) => {
      setError(err.message || 'Socket error');
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [isOpen, token]);

  const sendMessage = (messageText = inputMessage) => {
    if (!messageText.trim() || !socket || !connected) return;

    const userMsg = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    socket.emit('chatMessage', {
      message: messageText.trim(),
      conversationId,
    });

    setInputMessage('');
    setShowSuggestions(false);
  };

  const handleSuggestedQuestion = (query) => sendMessage(query);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl h-[620px] rounded-2xl border border-blue-100/60 bg-white/80 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ background: BRAND.gradient }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <FaRobot className="text-teal-500 text-xl" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">AI Coach</h3>
              <p className="text-blue-50/90 text-xs">
                {connected ? '🟢 Online' : error ? `🔴 ${error}` : '🟡 Connecting...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            title="Close"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-blue-50/60 to-white">
          {messages.length === 0 && !error && (
            <div className="text-center text-gray-600 mt-8">
              <FaRobot className="text-5xl mx-auto mb-3 text-teal-400" />
              <p className="text-lg font-medium">Hi! I'm your AI Coach 👋</p>
              <p className="text-sm mt-1">Ask me anything about your habits, goals, or productivity.</p>
            </div>
          )}

          {error && !connected && (
            <div className="text-center text-red-600 mt-8 p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="font-semibold">Connection Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-teal-500' : 'bg-blue-100'}`}>
                  {msg.role === 'user' ? <FaUser className="text-white text-sm" /> : <FaRobot className="text-blue-700 text-sm" />}
                </div>

                <div
                  className={`px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-white text-gray-800 border border-blue-100 shadow-sm'
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

                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-teal-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaRobot className="text-blue-700 text-sm" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showSuggestions && messages.length === 0 && !isTyping && connected && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <FaLightbulb className="text-amber-500" />
                <p className="text-sm font-semibold text-gray-700">Suggested questions</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_QUESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(s.query)}
                    className="flex items-center gap-3 p-3 bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50/60 rounded-lg transition text-left"
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-sm text-gray-700 font-medium">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white/90 border-t border-blue-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={connected ? "Type your message..." : "Connecting..."}
              className="flex-1 px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 bg-white"
              disabled={!connected}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || !connected}
              className="px-5 py-3 rounded-lg text-white transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
              style={{ background: (!inputMessage.trim() || !connected) ? undefined : BRAND.gradient }}
              title="Send"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
