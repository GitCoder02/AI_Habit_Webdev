// backend/services/proactiveCoachService.js
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const { generateText } = require('./geminiClient');

/**
 * Analyze all users and create proactive notifications
 * Called daily by cron job
 */
async function analyzeAllUsers() {
  try {
    console.log('[ProactiveCoach] Starting daily analysis...');

    // Get all unique user IDs from habits
    const users = await Habit.distinct('user');
    console.log(`[ProactiveCoach] Analyzing ${users.length} users`);

    let totalNotifications = 0;

    for (const userId of users) {
      try {
        const notifications = await analyzeUser(userId);
        totalNotifications += notifications.length;
      } catch (err) {
        console.error(`[ProactiveCoach] Error analyzing user ${userId}:`, err);
      }
    }

    console.log(`[ProactiveCoach] Analysis complete. Created ${totalNotifications} notifications.`);
    return totalNotifications;
  } catch (error) {
    console.error('[ProactiveCoach] Error in analyzeAllUsers:', error);
    throw error;
  }
}

/**
 * Analyze a single user and create notifications
 */
async function analyzeUser(userId) {
  const notifications = [];

  try {
    // 1. Check for struggling habits (missed 3+ times in last week)
    const habitIssues = await detectHabitIssues(userId);
    notifications.push(...habitIssues);

    // 2. Check for stagnant goals (no progress in 7+ days)
    const goalIssues = await detectGoalStagnation(userId);
    notifications.push(...goalIssues);

    // 3. Check for streaks about to break (last completed >24h ago)
    const streakAlerts = await detectStreakRisks(userId);
    notifications.push(...streakAlerts);

    // 4. Save all notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`[ProactiveCoach] Created ${notifications.length} notifications for user ${userId}`);
    }

    return notifications;
  } catch (error) {
    console.error(`[ProactiveCoach] Error analyzing user ${userId}:`, error);
    return [];
  }
}

/**
 * Detect habits that user is struggling with
 */
async function detectHabitIssues(userId) {
  const notifications = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const habits = await Habit.find({ user: userId }).lean();

  for (const habit of habits) {
    // Check if habit hasn't been completed in 7+ days
    const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted) : null;
    const daysSinceCompletion = lastCompleted
      ? Math.floor((now - lastCompleted) / (24 * 60 * 60 * 1000))
      : 999;

    if (daysSinceCompletion >= 7 && habit.streak === 0) {
      // Generate AI intervention message
      const message = await generateInterventionMessage(userId, {
        type: 'habit_warning',
        habitName: habit.name,
        daysSinceCompletion,
        previousStreak: habit.bestStreak || 0,
      });

      notifications.push({
        user: userId,
        type: 'habit_warning',
        priority: 'high',
        title: `Your "${habit.name}" habit needs attention`,
        message,
        actionUrl: '/habits',
        metadata: { habitId: habit._id, habitName: habit.name },
      });
    }
  }

  return notifications;
}

/**
 * Detect goals with no recent progress
 */
async function detectGoalStagnation(userId) {
  const notifications = [];
  const now = new Date();

  const goals = await Goal.find({
    user: userId,
    status: { $ne: 'completed' },
  }).lean();

  for (const goal of goals) {
    const updatedAt = goal.updatedAt ? new Date(goal.updatedAt) : new Date(goal.createdAt);
    const daysSinceUpdate = Math.floor((now - updatedAt) / (24 * 60 * 60 * 1000));

    // Goal with 0% progress or no update in 7+ days
    if ((goal.progress === 0 || daysSinceUpdate >= 7) && goal.progress < 100) {
      const daysUntilDeadline = goal.deadline
        ? Math.floor((new Date(goal.deadline) - now) / (24 * 60 * 60 * 1000))
        : null;

      const message = await generateInterventionMessage(userId, {
        type: 'goal_stagnation',
        goalTitle: goal.title,
        progress: goal.progress || 0,
        daysSinceUpdate,
        daysUntilDeadline,
      });

      notifications.push({
        user: userId,
        type: 'goal_stagnation',
        priority: daysUntilDeadline && daysUntilDeadline <= 3 ? 'high' : 'medium',
        title: `Goal "${goal.title}" needs progress`,
        message,
        actionUrl: `/goals`,
        metadata: { goalId: goal._id, goalTitle: goal.title },
      });
    }
  }

  return notifications;
}

/**
 * Detect streaks at risk of breaking
 */
async function detectStreakRisks(userId) {
  const notifications = [];
  const now = new Date();

  const habits = await Habit.find({
    user: userId,
    streak: { $gt: 0 },
  }).lean();

  for (const habit of habits) {
    if (!habit.lastCompleted) continue;

    const lastCompleted = new Date(habit.lastCompleted);
    const hoursSinceCompletion = (now - lastCompleted) / (60 * 60 * 1000);

    // Alert if streak hasn't been updated in 20+ hours (about to break)
    if (hoursSinceCompletion >= 20 && hoursSinceCompletion < 24) {
      notifications.push({
        user: userId,
        type: 'streak_alert',
        priority: 'high',
        title: `Your ${habit.streak}-day streak is about to break!`,
        message: `Don't let your ${habit.streak}-day streak for "${habit.name}" end! Complete it in the next ${Math.ceil(24 - hoursSinceCompletion)} hours. 🔥`,
        actionUrl: '/habits',
        metadata: { habitId: habit._id, habitName: habit.name, streak: habit.streak },
      });
    }
  }

  return notifications;
}

/**
 * Generate AI-powered intervention message
 */
async function generateInterventionMessage(userId, context) {
  try {
    const { type, habitName, goalTitle, daysSinceCompletion, daysSinceUpdate, daysUntilDeadline, progress } = context;

    let prompt = '';

    if (type === 'habit_warning') {
      prompt = `You are a supportive habit coach. A user hasn't completed their habit "${habitName}" in ${daysSinceCompletion} days. Write a brief (2-3 sentences), encouraging message that:
- Acknowledges the difficulty without judgment
- Suggests a small, concrete step to restart
- Uses a warm, motivating tone
Keep it under 100 words. Don't use emojis.`;
    } else if (type === 'goal_stagnation') {
      const deadlineText = daysUntilDeadline !== null
        ? `The deadline is in ${daysUntilDeadline} days.`
        : 'There is no deadline set.';

      prompt = `You are a supportive productivity coach. A user's goal "${goalTitle}" has been at ${progress}% for ${daysSinceUpdate} days. ${deadlineText} Write a brief (2-3 sentences), encouraging message that:
- Acknowledges that progress can be hard
- Suggests breaking the goal into smaller tasks
- Offers a specific next action
Keep it under 100 words. Don't use emojis.`;
    }

    const response = await generateText(prompt, { temperature: 0.7, maxOutputTokens: 150 });
    return response.text || 'Time to get back on track! Small steps lead to big progress.';
  } catch (error) {
    console.error('[generateInterventionMessage] Error:', error);
    // Fallback messages
    if (context.type === 'habit_warning') {
      return `It's been a while since you completed "${context.habitName}". No worries—every day is a fresh start! Try setting aside just 5 minutes today to restart this habit.`;
    } else {
      return `Your goal "${context.goalTitle}" has been paused for a bit. Let's break it into one small task you can complete today. Progress beats perfection!`;
    }
  }
}

/**
 * Emit notification to user if they're online
 */
function emitNotificationToUser(userId, notification) {
  try {
    if (global.io) {
      global.io.to(`user:${userId}`).emit('newNotification', notification);
      console.log(`[ProactiveCoach] Notification emitted to user ${userId}`);
    }
  } catch (error) {
    console.error('[ProactiveCoach] Error emitting notification:', error);
  }
}

// Update analyzeUser function to emit notifications:
async function analyzeUser(userId) {
  const notifications = [];

  try {
    // ... existing detection code ...

    // Save all notifications
    if (notifications.length > 0) {
      const savedNotifications = await Notification.insertMany(notifications);
      console.log(`[ProactiveCoach] Created ${notifications.length} notifications for user ${userId}`);
      
      // ✅ Emit each notification in real-time
      savedNotifications.forEach(notif => {
        emitNotificationToUser(userId, notif);
      });
    }

    return notifications;
  } catch (error) {
    console.error(`[ProactiveCoach] Error analyzing user ${userId}:`, error);
    return [];
  }
}

// Export the new function
module.exports = {
  analyzeAllUsers,
  analyzeUser,
  emitNotificationToUser, // ✅ ADD THIS
};