// backend/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const habitRoutes = require('./routes/habits');
const goalsRoutes = require('./routes/goals');
const eventsRoutes = require('./routes/events');
const googleRoutes = require('./routes/google');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling']
});

// Middlewares
app.use(express.json());
app.use(helmet());
app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', 
  credentials: true 
}));

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// REST API Routes - MAKE SURE THESE ARE CORRECT
app.use('/api/auth', authRoutes);              // ✅ /api/auth/login
app.use('/api', protectedRoutes);              // ✅ /api/protected
app.use('/api/habits', habitRoutes);           // ✅ /api/habits
app.use('/api/goals', goalsRoutes);            // ✅ /api/goals
app.use('/api/events', eventsRoutes);          // ✅ /api/events
app.use('/api/google', googleRoutes);          // ✅ /api/google
app.use('/api/dashboard', dashboardRoutes);    // ✅ /api/dashboard
app.use('/api/ai', aiRoutes);                  // ✅ /api/ai

app.get('/', (_req, res) => res.send('Habit Coach API'));

// Socket.io Chat
const chatCoachService = require('./services/chatCoachService');

io.on('connection', (socket) => {
  console.log('✅ [Socket.io] Client connected:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      if (!token) {
        socket.emit('authenticated', { success: false, error: 'No token' });
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.emit('authenticated', { success: true });
      console.log('✅ [Socket.io] Authenticated:', decoded.id);
    } catch (error) {
      console.error('❌ [Socket.io] Auth error:', error.message);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });

  socket.on('chatMessage', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      const { message, conversationId } = data;
      console.log('📩 [Socket.io] Message:', message);
      socket.emit('typing', true);
      const response = await chatCoachService.generateChatResponse(
        socket.userId,
        message,
        conversationId || 'default'
      );
      socket.emit('typing', false);
      socket.emit('chatResponse', response);
      console.log('✅ [Socket.io] Response sent');
    } catch (error) {
      console.error('❌ [Socket.io] Error:', error);
      socket.emit('typing', false);
      socket.emit('error', { message: 'Failed to generate response' });
    }
  });

  socket.on('getChatHistory', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      const { conversationId } = data;
      console.log('📜 [Socket.io] Loading history');
      const history = await chatCoachService.getChatHistory(
        socket.userId,
        conversationId || 'default'
      );
      socket.emit('chatHistory', { messages: history });
      console.log('✅ [Socket.io] History sent:', history.length);
    } catch (error) {
      console.error('❌ [Socket.io] History error:', error);
      socket.emit('error', { message: 'Failed to load history' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ [Socket.io] Disconnected:', socket.id, 'Reason:', reason);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.io ready for connections');
});
