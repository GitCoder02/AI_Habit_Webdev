const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Habit = require('../models/Habit');

// A helper function to check if two dates are on the same day, ignoring time
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// A helper function to check if a date was yesterday
const isYesterday = (date) => {
  if (!date) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

// GET all habits for a user (with daily reset logic)
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user.id }).sort({ createdAt: -1 });

    const today = new Date();
    
    // Process habits to check for streak resets before sending to frontend
    const processedHabits = habits.map(habit => {
      // If the habit was last completed but not yesterday or today, the streak is broken.
      if (habit.lastCompleted && !isSameDay(habit.lastCompleted, today) && !isYesterday(habit.lastCompleted)) {
        habit.streak = 0;
        // Optionally, save the broken streak to the DB. 
        // For now, we'll just show it on the frontend. A background job is better for saving.
      }
      return habit;
    });

    res.json(processedHabits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CREATE a new habit
router.post('/', auth, async (req, res) => {
  const { name, description, category } = req.body;
  try {
    const newHabit = new Habit({
      name,
      description,
      category,
      user: req.user.id,
    });
    const habit = await newHabit.save();
    res.json(habit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- NEW DEDICATED ROUTE ---
// COMPLETE a habit for today
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit || habit.user.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Habit not found' });
    }

    const today = new Date();

    // If already completed today, do nothing.
    if (isSameDay(habit.lastCompleted, today)) {
      return res.json(habit);
    }
    
    // If last completed yesterday, continue the streak.
    if (isYesterday(habit.lastCompleted)) {
      habit.streak += 1;
    } else {
      // Otherwise, start a new streak.
      habit.streak = 1;
    }

    // Update best streak if the current streak is greater
    if (habit.streak > habit.bestStreak) {
      habit.bestStreak = habit.streak;
    }

    // Mark as completed for today
    habit.lastCompleted = today;

    await habit.save();
    res.json(habit);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Update a habit
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, category, completedToday } = req.body;

    let habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ msg: 'Habit not found' });

    habit.name = name || habit.name;
    habit.description = description || habit.description;
    habit.category = category || habit.category;

    // Update streak logic if user marks completedToday
    if (completedToday !== undefined) {
      if (completedToday && !habit.completedToday) {
        habit.streak += 1;
        if (habit.streak > habit.bestStreak) habit.bestStreak = habit.streak;
      } else if (!completedToday && habit.completedToday) {
        habit.streak = Math.max(0, habit.streak - 1);
      }
      habit.completedToday = completedToday;
    }

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Delete a habit
router.delete('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ msg: 'Habit not found' });

    res.json({ msg: 'Habit removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;