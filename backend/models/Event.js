const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // --- THIS IS THE FIX ---
  // Renaming 'userId' to 'user' to be consistent with other models
  // and the auth middleware (req.user.id)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    default: 'Other',
  },
  // We can also add googleEventId for future two-way sync features
  googleEventId: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);