const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const middleware = require('../middleware/index.js');

// Get notifications for current user (by role or 'all')
router.get('/notifications', async (req, res) => {
    try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const role = req.user.role;
        const notifications = await Notification.find({ recipients: { $in: [role, 'all'] } }).sort({ createdAt: -1 }).lean();
        // mark read status per user
        const result = notifications.map(n => ({
            _id: n._id,
            message: n.message,
            data: n.data || {},
            createdAt: n.createdAt,
            isRead: Array.isArray(n.isReadBy) && n.isReadBy.some(id => String(id) === String(req.user._id))
        }));
        const unreadCount = result.filter(r => !r.isRead).length;
        return res.json({ unreadCount, notifications: result });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Mark one or all notifications as read for current user
router.post('/notifications/mark-read', async (req, res) => {
    try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const { id } = req.body;
        if (id) {
            await Notification.updateOne({ _id: id }, { $addToSet: { isReadBy: req.user._id } });
            return res.json({ ok: true });
        }
        await Notification.updateMany({ recipients: { $in: [req.user.role, 'all'] } }, { $addToSet: { isReadBy: req.user._id } });
        return res.json({ ok: true });
    } catch (err) {
        console.error('Error marking notifications read:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
