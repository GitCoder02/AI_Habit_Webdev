// routes/goals.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Goal = require('../models/Goal');

// ✅ Create a new goal
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, targetDate, category, status } = req.body;

    const goal = new Goal({
      userId: req.user.id,
      title,
      description,
      targetDate,
      category,   // NEW
      status      // NEW
    });

    await goal.save();
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Get all goals of logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id });
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Update a goal
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, targetDate, category, status, progress, isCompleted } = req.body;

    let goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ msg: 'Goal not found' });

    // Update only provided fields
    goal.title = title || goal.title;
    goal.description = description || goal.description;
    goal.targetDate = targetDate || goal.targetDate;
    goal.category = category || goal.category;       // NEW
    goal.status = status || goal.status;             // NEW
    goal.progress = progress !== undefined ? progress : goal.progress;
    goal.isCompleted = isCompleted !== undefined ? isCompleted : goal.isCompleted;

    await goal.save();
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Delete a goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ msg: 'Goal not found' });

    res.json({ msg: 'Goal removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
