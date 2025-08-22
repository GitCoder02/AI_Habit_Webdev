const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const Habit = require("../models/Habit");
const Goal = require("../models/Goal");
const Event = require("../models/Event"); // assuming you already have this

// helper
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Habits
    const habits = await Habit.find({ user: userId });
    const today = new Date();
    const completedToday = habits.filter(h => h.lastCompleted && isSameDay(h.lastCompleted, today)).length;
    const totalHabits = habits.length;
    const topStreak = Math.max(...habits.map(h => h.streak), 0);

    // Goals
    const goals = await Goal.find({ userId });
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.isCompleted).length;

    // Events trend (7 days)
    const events = await Event.find({ user: userId });
    const now = new Date();
    const weeklyEvents = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      const count = events.filter(ev => {
        const evDate = new Date(ev.start);
        return evDate.toDateString() === d.toDateString();
      }).length;
      return { day: label, events: count };
    });

    res.json({
      completedToday,
      totalHabits,
      completedGoals,
      totalGoals,
      topStreak,
      weeklyEvents
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;