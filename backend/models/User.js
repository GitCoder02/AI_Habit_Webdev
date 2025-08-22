const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  // placeholders for Phase 2+:
  googleTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Date
  },
  isCalendarConnected: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
