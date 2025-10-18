// backend/services/chatCoachService.js
const { generateText } = require("./geminiClient");
const { compileUserContext } = require("./aiCoachService");
const ChatMessage = require("../models/ChatMessage");

/**
 * Generate AI chat response with full context
 */
async function generateChatResponse(userId, userMessage, conversationId) {
  try {
    console.log(`[chatCoachService] Generating response for user: ${userId}`);

    // 1. Save user message
    await ChatMessage.create({
      user: userId,
      role: 'user',
      content: userMessage,
      conversationId,
    });

    // 2. Get conversation history (last 10 messages)
    const history = await ChatMessage.find({
      user: userId,
      conversationId,
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    history.reverse(); // Oldest first

    // 3. Compile user context (habits, goals, events)
    let userContext;
    try {
      userContext = await compileUserContext(userId);
    } catch (error) {
      console.error('[chatCoachService] Error compiling context:', error);
      // Use empty context if compilation fails
      userContext = {
        habits: [],
        goals: [],
        upcomingEvents: [],
        analytics: {
          totalHabits: 0,
          activeHabits: 0,
          totalGoals: 0,
          avgGoalProgress: 0,
          upcomingEventsCount: 0,
          currentDayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          timeOfDay: getTimeOfDay(),
        },
      };
    }

    // 4. Build contextual prompt
    const prompt = buildChatPrompt(history, userContext, userMessage);

    // 5. Call Gemini
    let aiMessage;
    try {
      const response = await generateText(prompt, {
        temperature: 0.8,
        maxOutputTokens: 1024,
      });
      aiMessage = response.text || "I'm here to help! Could you rephrase that?";
    } catch (error) {
      console.error('[chatCoachService] Gemini error:', error);
      aiMessage = "I'm having trouble connecting right now. Could you try again in a moment?";
    }

    // 6. Save AI response
    await ChatMessage.create({
      user: userId,
      role: 'assistant',
      content: aiMessage,
      conversationId,
    });

    console.log('[chatCoachService] Response generated successfully');

    return {
      message: aiMessage,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[generateChatResponse] Error:', error);
    throw error;
  }
}

/**
 * Build chat prompt with conversation history and user context
 */
function buildChatPrompt(history, userContext, currentMessage) {
  const { habits, goals, analytics } = userContext;

  // Format conversation history
  const conversationHistory = history
    .slice(-5) // Last 5 messages for context
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  // Format user data summary
  const habitsSummary = habits.length > 0
    ? habits.slice(0, 5).map((h) => `- ${h.name} (Streak: ${h.streak || 0})`).join('\n')
    : 'No habits tracked yet.';

  const goalsSummary = goals.length > 0
    ? goals.slice(0, 5).map((g) => `- ${g.title} (${g.progress || 0}% complete)`).join('\n')
    : 'No goals set yet.';

  const prompt = `You are a supportive, motivating personal development coach chatting with a user.

**USER DATA:**
Active Habits (${analytics.activeHabits}/${analytics.totalHabits}):
${habitsSummary}

Goals (${analytics.totalGoals} total, ${analytics.avgGoalProgress.toFixed(0)}% avg progress):
${goalsSummary}

**CONVERSATION HISTORY:**
${conversationHistory}

**CURRENT MESSAGE:**
User: ${currentMessage}

**INSTRUCTIONS:**
- Be warm, supportive, and conversational
- Reference their specific habits/goals when relevant
- Keep responses under 150 words
- Ask follow-up questions to engage them
- Use markdown formatting:
  * Use **bold** for emphasis
  * Use bullet points (- ) for lists
  * Use numbered lists (1. 2. 3.) for steps
- Use emojis sparingly (1-2 max)
- If they ask for advice, be specific and actionable

Respond as the Assistant (use markdown):`;

  return prompt;
}

/**
 * Get chat history for a user
 */
async function getChatHistory(userId, conversationId, limit = 50) {
  try {
    const messages = await ChatMessage.find({
      user: userId,
      conversationId,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return messages.reverse();
  } catch (error) {
    console.error('[getChatHistory] Error:', error);
    return [];
  }
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

module.exports = {
  generateChatResponse,
  getChatHistory,
};