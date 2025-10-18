// backend/models/ChatMessage.js
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
});

// Index for faster queries
ChatMessageSchema.index({ user: 1, conversationId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);