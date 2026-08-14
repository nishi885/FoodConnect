const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const User = require('../models/user');
const { verifyToken } = require('../config/jwt');

const loadJwtUser = async (req) => {
    if (req.user) return req.user;
    if (!req.cookies?.foodconnect_token) return null;
    const decoded = verifyToken(req.cookies.foodconnect_token);
    if (!decoded?.id) return null;
    const user = await User.findById(decoded.id).lean();
    if (!user) return null;
    req.user = user;
    return user;
};

// Get notifications for current user (by role or 'all')
router.get('/notifications', async (req, res) => {
    try {
        const user = await loadJwtUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const role = user.role;
        const notifications = await Notification.find({ recipients: { $in: [role, 'all'] } }).sort({ createdAt: -1 }).lean();
        const result = notifications.map(n => ({
            _id: n._id,
            message: n.message,
            data: n.data || {},
            createdAt: n.createdAt,
            isRead: Array.isArray(n.isReadBy) && n.isReadBy.some(id => String(id) === String(user._id))
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
        const user = await loadJwtUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const { id } = req.body;
        if (id) {
            await Notification.updateOne({ _id: id }, { $addToSet: { isReadBy: user._id } });
            return res.json({ ok: true });
        }
        await Notification.updateMany({ recipients: { $in: [user.role, 'all'] } }, { $addToSet: { isReadBy: user._id } });
        return res.json({ ok: true });
    } catch (err) {
        console.error('Error marking notifications read:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
