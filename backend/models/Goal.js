// models/Goal.js
const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  targetDate: Date,
  category: { type: String, default: "Personal Growth" }, // NEW
  status: { type: String, enum: ["Planning", "Active", "Completed", "Paused"], default: "Planning" }, // NEW
  progress: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Goal', GoalSchema);
