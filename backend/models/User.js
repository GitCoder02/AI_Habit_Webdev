const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  // placeholders for Phase 2+:
  google: {
    accessToken: String,
    refreshToken: String,
    scope: String,
    tokenType: String,
    expiryDate: Number,
  },
  isCalendarConnected: { type: Boolean, default: false },
  googleConnectedAt: { type: Date }, // <-- Add this line
});

module.exports = mongoose.model('User', UserSchema);
