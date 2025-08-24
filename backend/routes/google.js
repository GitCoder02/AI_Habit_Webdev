// backend/routes/google.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { google } = require("googleapis");
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");

const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // e.g. https://yourserver.com/api/google/oauth2callback
const CLIENT_APP_URL = process.env.CLIENT_URL || "http://localhost:3000"; // redirect after auth

if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI) {
  console.warn("Google OAuth env vars not configured (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI).");
}

const oauth2Client = new google.auth.OAuth2(
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI
);

// Server-side short-lived state store (in-memory). For multiple servers or long-term use, replace with Redis.
const stateMap = new Map(); // state -> { userId, expiresAt }

/**
 * Generate a short-lived server-side state token mapped to the authenticated user.
 * token TTL = 10 minutes.
 */
function createStateForUser(userId) {
  const state = crypto.randomBytes(18).toString("hex");
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  stateMap.set(state, { userId, expiresAt });

  // Schedule cleanup
  setTimeout(() => {
    stateMap.delete(state);
  }, 10 * 60 * 1000 + 5000);

  return state;
}

/**
 * Validate state and return mapped userId (or null)
 */
function consumeState(state) {
  const entry = stateMap.get(state);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    stateMap.delete(state);
    return null;
  }
  // consume (delete) immediately so it cannot be reused
  stateMap.delete(state);
  return entry.userId;
}

/**
 * GET /api/google/auth-url
 * Returns an auth URL for the currently authenticated user to open in the browser.
 * Must be called while logged in (auth middleware).
 */
router.get("/auth-url", auth, (req, res) => {
  try {
    const userId = req.user.id;
    const state = createStateForUser(userId);

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      state,
    });

    res.json({ url });
  } catch (err) {
    console.error("Failed to generate Google auth url:", err);
    res.status(500).json({ error: "Could not generate Google auth URL" });
  }
});

/**
 * GET /api/google/callback
 * This is the callback Google will hit after user consents.
 * It expects `code` and `state` in the query params.
 *
 * We validate the server-side state mapping to find the correct user.
 */
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  // Validate & consume the server-side state -> userId
  const userId = consumeState(state);
  if (!userId) {
    return res.status(400).send("Invalid or expired state");
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    // tokens include access_token, refresh_token (if first time), expiry_date, scope, token_type

    // Save tokens on the user document
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Store tokens and mark calendar connected
    user.google = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || user.google?.refreshToken,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
    };
    user.isCalendarConnected = true;
    user.googleConnectedAt = new Date(); // <-- Add this line

    await user.save();

    // Redirect back to client app (you can append a query param to indicate success)
    return res.redirect(`${CLIENT_APP_URL}/?google_connected=1`);
  } catch (err) {
    console.error("OAuth2 callback error:", err);
    return res.status(500).send("Failed to complete Google OAuth");
  }
});

/**
 * Helper: Build an OAuth2 client with stored tokens for given user.
 * Returns oauth2Client instance or throws error.
 */
async function getClientForUser(userId) {
  const user = await User.findById(userId);
  // Check if connection expired (2 days = 172800000 ms)
  if (
    !user ||
    !user.google ||
    (!user.google.accessToken && !user.google.refreshToken) ||
    !user.googleConnectedAt ||
    (Date.now() - new Date(user.googleConnectedAt).getTime() > 2 * 24 * 60 * 60 * 1000)
  ) {
    // Auto-log out: clear tokens and mark as disconnected
    if (user) {
      user.google = undefined;
      user.isCalendarConnected = false;
      user.googleConnectedAt = undefined;
      await user.save();
    }
    throw new Error("Google connection expired");
  }

  const client = new google.auth.OAuth2(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URI
  );

  // attach tokens (include refresh token if present)
  const creds = {};
  if (user.google.accessToken) creds.access_token = user.google.accessToken;
  if (user.google.refreshToken) creds.refresh_token = user.google.refreshToken;
  if (user.google.expiryDate) creds.expiry_date = user.google.expiryDate;
  client.setCredentials(creds);

  return { client, user };
}

/**
 * GET /api/google/events
 * Protected route - returns Google Calendar events for the logged-in user.
 * Query params (optional): timeMin, timeMax, maxResults
 */
router.get("/events", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { client } = await getClientForUser(userId);
    const calendar = google.calendar({ version: "v3", auth: client });

    // allow optional time range from query
    const timeMin = req.query.timeMin || new Date(0).toISOString();
    const timeMax = req.query.timeMax || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    const maxResults = parseInt(req.query.maxResults || "250");

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = response.data.items || [];
    res.json(items);
  } catch (err) {
    console.error("Failed to fetch Google events:", err.message || err);
    res.status(500).json({ error: "Failed to fetch Google events" });
  }
});

/**
 * POST /api/google/events
 * Protected route - create an event in the authenticated user's Google Calendar.
 * Body: { summary, description, start: { dateTime }, end: { dateTime }, ... }
 */
router.post("/events", auth, async (req, res) => {
  const userId = req.user.id;
  const { summary, description, start, end, attendees } = req.body;

  try {
    const { client } = await getClientForUser(userId);
    const calendar = google.calendar({ version: "v3", auth: client });

    const eventBody = {
      summary: summary || "Untitled",
      description: description || "",
      start,
      end,
    };
    if (attendees) eventBody.attendees = attendees;

    const created = await calendar.events.insert({
      calendarId: "primary",
      resource: eventBody,
    });

    res.json(created.data);
  } catch (err) {
    console.error("Failed to create Google event:", err);
    res.status(500).json({ error: "Failed to create Google event" });
  }
});

router.get("/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const connected =
      user.isCalendarConnected &&
      user.googleConnectedAt &&
      Date.now() - new Date(user.googleConnectedAt).getTime() <= 2 * 24 * 60 * 60 * 1000;
    res.json({ connected });
  } catch (err) {
    res.status(500).json({ connected: false });
  }
});

module.exports = router;
