const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  category: String,
  streak: {
    type: Number,
    default: 0,
  },
  bestStreak: {
    type: Number,
    default: 0,
  },
  // --- THIS IS THE KEY CHANGE ---
  // Tracks the last date the habit was marked as complete.
  lastCompleted: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Habit', HabitSchema);