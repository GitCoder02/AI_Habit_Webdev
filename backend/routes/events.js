const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Event = require('../models/Event');

// GET /api/events -> fetch user events
router.get('/', auth, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user.id }).sort({ start: 1 });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/events -> create new event
router.post('/', auth, async (req, res) => {
  try {
    const { title, start, end, description } = req.body;
    const event = await Event.create({ userId: req.user.id, title, start, end, description });
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/events/:id -> update event
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, start, end, description } = req.body;
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, start, end, description },
      { new: true }
    );
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;