// backend/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['habit_warning', 'goal_stagnation', 'streak_alert', 'motivation', 'milestone'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  actionUrl: {
    type: String, // e.g., "/habits" or "/goals/123"
  },
  metadata: {
    type: Object,
    default: {},
    // Store references like habitId, goalId for deeper context
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    // Auto-delete old notifications after 30 days
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});

// Compound index for faster queries
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// TTL index to auto-delete expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', NotificationSchema);