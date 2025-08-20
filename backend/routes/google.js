const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const User = require('../models/User');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// 1️⃣ Generate OAuth URL
router.get('/auth-url', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ msg: 'Missing user ID' });

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',   // ensures refresh token
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent',        // always ask for consent to get refresh token
      state: userId,            // pass userId to callback
    });

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to generate Google auth URL' });
  }
});

// 2️⃣ OAuth Callback
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state;

  if (!code || !userId) return res.status(400).send('Missing code or user info');

  try {
    const { tokens } = await oauth2Client.getToken(code);

    await User.findByIdAndUpdate(userId, {
      googleTokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date,
      },
      isCalendarConnected: true,
    });

    res.send('Google Calendar connected! You can close this tab.');
  } catch (err) {
    console.error('Error exchanging code for tokens:', err);
    res.status(500).send('Failed to connect Google Calendar');
  }
});

// 3️⃣ Fetch Google Calendar events
router.get('/events', async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    if (!user?.googleTokens?.accessToken) {
      return res.status(400).json({ msg: 'Google Calendar not connected' });
    }

    oauth2Client.setCredentials({
      access_token: user.googleTokens.accessToken,
      refresh_token: user.googleTokens.refreshToken,
      expiry_date: user.googleTokens.expiryDate,
    });

    // Auto-refresh tokens
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        User.findByIdAndUpdate(user._id, { 'googleTokens.refreshToken': tokens.refresh_token }).catch(console.error);
      }
      if (tokens.access_token) {
        User.findByIdAndUpdate(user._id, {
          'googleTokens.accessToken': tokens.access_token,
          'googleTokens.expiryDate': tokens.expiry_date,
        }).catch(console.error);
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json(response.data.items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to fetch Google events' });
  }
});

// 4️⃣ Create a new Google Calendar event
router.post('/events', async (req, res) => {
  try {
    const { userId, title, description, start, end } = req.body;
    const user = await User.findById(userId);

    if (!user?.googleTokens?.accessToken || !user.isCalendarConnected) {
      return res.status(400).json({ msg: 'Google Calendar not connected' });
    }

    oauth2Client.setCredentials({
      access_token: user.googleTokens.accessToken,
      refresh_token: user.googleTokens.refreshToken,
      expiry_date: user.googleTokens.expiryDate,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to create Google event' });
  }
});

module.exports = router;