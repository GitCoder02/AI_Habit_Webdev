const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 1. Generate Auth URL
router.get('/auth-url', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent', // Important to get a refresh token every time
    state: userId,   // Pass the userId to identify the user in the callback
  });
  res.json({ url });
});

// 2. Handle OAuth Callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!userId) {
      return res.status(400).send('User ID not found in state.');
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    await User.findByIdAndUpdate(userId, {
      googleTokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      },
      isCalendarConnected: true,
    });

    res.send('<p>Google Calendar connected successfully! You can close this tab now.</p><script>window.close();</script>');
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.status(500).send('Authentication failed.');
  }
});

// 3. Fetch Google Calendar Events
router.get('/events', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user?.isCalendarConnected || !user.googleTokens?.refreshToken) {
      return res.status(401).json({ error: 'User not connected to Google Calendar' });
    }

    oauth2Client.setCredentials({
      access_token: user.googleTokens.accessToken,
      refresh_token: user.googleTokens.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // ** THE FIX **
    // Check for a refreshed token after the API call and save it.
    const newAccessToken = oauth2Client.credentials.access_token;
    if (newAccessToken !== user.googleTokens.accessToken) {
        await User.findByIdAndUpdate(userId, { 
            'googleTokens.accessToken': newAccessToken,
            'googleTokens.expiryDate': oauth2Client.credentials.expiry_date
        });
    }

    res.json(response.data.items);
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 4. Create a new Google Calendar event
router.post('/events', async (req, res) => {
  try {
    const { userId, title, description, start, end } = req.body;
    const user = await User.findById(userId);

    if (!user?.isCalendarConnected || !user.googleTokens?.refreshToken) {
      return res.status(400).json({ msg: 'Google Calendar not connected' });
    }

    oauth2Client.setCredentials({
      access_token: user.googleTokens.accessToken,
      refresh_token: user.googleTokens.refreshToken,
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

    // Also check for a refreshed token after this API call
    const newAccessToken = oauth2Client.credentials.access_token;
    if (newAccessToken !== user.googleTokens.accessToken) {
        await User.findByIdAndUpdate(userId, { 
            'googleTokens.accessToken': newAccessToken,
            'googleTokens.expiryDate': oauth2Client.credentials.expiry_date
        });
    }

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to create Google event' });
  }
});

module.exports = router;