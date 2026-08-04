const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    data: { type: Object },
    recipients: { type: [String], default: ['admin'] }, // roles or 'all'
    isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('notifications', notificationSchema);
module.exports = Notification;
