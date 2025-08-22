// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const habitRoutes = require('./routes/habits');
const goalsRoutes = require('./routes/goals');
const eventsRoutes = require('./routes/events');
const googleRoutes = require('./routes/google'); // Google Calendar routes
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Middlewares
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));

// Mongo
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/google', googleRoutes); // Google Calendar routes
app.use('/api/dashboard', dashboardRoutes);
app.get('/', (_req, res) => res.send('Habit Coach API (Phase 1)'));

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
