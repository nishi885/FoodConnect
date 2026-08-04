const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/user');
const Donation = require('../models/donation');
const Notification = require('../models/notification');
const { sendOtpEmail, sendEmail } = require('../config/mail');
const { geocodeLocation } = require('../utils/geocode');
const { markExpiredDonations, sortForPickup, urgencyFor } = require('../services/donationPriority');
const { issueAuthCookie, clearAuthCookie } = require('../config/jwt');
const { getDrivingRoute } = require('../services/openRouteService');

const publicUser = user => user && ({
  _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email,
  role: user.role, gender: user.gender, address: user.address, phone: user.phone
});
const fail = (res, status, message) => res.status(status).json({ error: message });
const signedIn = (req, res, next) => req.isAuthenticated() ? next() : fail(res, 401, 'Please log in first.');
const withRole = role => (req, res, next) => signedIn(req, res, () => req.user.role === role ? next() : fail(res, 403, 'You do not have access to this action.'));
const passwordValid = value => /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9@]{4,}$/.test(value || '');
const otp = () => Math.floor(100000 + Math.random() * 900000).toString();
const validPhone = value => /^[6-9]\d{9}$/.test(String(value || '').replace(/\D/g, ''));
const clean = value => String(value || '').trim();

router.get('/api/me', (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return fail(res, 401, info?.message || 'Invalid email or password.');
    issueAuthCookie(res, user);
    res.json({ user: publicUser(user) });
  })(req, res, next);
});

router.post('/api/auth/signup', async (req, res) => {
  const { firstName, lastName, email, password1, password2, role } = req.body || {};
  if (!firstName || !lastName || !email || !password1 || !password2 || !role) return fail(res, 400, 'Please fill all fields.');
  if (!['admin', 'donor', 'agent'].includes(role)) return fail(res, 400, 'Choose a valid role.');
  if (!/^([a-zA-Z0-9_\-.+]+)@([a-zA-Z0-9\-.]+)\.([a-zA-Z]{2,5})$/.test(email)) return fail(res, 400, 'Please enter a valid email address.');
  if (password1 !== password2 || !passwordValid(password1)) return fail(res, 400, 'Password needs upper/lowercase letters, at least 4 characters, and only @ as a special character.');
  if (await User.exists({ email })) return fail(res, 409, 'This email is already registered.');
  const code = otp();
  req.session.pendingSignup = { firstName, lastName, email, role, password: bcrypt.hashSync(password1, 10), otp: code, otpExpires: Date.now() + 600000 };
  if (!(await sendOtpEmail(email, code))) { delete req.session.pendingSignup; return fail(res, 502, 'Could not send verification email.'); }
  res.status(201).json({ message: 'Verification code sent.', email });
});

router.post('/api/auth/verify', async (req, res) => {
  const pending = req.session.pendingSignup;
  if (!pending) return fail(res, 400, 'Signup session expired. Please sign up again.');
  if (Date.now() > pending.otpExpires || pending.otp !== String(req.body?.otp || '').trim()) return fail(res, 400, 'Invalid or expired verification code.');
  if (await User.exists({ email: pending.email })) return fail(res, 409, 'This email is already registered.');
  const user = await User.create({ ...pending, isVerified: true });
  delete req.session.pendingSignup;
  Notification.create({ message: `New user registered: ${user.firstName} ${user.lastName} (${user.role})`, data: { userId: user._id, role: user.role }, recipients: ['admin'] }).catch(console.error);
  issueAuthCookie(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/api/auth/resend-otp', async (req, res) => {
  const pending = req.session.pendingSignup;
  if (!pending) return fail(res, 400, 'Signup session expired.');
  pending.otp = otp(); pending.otpExpires = Date.now() + 600000;
  if (!(await sendOtpEmail(pending.email, pending.otp))) return fail(res, 502, 'Could not send verification email.');
  res.json({ message: 'A new verification code has been sent.' });
});

router.post('/api/auth/forgot', async (req, res) => {
  const user = await User.findOne({ email: req.body?.email });
  if (!user) return fail(res, 404, 'No account found with that email.');
  user.resetOtp = otp(); user.resetOtpExpires = Date.now() + 600000; await user.save();
  if (!(await sendEmail(user.email, 'Password reset code', `Your password reset code is: ${user.resetOtp}`, `<p>Your password reset code is: <strong>${user.resetOtp}</strong></p>`))) return fail(res, 502, 'Could not send reset email.');
  res.json({ message: 'Password reset code sent.' });
});

router.post('/api/auth/reset', async (req, res) => {
  const { email, otp: code, password1, password2 } = req.body || {};
  if (password1 !== password2 || !passwordValid(password1)) return fail(res, 400, 'Enter a valid matching password.');
  const user = await User.findOne({ email });
  if (!user || !user.resetOtpExpires || Date.now() > user.resetOtpExpires || user.resetOtp !== String(code).trim()) return fail(res, 400, 'Invalid or expired reset code.');
  user.password = bcrypt.hashSync(password1, 10); user.resetOtp = undefined; user.resetOtpExpires = undefined; await user.save();
  res.json({ message: 'Password updated. You can now log in.' });
});

router.post('/api/auth/logout', signedIn, (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });
router.delete('/api/auth/account', signedIn, async (req, res) => {
  const { _id, role } = req.user;
  if (role === 'agent') await Donation.updateMany({ agent: _id, status: 'assigned' }, { $set: { agent: null, status: 'accepted' } });
  if (role === 'donor') await Donation.deleteMany({ donor: _id });
  await User.findByIdAndDelete(_id); clearAuthCookie(res); res.json({ ok: true });
});

router.get('/api/dashboard', signedIn, async (req, res) => {
  const role = req.user.role, id = req.user._id;
  const filter = role === 'donor' ? { donor: id } : role === 'agent' ? { agent: id } : {};
  const statuses = role === 'admin' ? ['pending', 'accepted', 'assigned', 'collected'] : role === 'agent' ? ['assigned', 'collected'] : ['pending', 'accepted', 'assigned', 'collected'];
  const counts = Object.fromEntries(await Promise.all(statuses.map(async status => [status, await Donation.countDocuments({ ...filter, status })])));
  const users = role === 'admin' ? { admins: await User.countDocuments({ role: 'admin' }), donors: await User.countDocuments({ role: 'donor' }), agents: await User.countDocuments({ role: 'agent' }) } : undefined;
  res.json({ counts, users });
});

router.get('/api/donations', signedIn, async (req, res) => {
  await markExpiredDonations();
  const { role, _id } = req.user; const { bucket = 'all' } = req.query;
  let query = role === 'donor' ? { donor: _id } : role === 'agent' ? { agent: _id } : {};
  if (bucket === 'pending') query.status = role === 'donor' ? { $in: ['pending', 'rejected'] } : role === 'agent' ? 'assigned' : { $in: ['pending', 'accepted', 'assigned'] };
  if (bucket === 'previous') query.status = role === 'donor' ? { $in: ['accepted', 'assigned', 'collected', 'rejected'] } : role === 'agent' ? 'collected' : { $in: ['collected', 'rejected'] };
  const donations = await Donation.find(query).populate('donor agent', 'firstName lastName email phone').lean();
  res.json({ donations: sortForPickup(donations, req.user.location) });
});

router.get('/api/donations/:id', signedIn, async (req, res) => {
  await markExpiredDonations();
  const donation = await Donation.findById(req.params.id).populate('donor agent', 'firstName lastName email phone').lean();
  if (!donation) return fail(res, 404, 'Donation not found.');
  if (req.user.role === 'donor' && String(donation.donor._id) !== String(req.user._id)) return fail(res, 403, 'Access denied.');
  if (req.user.role === 'agent' && String(donation.agent?._id) !== String(req.user._id)) return fail(res, 403, 'Access denied.');
  res.json({ donation });
});

router.post('/api/donations', withRole('donor'), async (req, res) => {
  const { foodType, quantity, cookingTime, expiryTime, address, phone, donorToAdminMsg } = req.body || {};
  const cookedAt = new Date(cookingTime), expiresAt = new Date(expiryTime);
  if (!clean(foodType) || !clean(quantity) || !cookingTime || !expiryTime || !clean(address) || !phone) return fail(res, 400, 'Please fill all donation details, including expiry time.');
  if (clean(foodType).length < 3 || clean(foodType).length > 80 || clean(quantity).length < 2 || clean(quantity).length > 60) return fail(res, 400, 'Please enter clear food type and quantity details.');
  if (clean(address).length < 12) return fail(res, 400, 'Enter a complete pickup address (at least 12 characters).');
  if (!validPhone(phone)) return fail(res, 400, 'Enter a valid 10-digit Indian mobile number.');
  if (Number.isNaN(cookedAt.getTime()) || Number.isNaN(expiresAt.getTime()) || cookedAt.getTime() > Date.now() + 5 * 60 * 1000 || expiresAt <= new Date(Math.max(Date.now(), cookedAt.getTime()) + 30 * 60 * 1000)) return fail(res, 400, 'Expiry must be at least 30 minutes after cooking and in the future.');
  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (await Donation.countDocuments({ donor: req.user._id, createdAt: { $gte: lastDay } }) >= 3) return fail(res, 429, 'For safety, a donor can create up to 3 requests in 24 hours. Please contact an admin for more.');
  const escapedType = clean(foodType).replace(/[.*+?^{}()|[\]\\]/g, '\\$&');
  if (await Donation.exists({ donor: req.user._id, foodType: new RegExp('^' + escapedType + '$', 'i'), address: clean(address), status: { $in: ['pending', 'accepted', 'assigned'] }, cookingTime: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } })) return fail(res, 409, 'A very similar active donation was already submitted recently.');
  let location;
  try { location = await geocodeLocation(clean(address)); } catch (error) { return fail(res, 400, error.message); }
  const donation = await Donation.create({ donor: req.user._id, foodType: clean(foodType), quantity: clean(quantity), cookingTime: cookedAt, expiryTime: expiresAt, hasExpired: false, location, address: clean(address), phone: String(phone).replace(/\D/g, ''), donorToAdminMsg: clean(donorToAdminMsg), status: 'pending' });
  Notification.create({ message: `New donation added by ${req.user.firstName} ${req.user.lastName}`, data: { donationId: donation._id }, recipients: ['admin'] }).catch(console.error);
  res.status(201).json({ donation });
});

router.patch('/api/donations/:id/status', signedIn, async (req, res) => {
  const { action, agent, adminToAgentMsg } = req.body || {}; const donation = await Donation.findById(req.params.id);
  if (!donation) return fail(res, 404, 'Donation not found.');
  if (donation.hasExpired && action !== 'reject') return fail(res, 409, 'This food is marked expired and cannot be assigned or collected.');
  if (action === 'accept' && req.user.role === 'admin') donation.status = 'accepted';
  else if (action === 'reject' && req.user.role === 'admin') donation.status = 'rejected';
  else if (action === 'assign' && req.user.role === 'admin' && agent) { donation.status = 'assigned'; donation.agent = agent; donation.adminToAgentMsg = adminToAgentMsg || ''; }
  else if (action === 'collect' && req.user.role === 'agent' && String(donation.agent) === String(req.user._id)) { donation.status = 'collected'; donation.collectionTime = new Date(); }
  else return fail(res, 403, 'This action is not allowed.');
  await donation.save();
  Notification.create({ message: `Donation status updated to ${donation.status}`, data: { donationId: donation._id, status: donation.status }, recipients: ['admin', 'donor', 'agent'] }).catch(console.error);
  res.json({ donation });
});

router.delete('/api/donations/:id', withRole('donor'), async (req, res) => {
  const deleted = await Donation.findOneAndDelete({ _id: req.params.id, donor: req.user._id, status: { $in: ['pending', 'rejected'] } });
  if (!deleted) return fail(res, 404, 'This donation cannot be cancelled.'); res.json({ ok: true });
});

router.get('/api/agents', withRole('admin'), async (req, res) => res.json({ agents: (await User.find({ role: 'agent' }).lean()).map(publicUser) }));
router.get('/api/agent/route', withRole('agent'), async (req, res) => {
  await markExpiredDonations();
  const startLat = Number(req.query.lat), startLng = Number(req.query.lng);
  const origin = Number.isFinite(startLat) && Number.isFinite(startLng) ? { lat: startLat, lng: startLng } : req.user.location;
  const donations = await Donation.find({ agent: req.user._id, status: 'assigned', hasExpired: { $ne: true } }).populate('donor', 'firstName lastName phone').lean();
  const stops = sortForPickup(donations, origin);
  let directions = null;
  let routingWarning = null;
  try { directions = await getDrivingRoute(origin, stops); } catch (error) { routingWarning = error.message; }
  res.json({ origin: origin || null, stops: stops.map((stop, index) => ({ ...stop, pickupOrder: index + 1, urgency: urgencyFor(stop.expiryTime, stop.hasExpired) })), directions, routingWarning });
});
router.patch('/api/profile', signedIn, async (req, res) => {
  const allowed = ['firstName', 'lastName', 'gender', 'address', 'phone']; const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (updates.phone && !validPhone(updates.phone)) return fail(res, 400, 'Enter a valid 10-digit Indian mobile number.');
  if (updates.address && clean(updates.address).length < 12) return fail(res, 400, 'Enter a complete address.');
  if (updates.address && updates.address !== req.user.address) {
    try { updates.location = await geocodeLocation(clean(updates.address)); } catch (error) { return fail(res, 400, error.message); }
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }); res.json({ user: publicUser(user) });
});

module.exports = router;
