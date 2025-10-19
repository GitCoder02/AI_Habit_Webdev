// backend/routes/test.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const Event = require('../models/Event');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const { generateIntelligentSuggestions } = require('../services/aiCoachService');
const { generateChatResponse } = require('../services/chatCoachService');
const { analyzeUser } = require('../services/proactiveCoachService');

/**
 * POST /api/test/seed-data
 * Seeds test data for comprehensive AI testing
 */
router.post('/seed-data', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear existing test data
    await Promise.all([
      Habit.deleteMany({ user: userId }),
      Goal.deleteMany({ userId: userId }), // ✅ Use userId for Goal
      Event.deleteMany({ user: userId }),
    ]);

    // Seed habits
    const habits = await Habit.insertMany([
      {
        user: userId,
        name: 'Morning Run',
        frequency: 'daily',
        streak: 7,
        bestStreak: 15,
        lastCompleted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: userId,
        name: 'Meditation',
        frequency: 'daily',
        streak: 0,
        bestStreak: 5,
        lastCompleted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        user: userId,
        name: 'Read 30 mins',
        frequency: 'daily',
        streak: 3,
        bestStreak: 10,
        lastCompleted: new Date(Date.now() - 23 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    ]);

    // Seed goals
    const goals = await Goal.insertMany([
      {
        userId: userId,
        title: 'Complete Node.js Course',
        description: 'Finish all modules and build final project',
        progress: 45,
        targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'Active',
        isCompleted: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        userId: userId,
        title: 'Write Research Paper',
        description: 'AI and Machine Learning research',
        progress: 0,
        targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'Planning',
        isCompleted: false,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        userId: userId,
        title: 'Learn React Hooks',
        description: 'Master useState, useEffect, and custom hooks',
        progress: 80,
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Active',
        isCompleted: false,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    ]);

    // Seed events
    const now = new Date();
    const events = await Event.insertMany([
      {
        user: userId,
        title: 'Team Meeting',
        start: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        end: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        allDay: false,
        createdAt: now,
      },
      {
        user: userId,
        title: 'Gym Session',
        start: new Date(now.getTime() + 5 * 60 * 60 * 1000),
        end: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        allDay: false,
        createdAt: now,
      },
      {
        user: userId,
        title: 'Project Deadline',
        start: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        end: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        allDay: true,
        createdAt: now,
      },
    ]);

    res.json({
      success: true,
      message: 'Test data seeded successfully',
      data: {
        habits: habits.length,
        goals: goals.length,
        events: events.length,
      },
    });
  } catch (error) {
    console.error('[Test] Error seeding data:', error);
    res.status(500).json({ msg: 'Error seeding test data', error: error.message });
  }
});

/**
 * POST /api/test/run-all-ai
 * Runs all AI features and returns results
 */
router.post('/run-all-ai', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const results = {};

    // Test 1: Intelligent Suggestions (Phase 1)
    console.log('[Test] Running Phase 1: Intelligent Suggestions...');
    try {
      const suggestions = await generateIntelligentSuggestions(userId);
      results.phase1_suggestions = {
        success: true,
        count: suggestions.length,
        data: suggestions,
      };
    } catch (error) {
      results.phase1_suggestions = {
        success: false,
        error: error.message,
      };
    }

    // Test 2: Chat Coach (Phase 2)
    console.log('[Test] Running Phase 2: Chat Coach...');
    try {
      const testQuestions = [
        'What should I focus on today?',
        'How can I improve my Morning Run habit?',
        'Help me with my goals',
      ];

      const chatResponses = [];
      for (const question of testQuestions) {
        const response = await generateChatResponse(userId, question, 'test-conversation');
        chatResponses.push({
          question,
          answer: response.message.substring(0, 200) + '...', // First 200 chars
        });
      }

      results.phase2_chat = {
        success: true,
        count: chatResponses.length,
        data: chatResponses,
      };
    } catch (error) {
      results.phase2_chat = {
        success: false,
        error: error.message,
      };
    }

    // Test 3: Proactive Notifications (Phase 3)
    console.log('[Test] Running Phase 3: Proactive Notifications...');
    try {
      const notifications = await analyzeUser(userId);
      results.phase3_notifications = {
        success: true,
        count: notifications.length,
        data: notifications.map((n) => ({
          type: n.type,
          title: n.title,
          priority: n.priority,
        })),
      };
    } catch (error) {
      results.phase3_notifications = {
        success: false,
        error: error.message,
      };
    }

    // Get counts for verification
    const [habitCount, goalCount, eventCount, notificationCount] = await Promise.all([
      Habit.countDocuments({ user: userId }),
      Goal.countDocuments({ user: userId }),
      Event.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId }),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: userId,
      database: {
        habits: habitCount,
        goals: goalCount,
        events: eventCount,
        notifications: notificationCount,
      },
      results,
    });
  } catch (error) {
    console.error('[Test] Error running AI tests:', error);
    res.status(500).json({ msg: 'Error running tests', error: error.message });
  }
});

/**
 * DELETE /api/test/clear-data
 * Clears all user data for fresh testing
 */
router.delete('/clear-data', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const results = await Promise.all([
      Habit.deleteMany({ user: userId }),
      Goal.deleteMany({ user: userId }),
      Event.deleteMany({ user: userId }),
      ChatMessage.deleteMany({ user: userId }),
      Notification.deleteMany({ user: userId }),
    ]);

    res.json({
      success: true,
      message: 'All user data cleared',
      deleted: {
        habits: results[0].deletedCount,
        goals: results[1].deletedCount,
        events: results[2].deletedCount,
        chatMessages: results[3].deletedCount,
        notifications: results[4].deletedCount,
      },
    });
  } catch (error) {
    console.error('[Test] Error clearing data:', error);
    res.status(500).json({ msg: 'Error clearing data', error: error.message });
  }
});

module.exports = router;