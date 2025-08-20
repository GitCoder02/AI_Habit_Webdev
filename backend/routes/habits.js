const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Habit = require('../models/Habit');

// ✅ Create a new habit
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category } = req.body;

    const habit = new Habit({
      userId: req.user.id,
      name,
      description,
      category,
    });

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Get all habits of logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });
    res.json(habits);
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