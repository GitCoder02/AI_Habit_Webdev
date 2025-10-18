// backend/routes/ai.js
const express = require("express");
const path = require("path");
const router = express.Router();

// Auth middleware
let requireAuth;
try {
  requireAuth = require(path.join(__dirname, "..", "middleware", "authMiddleware"));
  if (requireAuth && requireAuth.default && typeof requireAuth.default === "function") {
    requireAuth = requireAuth.default;
  }
} catch (e) {
  console.warn("[routes/ai] auth middleware not found, falling back to no-auth for dev:", e.message);
  requireAuth = (req, res, next) => next();
}

// Models (may throw if not present; we handle gracefully later)
let Habit, Goal, Event;
try { Habit = require("../models/Habit"); } catch (e) { Habit = null; }
try { Goal = require("../models/Goal"); } catch (e) { Goal = null; }
try { Event = require("../models/Event"); } catch (e) { Event = null; }

const geminiClient = require("../services/geminiClient");
const { LRUCache } = require("lru-cache");

// NEW: Import Phase 1 AI Coach Service
const aiCoachService = require("../services/aiCoachService");

// Feature flag and cache
const USE_GEMINI = process.env.USE_GEMINI === "true";
const geminiCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 60, // 1h cache
});

/**
 * Helpers
 */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const wasYesterday = (d) => {
  if (!d) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d, yesterday);
};

const daysUntil = (d) => {
  if (!d) return Infinity;
  const now = startOfDay(new Date());
  const target = startOfDay(new Date(d));
  const ms = target - now;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

/**
 * Use Gemini to generate explanation + score.
 * Returns { explanation, score }
 */
async function generateSuggestionWithLLM(shortContext, suggestionTitle) {
  if (!USE_GEMINI) {
    return {
      explanation: "Quick tip: stay consistent and start small.",
      score: 0.6,
    };
  }

  try {
    const rawKey = `${suggestionTitle} | ${shortContext}`.slice(0, 800);
    const cacheKey = `gemini:${rawKey}`;
    if (geminiCache.has(cacheKey)) return geminiCache.get(cacheKey);

    const prompt = `
You are a supportive productivity coach.
Context: ${shortContext}
Task: Write a concise, positive explanation (1-2 sentences) for the suggestion "${suggestionTitle}".
Also include a priority score between 0.5 (low) and 1.0 (high), e.g. {"explanation":"...", "score":0.72}.
Return either a short JSON object or plain text (we will parse both).
`;

    const resp = await geminiClient.generateText(prompt, {
      temperature: 0.5,
      maxOutputTokens: 150,
      response_mime_type: "application/json",
    });

    let textOut = "";
    if (resp && typeof resp === "object" && typeof resp.text === "string") {
      textOut = resp.text;
    } else if (typeof resp === "string") {
      textOut = resp;
    } else if (resp && resp.raw && typeof resp.raw === "object") {
      try {
        const cand = resp.raw.candidates?.[0]?.content?.parts?.[0]?.text;
        if (cand) textOut = cand;
      } catch (e) {
        textOut = "";
      }
    }

    let out;
    try {
      out = JSON.parse(textOut);
    } catch {
      const lines = textOut.split("\n").map((l) => l.trim()).filter(Boolean);
      out = { explanation: lines.slice(0, 2).join(" "), score: 0.65 };
    }

    const result = {
      explanation: out.explanation || (textOut ? textOut.trim() : "Quick tip: keep going!"),
      score: typeof out.score === "number" ? out.score : 0.65,
    };

    geminiCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("Gemini LLM call failed:", err?.message || err);
    return {
      explanation: "Quick tip: keep going, you're doing well!",
      score: 0.6,
    };
  }
}

/**
 * GET /api/ai/suggestions
 * Your existing endpoint - unchanged
 */
router.get("/suggestions", requireAuth, async (req, res) => {
  try {
    const userId = (req.user && (req.user.id || req.user._id)) || req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "userId required (auth or ?userId=... for dev)" });
    }

    // fetch data
    const [habits, goals, events] = await Promise.all([
      Habit ? Habit.find({ user: userId }).lean() : Promise.resolve([]),
      Goal ? Goal.find({ userId: userId }).lean() : Promise.resolve([]),
      Event ? Event.find({ user: userId }).lean() : Promise.resolve([]),
    ]);

    const suggestions = [];
    const today = new Date();

    // 1) Habit suggestions
    for (const h of habits) {
      const last = h.lastCompleted ? new Date(h.lastCompleted) : null;
      if (!last) {
        const title = `Start small: make '${h.name}' easier to start`;
        const { explanation, score } = await generateSuggestionWithLLM(
          `habit: ${h.name}, streak:${h.streak || 0}, best:${h.bestStreak || 0}`,
          title
        );
        suggestions.push({
          id: `habit-never-${h._id}`,
          type: "habit",
          habitId: h._id,
          score,
          title,
          explanation,
          actions: [
            {
              action: "reduce_frequency",
              payload: { habitId: h._id, to: "3/week" },
            },
            {
              action: "reschedule",
              payload: { habitId: h._id, suggestedTime: "18:00" },
            },
          ],
          tags: ["start-small", "motivation"],
        });
      } else if (!isSameDay(last, today) && !wasYesterday(last)) {
        const title = `Streak broken for '${h.name}' — try a smaller step`;
        const { explanation, score } = await generateSuggestionWithLLM(
          `habit: ${h.name}, streak:${h.streak || 0}, lastCompleted:${h.lastCompleted}`,
          title
        );
        suggestions.push({
          id: `habit-broken-${h._id}`,
          type: "habit",
          habitId: h._id,
          score,
          title,
          explanation,
          actions: [
            {
              action: "reduce_frequency",
              payload: { habitId: h._id, to: "3/week" },
            },
            {
              action: "reschedule",
              payload: { habitId: h._id, suggestedTime: "19:00" },
            },
          ],
          tags: ["streak", "reschedule"],
        });
      }
    }

    // 2) Goal suggestions
    for (const g of goals) {
      const dUntil = daysUntil(g.targetDate || g.dueDate || g.target);
      const progress = typeof g.progress === "number" ? g.progress : (g.progressPercent ? g.progressPercent : 0);
      if (dUntil <= 7 && (progress === undefined || progress < 50)) {
        const title = `Urgent: focus on '${g.title || g.name}' (deadline approaching)`;
        const { explanation, score } = await generateSuggestionWithLLM(
          `goal: ${g.title || g.name}, progress:${progress || 0}, targetDate:${g.targetDate || g.dueDate || ""}`,
          title
        );
        suggestions.push({
          id: `goal-urgent-${g._id}`,
          type: "goal",
          goalId: g._id,
          score,
          title,
          explanation,
          actions: [
            {
              action: "create_microtask",
              payload: {
                goalId: g._id,
                text: "Do the first subtask for this goal",
              },
            },
            { action: "prioritize_goal", payload: { goalId: g._id } },
          ],
          tags: ["goal", "deadline"],
        });
      }
    }

    // 3) Focus window suggestions
    const now = new Date();
    const lookDays = 7;
    const busyByDayHour = {};

    for (let i = 0; i < lookDays; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const key = d.toISOString().substring(0, 10);
      busyByDayHour[key] = Array(24).fill(0);
    }

    for (const ev of events) {
      try {
        const s = new Date(ev.start);
        const e = new Date(ev.end);
        let cur = new Date(s);
        while (cur < e) {
          const key = cur.toISOString().substring(0, 10);
          const hr = cur.getHours();
          if (busyByDayHour[key] && Number.isInteger(hr) && hr >= 0 && hr < 24)
            busyByDayHour[key][hr] = busyByDayHour[key][hr] + 1;
          cur.setHours(cur.getHours() + 1);
        }
      } catch (e) {
        console.warn("Invalid event date skipped:", ev);
      }
    }

    const peakHours = [];
    for (let i = 0; i < lookDays; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const key = d.toISOString().substring(0, 10);
      const counts = busyByDayHour[key];
      if (!counts) continue;

      const candidateBlocks = [];
      for (let h = 8; h <= 18; h++) {
        const next = (h + 1) < 24 ? counts[h + 1] : 0;
        const score = (counts[h] || 0) + next;
        candidateBlocks.push({ hour: h, score });
      }

      candidateBlocks.sort((a, b) => a.score - b.score);
      const best = candidateBlocks;
      if (best) {
        peakHours.push({
          day: key,
          startHour: best.hour,
          endHour: best.hour + 2,
          score: best.score,
        });
      }
    }

    if (peakHours.length > 0) {
      const nextDay = peakHours;
      const title = `Focus window suggestion: ${nextDay.startHour}:00 - ${nextDay.endHour}:00 on ${nextDay.day}`;
      const { explanation, score } = await generateSuggestionWithLLM(
        `Available focus block: ${nextDay.startHour}:00-${nextDay.endHour}:00 on ${nextDay.day}`,
        title
      );
      suggestions.push({
        id: `focus-window-${nextDay.day}-${nextDay.startHour}`,
        type: "focus",
        score,
        title,
        explanation,
        actions: [
          {
            action: "suggest_block",
            payload: {
              date: nextDay.day,
              startHour: nextDay.startHour,
              endHour: nextDay.endHour,
            },
          },
        ],
        tags: ["focus", "calendar"],
      });
    }

    res.json({
      suggestions,
      meta: {
        generatedAt: new Date().toISOString(),
        count: suggestions.length,
      },
    });
  } catch (err) {
    console.error("AI suggestions error:", err);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

/**
 * POST /api/ai/execute
 * Your existing endpoint - unchanged
 */
router.post("/execute", requireAuth, async (req, res) => {
  try {
    const userId = (req.user && (req.user.id || req.user._id)) || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const { action } = req.body;
    if (!action || !action.action) return res.status(400).json({ error: "action required" });

    if (action.action === "reschedule") {
      const { habitId, suggestedTime } = action.payload || {};
      if (!habitId) return res.status(400).json({ error: "habitId required for reschedule" });
      if (!Habit) return res.status(500).json({ error: "Habit model not available on server" });

      const update = {};
      if (suggestedTime) update.preferredTime = suggestedTime;

      const habit = await Habit.findOneAndUpdate(
        { _id: habitId, user: userId },
        { $set: update },
        { new: true }
      ).lean();
      if (!habit) return res.status(404).json({ error: "Habit not found or not owned by user" });

      return res.json({ ok: true, details: { habit } });
    }

    if (action.action === "reduce_frequency") {
      const { habitId, to } = action.payload || {};
      if (!habitId) return res.status(400).json({ error: "habitId required for reduce_frequency" });
      if (!Habit) return res.status(500).json({ error: "Habit model not available on server" });

      const update = { frequency: to || "3/week" };
      const habit = await Habit.findOneAndUpdate(
        { _id: habitId, user: userId },
        { $set: update },
        { new: true }
      ).lean();
      if (!habit) return res.status(404).json({ error: "Habit not found or not owned by user" });

      return res.json({ ok: true, details: { habit } });
    }

    if (action.action === "create_microtask") {
      const { goalId, text } = action.payload || {};
      if (!goalId) return res.status(400).json({ error: "goalId required for create_microtask" });
      if (!Goal) return res.status(500).json({ error: "Goal model not available on server" });

      const goal = await Goal.findOne({ _id: goalId, userId: userId });
      if (!goal) return res.status(404).json({ error: "Goal not found or not owned by user" });

      goal.microtasks = goal.microtasks || [];
      goal.microtasks.push({
        text: text || "New microtask (from AI)",
        createdAt: new Date(),
        done: false,
      });
      await goal.save();

      return res.json({ ok: true, details: { goalId: goal._id, microtasks: goal.microtasks } });
    }

    if (action.action === "suggest_block") {
      const { date, startHour, endHour } = action.payload || {};
      if (!date || startHour == null || endHour == null)
        return res.status(400).json({ error: "date, startHour, endHour required for suggest_block" });
      if (!Event) return res.status(500).json({ error: "Event model not available on server" });

      const startIso = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`).toISOString();
      const endIso = new Date(`${date}T${String(endHour).padStart(2, "0")}:00:00`).toISOString();

      const ev = await Event.create({
        user: userId,
        title: "Focus Block (AI suggestion)",
        start: startIso,
        end: endIso,
        meta: { autoCreatedBy: "ai-suggestions" },
      });

      return res.json({ ok: true, details: { event: ev } });
    }

    return res.status(400).json({ error: "Unknown action type" });
  } catch (err) {
    console.error("ai execute error:", err);
    return res.status(500).json({ error: "Failed to execute action" });
  }
});

// ============================================================================
// PHASE 1: NEW INTELLIGENT SUGGESTIONS ENDPOINT
// ============================================================================

/**
 * GET /api/ai/intelligent-suggestions
 * Advanced AI-powered suggestions using deep context analysis
 */
router.get("/intelligent-suggestions", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log(`[GET /api/ai/intelligent-suggestions] userId=${userId}`);

    // Generate intelligent suggestions using Phase 1 service
    const result = await aiCoachService.generateIntelligentSuggestions(userId, {
      skipCache: req.query.refresh === "true",
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[GET /api/ai/intelligent-suggestions] Error:", error);
    return res.status(500).json({
      error: "Failed to generate intelligent suggestions",
      message: error.message,
    });
  }
});

module.exports = router;