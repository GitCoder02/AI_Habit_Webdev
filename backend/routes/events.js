const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Event = require('../models/Event');

// ✅ Create a new event
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, start, end } = req.body;

    const event = new Event({
      userId: req.user.id,
      title,
      description,
      start,
      end,
    });

    await event.save();
    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Get all events of logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user.id });
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Update an event
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, start, end } = req.body;

    let event = await Event.findOne({ _id: req.params.id, userId: req.user.id });
    if (!event) return res.status(404).json({ msg: 'Event not found' });

    event.title = title || event.title;
    event.description = description || event.description;
    event.start = start || event.start;
    event.end = end || event.end;

    await event.save();
    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ Delete an event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!event) return res.status(404).json({ msg: 'Event not found' });

    res.json({ msg: 'Event removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;