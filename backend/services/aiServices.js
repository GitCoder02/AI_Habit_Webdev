// backend/services/aiService.js
// Rule-based heuristics and optional Gemini augmentation
const { generateText } = require("./geminiClient");
const { retryWithBackoff } = require("../utils/retry");
const cache = require("../utils/cache");

// Try to require your models if present. If not present, we'll continue with empty arrays.
let Habit, Event, Goal, User;
try { Habit = require("../models/Habit"); } catch {}
try { Event = require("../models/Event"); } catch {}
try { Goal = require("../models/Goal"); } catch {}
try { User = require("../models/User"); } catch {}

const USE_GEMINI = process.env.USE_GEMINI === "true";

function computeHabitMissedSuggestions(habits = []) {
  // heuristics: if missedCount >= 2 in last 7 days -> suggest shrink/reschedule
  const suggestions = [];
  const now = new Date();
  for (const h of habits) {
    const missed = h.missedCount || 0; // expected shape; adjust to your model
    const lastCompleted = h.lastCompleted ? new Date(h.lastCompleted) : null;
    if (missed >= 2) {
      const suggestedTime = h.preferredTime || "18:00";
      const id = `habit-missed-${h._id || h.id || h.name || Math.random().toString(36).slice(2,8)}`;
      const score = Math.min(0.95, 0.5 + (missed - 1) * 0.15);
      suggestions.push({
        id,
        type: "habit",
        score,
        title: "Shrink habit or reschedule",
        explanation: `You missed ${missed} occurrences of '${h.name || "this habit"}'. Consider moving its time or decreasing frequency.`,
        actions: [
          { action: "reschedule", payload: { habitId: h._id || h.id, suggestedTime } },
          { action: "reduce_frequency", payload: { habitId: h._id || h.id, to: "3/week" } }
        ],
        tags: ["reduction", "reschedule"],
        meta: { habit: { id: h._id || h.id, name: h.name } }
      });
    }
  }
  return suggestions;
}

function computeFocusBlockSuggestion(events = [], habits = []) {
  // naive free/busy heatmap algorithm: pick a two-hour block with few events
  // events expected to have { start, end } in ISO
  const dayBuckets = {}; // key: "Mon-09:00"
  // init 7 days, 24 hours half-hour buckets
  // For simplicity, we check next 7 days and pick earliest morning or midday 2-hour with no events
  const now = new Date();
  const avail = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    for (let h = 6; h <= 20; h += 1) { // check hourly start times 6..20
      const start = new Date(day);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start);
      end.setHours(h + 2);
      const busy = events.some(ev => {
        const s = new Date(ev.start), e = new Date(ev.end);
        return (s < end && e > start);
      });
      if (!busy) {
        avail.push({ day: start.toISOString().slice(0,10), start: start.toTimeString().slice(0,5), end: end.toTimeString().slice(0,5) });
      }
    }
  }
  if (avail.length) {
    const pick = avail[0];
    return [{
      id: `focus-${pick.day}-${pick.start}`,
      type: "focus",
      score: 0.85,
      title: "Suggested focus block",
      explanation: `Looks like ${pick.day} ${pick.start}-${pick.end} is relatively free — consider a 2-hour focus block.`,
      actions: [{ action: "create_focus_block", payload: { start: `${pick.day}T${pick.start}`, end: `${pick.day}T${pick.end}` } }],
      tags: ["focus", "calendar"],
      meta: pick
    }];
  }
  return [];
}

function computeGoalUrgencySuggestions(goals = []) {
  const now = new Date();
  const suggestions = [];
  for (const g of goals) {
    if (!g.dueDate) continue;
    const due = new Date(g.dueDate);
    const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    const progress = typeof g.progress === "number" ? g.progress : 0;
    if (daysLeft <= 7 && progress < 0.6) {
      const id = `goal-urgent-${g._id || g.id || Math.random().toString(36).slice(2,8)}`;
      suggestions.push({
        id,
        type: "goal",
        score: Math.min(0.95, 0.6 + (7 - daysLeft) * 0.05),
        title: "Re-prioritize this goal",
        explanation: `Goal "${g.title || g.name}" is due in ${daysLeft} days but progress is ${Math.round(progress*100)}%. Consider creating microtasks to close it.`,
        actions: [{ action: "create_microtasks", payload: { goalId: g._id || g.id } }],
        tags: ["goal", "prioritize"],
        meta: { daysLeft, progress }
      });
    }
  }
  return suggestions;
}

/**
 * Build deterministic suggestions using rules.
 * accepts raw arrays: { habits, events, goals }
 */
async function buildRuleBasedSuggestions({ userId, habits = [], events = [], goals = [] }) {
  const suggestions = [];
  suggestions.push(...computeHabitMissedSuggestions(habits));
  suggestions.push(...computeFocusBlockSuggestion(events, habits));
  suggestions.push(...computeGoalUrgencySuggestions(goals));
  return suggestions;
}

/**
 * Main exported function used by routes.
 * - pulls cached Gemini explanation if available
 * - redacts inputs and uses Gemini only for explanation text
 */
async function getSuggestionsForUser({ userId, habits = [], events = [], goals = [] }) {
  // deterministic suggestions first
  const baseSuggestions = await buildRuleBasedSuggestions({ userId, habits, events, goals });

  // if no suggestions, return empty
  if (!baseSuggestions.length) return { suggestions: [] };

  // For each suggestion, optionally get an LLM-generated explanation (kept short)
  const results = [];
  for (const s of baseSuggestions) {
    const cacheKey = `ai:explain:${userId}:${s.id}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      results.push({ ...s, explanation: cached });
      continue;
    }

    // Build a concise summary to send to Gemini (NO raw PII)
    const context = [];
    context.push(`User summary: habits ${habits.length}, events ${events.length}, goals ${goals.length}.`);
    // describe the suggestion in one line
    const suggestionSummary = `${s.title} - reason: ${s.explanation}`;
    context.push(suggestionSummary);
    const prompt = [
      "You are an assistant that returns a short, clear explanation (1-3 sentences) for a suggestion.",
      "Return only the explanation (no JSON wrapper).",
      "Be empathetic and actionable. Max 120 tokens.",
      "",
      `Context: ${context.join(" ")}`
    ].join("\n");

    let explanation = s.explanation; // fallback
    if (USE_GEMINI) {
      try {
        const call = () => generateText([prompt], { maxOutputTokens: 140, temperature: 0.12 });
        const resp = await retryWithBackoff(call, { retries: 3, baseMs: 400 });
        if (resp && resp.text) {
          explanation = resp.text.split("\n").slice(0,6).join(" ").trim();
          // cache explanation
          cache.set(cacheKey, explanation);
        }
      } catch (err) {
        console.warn("[aiService] Gemini failed, using fallback explanation.", err?.message || err);
      }
    }

    results.push({ ...s, explanation });
  }

  return { suggestions: results };
}

module.exports = { getSuggestionsForUser, buildRuleBasedSuggestions, computeHabitMissedSuggestions };