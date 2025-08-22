const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Event = require('../models/Event');

// CREATE an event
router.post('/', auth, async (req, res) => {
  const { title, description, category, start, end } = req.body;

  try {
    const newEvent = new Event({
      title,
      description,
      category,
      start,
      end,
      user: req.user.id, // Correct: uses 'user'
    });

    const event = await newEvent.save();
    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET all events of logged-in user
router.get('/', auth, async (req, res) => {
  try {
    // --- FIX ---
    // Was: { userId: req.user.id }
    // Now: { user: req.user.id }
    const events = await Event.find({ user: req.user.id });
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// UPDATE an event
router.put('/:id', auth, async (req, res) => {
  const { title, description, category, start, end } = req.body;

  const eventFields = {};
  if (title) eventFields.title = title;
  if (description) eventFields.description = description;
  if (category) eventFields.category = category;
  if (start) eventFields.start = start;
  if (end) eventFields.end = end;

  try {
    // Correct: uses 'user'
    let event = await Event.findOne({ _id: req.params.id, user: req.user.id });

    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: eventFields },
      { new: true }
    );

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE an event
router.delete('/:id', auth, async (req, res) => {
  try {
    // --- FIX ---
    // Was: { _id: req.params.id, userId: req.user.id }
    // Now: { _id: req.params.id, user: req.user.id }
    const event = await Event.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    res.json({ msg: 'Event removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;