const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Donation = require('../models/donation');
const Notification = require('../models/notification');
const { verifyToken, clearAuthCookie } = require('../config/jwt');

const attachJwtUser = async (req, res, next) => {
  try {
    if (!req.user && req.cookies?.foodconnect_token) {
      const decoded = verifyToken(req.cookies.foodconnect_token);
      if (decoded?.id) {
        const user = await User.findById(decoded.id).lean();
        if (user) req.user = user;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

const requireUser = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
};

router.use(attachJwtUser);
const requireRole = role => (req, res, next) => req.user?.role === role ? next() : res.status(403).json({ error: 'You do not have access to this action.' });
const serialize = value => JSON.parse(JSON.stringify(value));

router.get('/api/session', (req, res) => res.json({ user: req.user ? serialize(req.user) : null }));
router.post('/api/logout', requireUser, (req, res) => {
  clearAuthCookie(res);
  req.user = null;
  return res.json({ ok: true });
});

router.get('/api/dashboard', requireUser, async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role === 'admin') {
      const [admins, donors, agents, pending, accepted, assigned, collected] = await Promise.all([
        User.countDocuments({ role: 'admin' }), User.countDocuments({ role: 'donor' }), User.countDocuments({ role: 'agent' }),
        Donation.countDocuments({ status: 'pending' }), Donation.countDocuments({ status: 'accepted' }),
        Donation.countDocuments({ status: 'assigned' }), Donation.countDocuments({ status: 'collected' })
      ]);
      return res.json({ admins, donors, agents, pending, accepted, assigned, collected });
    }
    const scope = role === 'donor' ? { donor: req.user._id } : { agent: req.user._id };
    const [pending, accepted, assigned, collected] = await Promise.all([
      Donation.countDocuments({ ...scope, status: 'pending' }), Donation.countDocuments({ ...scope, status: 'accepted' }),
      Donation.countDocuments({ ...scope, status: 'assigned' }), Donation.countDocuments({ ...scope, status: 'collected' })
    ]);
    res.json({ pending, accepted, assigned, collected });
  } catch (error) { next(error); }
});

router.get('/api/donations', requireUser, async (req, res, next) => {
  try {
    const { bucket = 'pending' } = req.query;
    const role = req.user.role;
    let filter;
    if (role === 'admin') filter = { status: bucket === 'history' ? { $in: ['collected', 'rejected'] } : { $in: ['pending', 'accepted', 'assigned'] } };
    else if (role === 'donor') filter = { donor: req.user._id, status: bucket === 'pending' ? { $in: ['pending', 'rejected'] } : { $in: ['accepted', 'assigned', 'collected', 'rejected'] } };
    else filter = { agent: req.user._id, status: bucket === 'pending' ? 'assigned' : 'collected' };
    const donations = await Donation.find(filter).sort({ _id: -1 }).populate('donor', 'firstName lastName email').populate('agent', 'firstName lastName email phone').lean();
    res.json({ donations });
  } catch (error) { next(error); }
});

router.post('/api/donations', requireUser, requireRole('donor'), async (req, res, next) => {
  try {
    const { foodType, quantity, cookingTime, address, phone, donorToAdminMsg = '' } = req.body;
    if (![foodType, quantity, cookingTime, address, phone].every(Boolean)) return res.status(400).json({ error: 'Please fill in all required donation details.' });
    const donation = await Donation.create({ foodType, quantity, cookingTime, address, phone, donorToAdminMsg, donor: req.user._id, status: 'pending' });
    await Notification.create({ message: `New donation added by ${req.user.firstName} ${req.user.lastName}`, data: { donationId: donation._id }, recipients: ['admin'] });
    res.status(201).json({ donation });
  } catch (error) { next(error); }
});

router.post('/api/donations/:id/cancel', requireUser, requireRole('donor'), async (req, res, next) => {
  try { await Donation.findOneAndDelete({ _id: req.params.id, donor: req.user._id, status: { $in: ['pending', 'rejected'] } }); res.json({ ok: true }); } catch (error) { next(error); }
});

router.post('/api/donations/:id/admin-action', requireUser, requireRole('admin'), async (req, res, next) => {
  try {
    const { action, agent, message = '' } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found.' });
    if (action === 'accept') donation.status = 'accepted';
    else if (action === 'reject') donation.status = 'rejected';
    else if (action === 'assign' && agent) { donation.status = 'assigned'; donation.agent = agent; donation.adminToAgentMsg = message; }
    else return res.status(400).json({ error: 'Invalid donation action.' });
    await donation.save();
    await Notification.create({ message: action === 'assign' ? 'A donation has been assigned to you' : `Your donation was ${donation.status} by admin`, data: { donationId: donation._id, status: donation.status }, recipients: [action === 'assign' ? 'agent' : 'donor'] });
    res.json({ donation });
  } catch (error) { next(error); }
});

router.post('/api/donations/:id/collect', requireUser, requireRole('agent'), async (req, res, next) => {
  try {
    const donation = await Donation.findOneAndUpdate({ _id: req.params.id, agent: req.user._id, status: 'assigned' }, { status: 'collected', collectionTime: new Date() }, { new: true });
    if (!donation) return res.status(404).json({ error: 'Assigned donation not found.' });
    await Notification.create({ message: 'Your donation was collected successfully', data: { donationId: donation._id, status: 'collected' }, recipients: ['donor'] });
    res.json({ donation });
  } catch (error) { next(error); }
});

router.get('/api/agents', requireUser, requireRole('admin'), async (req, res, next) => { try { res.json({ agents: await User.find({ role: 'agent' }).select('firstName lastName email phone address joinedTime').lean() }); } catch (error) { next(error); } });

router.patch('/api/profile', requireUser, async (req, res, next) => {
  try {
    const allowed = ['firstName', 'lastName', 'gender', 'address', 'phone'];
    const changes = Object.fromEntries(allowed.filter(key => key in req.body).map(key => [key, req.body[key]]));
    const user = await User.findByIdAndUpdate(req.user._id, changes, { new: true }).lean();
    res.json({ user });
  } catch (error) { next(error); }
});

module.exports = router;
