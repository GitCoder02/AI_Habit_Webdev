const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Goal = require('../models/Goal');

// Get all goals for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id });
    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Add a new goal
router.post('/', auth, async (req, res) => {
  const { title, description, targetDate } = req.body;
  try {
    const goal = await Goal.create({
      userId: req.user.id,
      title,
      description,
      targetDate,
    });
    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Update goal progress or completion
router.put('/:id', auth, async (req, res) => {
  const { progress, isCompleted } = req.body;
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal || goal.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    if (progress !== undefined) goal.progress = progress;
    if (isCompleted !== undefined) goal.isCompleted = isCompleted;
    await goal.save();
    res.json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;