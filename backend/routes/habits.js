const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Habit = require('../models/Habit');

// Get all habits for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });
    res.json(habits);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Add a new habit
router.post('/', auth, async (req, res) => {
  const { name, description, category } = req.body;
  try {
    const habit = await Habit.create({
      userId: req.user.id,
      name,
      description,
      category,
    });
    res.status(201).json(habit);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Toggle habit completion
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit || habit.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Habit not found' });
    }
    habit.completedToday = !habit.completedToday;
    habit.streak = habit.completedToday ? habit.streak + 1 : habit.streak - 1;
    if (habit.streak > habit.bestStreak) habit.bestStreak = habit.streak;
    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;