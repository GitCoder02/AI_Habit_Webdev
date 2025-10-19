// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const { triggerManualAnalysis } = require('../jobs/dailyAnalysis');

/**
 * GET /api/notifications - Get user's notifications
 * Query params: ?unreadOnly=true&limit=20
 */
router.get('/', auth, async (req, res) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;

    const query = { user: req.user.id };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('[Notifications API] Error fetching notifications:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count - Get count of unread notifications
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error('[Notifications API] Error getting unread count:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

/**
 * PATCH /api/notifications/:id/read - Mark notification as read
 */
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('[Notifications API] Error marking as read:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

/**
 * PATCH /api/notifications/mark-all-read - Mark all as read
 */
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );

    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('[Notifications API] Error marking all as read:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    res.json({ msg: 'Notification deleted' });
  } catch (error) {
    console.error('[Notifications API] Error deleting notification:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

/**
 * POST /api/notifications/trigger-analysis - Manual trigger (for testing)
 * Only allow in development or with admin role
 */
router.post('/trigger-analysis', auth, async (req, res) => {
  try {
    // Optional: Add admin check here
    const result = await triggerManualAnalysis();
    res.json(result);
  } catch (error) {
    console.error('[Notifications API] Manual trigger error:', error);
    res.status(500).json({ msg: error.message });
  }
});

module.exports = router;