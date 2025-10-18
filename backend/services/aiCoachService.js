// backend/services/aiCoachService.js
// Phase 1: Enhanced Intelligent Advisor with Advanced Prompt Engineering

const { generateText } = require("./geminiClient");
const { retryWithBackoff } = require("../utils/retry");
const cache = require("../utils/cache");

// Models - graceful loading
let Habit, Event, Goal, User;
try { Habit = require("../models/Habit"); } catch (e) { console.warn("Habit model not found"); }
try { Event = require("../models/Event"); } catch (e) { console.warn("Event model not found"); }
try { Goal = require("../models/Goal"); } catch (e) { console.warn("Goal model not found"); }
try { User = require("../models/User"); } catch (e) { console.warn("User model not found"); }

// ============================================================================
// CONTEXT COMPILATION - Multi-dimensional user analysis
// ============================================================================

/**
 * Compiles comprehensive user context for intelligent suggestions
 * @param {String} userId - MongoDB user ID
 * @returns {Object} Rich context object with habits, goals, events, analytics
 */
async function compileUserContext(userId) {
  const context = {
    userId,
    timestamp: new Date().toISOString(),
    habits: [],
    goals: [],
    upcomingEvents: [],
    analytics: {},
  };

  try {
    // Fetch all user data in parallel
    const [habits, goals, events] = await Promise.all([
      Habit ? Habit.find({ user: userId }).lean() : Promise.resolve([]),
      Goal ? Goal.find({ userId: userId }).lean() : Promise.resolve([]),
      Event
        ? Event.find({
            user: userId,
            start: { $gte: new Date() },
          })
            .sort({ start: 1 })
            .limit(20)
            .lean()
        : Promise.resolve([]),
    ]);

    context.habits = habits || [];
    context.goals = goals || [];
    context.upcomingEvents = events || [];

    // Calculate analytics
    context.analytics = calculateUserAnalytics(habits, goals, events);

    return context;
  } catch (error) {
    console.error("[compileUserContext] Error:", error.message);
    return context;
  }
}

/**
 * Calculate deep analytics from user data
 */
function calculateUserAnalytics(habits = [], goals = [], events = []) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    // Habit analytics
    totalHabits: habits.length,
    activeHabits: habits.filter((h) => (h.streak || 0) > 0).length,
    avgStreak:
      habits.length > 0
        ? habits.reduce((sum, h) => sum + (h.streak || 0), 0) / habits.length
        : 0,
    habitsWithLongStreaks: habits.filter((h) => (h.streak || 0) >= 7).length,
    habitsNeedingAttention: habits.filter((h) => {
      const lastComp = h.lastCompleted ? new Date(h.lastCompleted) : null;
      return !lastComp || lastComp < sevenDaysAgo;
    }).length,
    bestStreak:
      habits.length > 0 ? Math.max(...habits.map((h) => h.bestStreak || 0)) : 0,

    // Goal analytics
    totalGoals: goals.length,
    activeGoals: goals.filter((g) => g.status === "Active").length,
    completedGoals: goals.filter((g) => g.isCompleted === true).length,
    goalsByCategory: goals.reduce((acc, g) => {
      const cat = g.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {}),
    goalsNearDeadline: goals.filter((g) => {
      if (!g.targetDate) return false;
      const daysUntil = Math.ceil(
        (new Date(g.targetDate) - now) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 7;
    }).length,
    avgGoalProgress:
      goals.length > 0
        ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
        : 0,

    // Calendar analytics
    upcomingEventsCount: events.length,
    busyDaysAhead: countBusyDays(events),
    freeTimeSlots: identifyFreeTimeSlots(events),

    // Time patterns
    currentDayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
    currentHour: now.getHours(),
    timeOfDay: getTimeOfDay(now.getHours()),
  };
}

function countBusyDays(events) {
  const daySet = new Set();
  events.forEach((e) => {
    const day = new Date(e.start).toDateString();
    daySet.add(day);
  });
  return daySet.size;
}

function identifyFreeTimeSlots(events) {
  const today = new Date();
  const freeDays = [];

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dateStr = checkDate.toDateString();

    const hasEvents = events.some(
      (e) => new Date(e.start).toDateString() === dateStr
    );

    if (!hasEvents) {
      freeDays.push(
        checkDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      );
    }
  }

  return freeDays.slice(0, 3); // Return up to 3 free days
}

function getTimeOfDay(hour) {
  if (hour < 6) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

// ============================================================================
// ADVANCED PROMPT ENGINEERING
// ============================================================================

/**
 * Builds sophisticated prompt for Gemini with full user context
 */
// In backend/services/aiCoachService.js
// Replace the end of buildIntelligentPrompt with this:

function buildIntelligentPrompt(context) {
  const { habits, goals, upcomingEvents, analytics } = context;

  // Build concise habit summary (limit to top 5)
  const habitSummary =
    habits.length > 0
      ? habits
          .slice(0, 5)
          .map((h, idx) => {
            const lastComp = h.lastCompleted
              ? new Date(h.lastCompleted).toLocaleDateString()
              : "Never";
            return `${idx + 1}. ${h.name} (Streak: ${h.streak || 0}, Last: ${lastComp})`;
          })
          .join("\n")
      : "No habits tracked.";

  const goalSummary =
    goals.length > 0
      ? goals
          .slice(0, 5)
          .map((g, idx) => {
            const daysLeft = g.targetDate
              ? Math.ceil(
                  (new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
                )
              : null;
            return `${idx + 1}. ${g.title} (${g.progress || 0}%, ${
              daysLeft !== null ? `${daysLeft}d left` : "no deadline"
            })`;
          })
          .join("\n")
      : "No goals set.";

  const eventSummary =
    upcomingEvents.length > 0
      ? upcomingEvents
          .slice(0, 5)
          .map((e, idx) => `${idx + 1}. ${e.title}`)
          .join("\n")
      : "No upcoming events.";

  const prompt = `You are a personal development coach. Analyze this data and provide 3-5 actionable suggestions.

**USER DATA:**
- Time: ${analytics.currentDayOfWeek}, ${analytics.timeOfDay}
- Habits: ${analytics.totalHabits} total, ${analytics.activeHabits} active
${habitSummary}
- Goals: ${analytics.totalGoals} total, ${analytics.avgGoalProgress.toFixed(0)}% avg progress
${goalSummary}
- Events: ${analytics.upcomingEventsCount} upcoming

**CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, just the JSON array.**

Format (exactly):
[
  {
    "type": "habit",
    "priority": "high",
    "title": "Short title here",
    "description": "One sentence description",
    "rationale": "Why this matters in one sentence",
    "actionableSteps": ["Step 1", "Step 2", "Step 3"],
    "estimatedImpact": "Expected outcome in one sentence"
  }
]

Rules:
- type: must be "habit", "goal", "schedule", or "motivation"
- priority: must be "high", "medium", or "low"
- Keep all text concise
- Ensure valid JSON syntax
- Focus on most urgent items`;

  return prompt;
}

// ============================================================================
// SUGGESTION GENERATION WITH GEMINI
// ============================================================================

/**
 * Generates intelligent suggestions using Gemini with advanced prompts
 * @param {String} userId - MongoDB user ID
 * @param {Object} options - Optional parameters
 * @returns {Object} { suggestions: [], metadata: {} }
 */
// In backend/services/aiCoachService.js
// Replace the generateIntelligentSuggestions function with this improved version:

async function generateIntelligentSuggestions(userId, options = {}) {
  const cacheKey = `ai-coach-v2:${userId}`;

  // Check cache first
  if (!options.skipCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("[generateIntelligentSuggestions] Cache hit for user:", userId);
      return cached;
    }
  }

  try {
    // Step 1: Compile comprehensive user context
    console.log("[generateIntelligentSuggestions] Compiling user context for:", userId);
    const context = await compileUserContext(userId);

    // Step 2: Build advanced prompt
    const prompt = buildIntelligentPrompt(context);

    // Step 3: Call Gemini with retry logic
    console.log("[generateIntelligentSuggestions] Calling Gemini API...");
    const response = await retryWithBackoff(
      async () =>
        await generateText(prompt, {
          temperature: 0.7,
          maxOutputTokens: 3000, // Increased from 2048 to avoid truncation
        }),
      { retries: 2, baseMs: 1000 }
    );

    // Step 4: Parse JSON response with improved error handling
    let suggestions = [];
    try {
      const cleanedText = extractJSON(response.text);
      
      // Log the cleaned response for debugging
      console.log(`[generateIntelligentSuggestions] Cleaned response (first 500 chars): ${cleanedText.substring(0, 500)}`);
      
      // Try to parse
      suggestions = JSON.parse(cleanedText);

      if (!Array.isArray(suggestions)) {
        console.warn("[generateIntelligentSuggestions] Response is not an array, wrapping in array");
        suggestions = [suggestions];
      }

      // Validate each suggestion has required fields
      suggestions = suggestions.filter(s => {
        const isValid = s.type && s.priority && s.title && s.description;
        if (!isValid) {
          console.warn("[generateIntelligentSuggestions] Invalid suggestion filtered:", s);
        }
        return isValid;
      });

      console.log(`[generateIntelligentSuggestions] Successfully parsed ${suggestions.length} valid suggestions`);
      
    } catch (parseError) {
      console.error("[generateIntelligentSuggestions] JSON parse error:", parseError.message);
      console.error("[generateIntelligentSuggestions] Raw response:", response.text.substring(0, 1000));
      
      // Try to fix common JSON issues
      try {
        const fixedText = attemptJSONFix(response.text);
        suggestions = JSON.parse(fixedText);
        if (!Array.isArray(suggestions)) suggestions = [suggestions];
        console.log("[generateIntelligentSuggestions] Successfully recovered with JSON fix");
      } catch (fixError) {
        console.error("[generateIntelligentSuggestions] JSON fix failed, using fallback");
        suggestions = createFallbackSuggestions(context);
      }
    }

    // If no valid suggestions after parsing, use fallback
    if (suggestions.length === 0) {
      console.warn("[generateIntelligentSuggestions] No valid suggestions, using fallback");
      suggestions = createFallbackSuggestions(context);
    }

    // Step 5: Enrich suggestions with metadata
    suggestions = suggestions.map((s, idx) => ({
      ...s,
      id: `suggestion-${Date.now()}-${idx}`,
      generatedAt: new Date().toISOString(),
      source: "gemini-advanced",
    }));

    const result = {
      suggestions,
      metadata: {
        userId,
        timestamp: new Date().toISOString(),
        contextSize: {
          habits: context.habits.length,
          goals: context.goals.length,
          events: context.upcomingEvents.length,
        },
        analytics: context.analytics,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      },
    };

    // Cache for 30 minutes
    cache.set(cacheKey, result, { ttl: 1000 * 60 * 30 });

    return result;
  } catch (error) {
    console.error("[generateIntelligentSuggestions] Error:", error.message);

    // Fallback to basic suggestions
    const context = await compileUserContext(userId);
    const fallbackSuggestions = createFallbackSuggestions(context);

    return {
      suggestions: fallbackSuggestions,
      metadata: {
        userId,
        timestamp: new Date().toISOString(),
        error: error.message,
        source: "fallback",
      },
    };
  }
}

/**
 * Attempt to fix common JSON formatting issues
 */
function attemptJSONFix(text) {
  let cleaned = extractJSON(text);
  
  // Remove trailing commas before ] or }
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Try to complete truncated JSON
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  
  // Add missing closing brackets/braces
  for (let i = 0; i < (openBrackets - closeBrackets); i++) {
    cleaned += ']';
  }
  for (let i = 0; i < (openBraces - closeBraces); i++) {
    cleaned += '}';
  }
  
  return cleaned;
}

/**
 * Extract JSON from text that might have markdown code blocks
 */
function extractJSON(text) {
  if (!text) return "[]";
  
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```/g, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```/g, "");
  }
  
  return cleaned.trim();
}

/**
 * Create fallback suggestions if Gemini fails
 */
function createFallbackSuggestions(context) {
  const suggestions = [];
  const { habits, goals, analytics } = context;

  // Suggestion 1: Focus on habits needing attention
  if (analytics.habitsNeedingAttention > 0) {
    const needAttention = habits.filter((h) => {
      const lastComp = h.lastCompleted ? new Date(h.lastCompleted) : null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return !lastComp || lastComp < sevenDaysAgo;
    });

    if (needAttention.length > 0) {
      const habit = needAttention;
      suggestions.push({
        type: "habit",
        priority: "high",
        title: `Revive Your ${habit.name} Habit`,
        description: `Your "${habit.name}" habit hasn't been completed recently. Small, consistent actions lead to big results. Start today!`,
        rationale: `This habit has been inactive, and getting back on track now will help rebuild momentum.`,
        actionableSteps: [
          `Complete "${habit.name}" today`,
          "Set a reminder for tomorrow",
          "Track your progress for 3 consecutive days",
        ],
        estimatedImpact:
          "Rebuilding this habit can restore your momentum and boost confidence.",
      });
    }
  }

  // Suggestion 2: Goal with approaching deadline
  const urgentGoals = goals.filter((g) => {
    if (!g.targetDate) return false;
    const daysLeft = Math.ceil(
      (new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft >= 0 && daysLeft <= 7 && (g.progress || 0) < 80;
  });

  if (urgentGoals.length > 0) {
    const goal = urgentGoals;
    const daysLeft = Math.ceil(
      (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    suggestions.push({
      type: "goal",
      priority: "high",
      title: `Focus on "${goal.title}" - Deadline in ${daysLeft} Days`,
      description: `Your goal "${goal.title}" is ${
        goal.progress || 0
      }% complete with the deadline approaching. Time to prioritize this!`,
      rationale:
        "With limited time remaining, focused effort now will maximize your chances of success.",
      actionableSteps: [
        "Identify the next 3 critical tasks",
        "Block 2 hours in your calendar this week",
        "Review and adjust your approach if needed",
      ],
      estimatedImpact: `Completing this goal will boost your progress and confidence.`,
    });
  }

  // Suggestion 3: Celebrate wins
  if (analytics.habitsWithLongStreaks > 0) {
    suggestions.push({
      type: "motivation",
      priority: "medium",
      title: "Celebrate Your Consistency!",
      description: `You have ${analytics.habitsWithLongStreaks} habit(s) with streaks of 7+ days. That's incredible dedication!`,
      rationale:
        "Acknowledging progress reinforces positive behavior and builds long-term motivation.",
      actionableSteps: [
        "Take a moment to appreciate your effort",
        "Share your progress with a friend",
        "Set a new stretch goal for your best habit",
      ],
      estimatedImpact:
        "Celebrating wins increases motivation and reinforces positive habits.",
    });
  }

  // Default suggestion if nothing else applies
  if (suggestions.length === 0) {
    suggestions.push({
      type: "habit",
      priority: "medium",
      title: "Start Fresh Today",
      description:
        "Every day is a new opportunity to build positive habits and make progress on your goals.",
      rationale: "Consistency is key to long-term success.",
      actionableSteps: [
        "Choose one habit to focus on today",
        "Complete it before noon",
        "Reflect on how it made you feel",
      ],
      estimatedImpact: "Building consistency creates momentum for all your goals.",
    });
  }

  return suggestions.map((s, idx) => ({
    ...s,
    id: `fallback-${Date.now()}-${idx}`,
    generatedAt: new Date().toISOString(),
    source: "fallback-rules",
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateIntelligentSuggestions,
  compileUserContext,
};