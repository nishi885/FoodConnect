const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const Notification = require("../models/notification.js");
const { sendOtpEmail } = require("../config/mail.js");
const middleware = require("../middleware/index.js");
const { signToken, setAuthCookie, clearAuthCookie } = require("../config/jwt.js");

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Password reset helpers
const passwordValid = (p) => {
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9@]{4,}$/;
	const allowedSpecial = /^[A-Za-z0-9@]*$/;
	return passwordRegex.test(p) && allowedSpecial.test(p);
}



router.post("/auth/signup", middleware.ensureNotLoggedIn, async (req, res) => {
	const { firstName, lastName, email, password1, password2, role } = req.body;
	const errors = [];

	if (!firstName || !lastName || !email || !password1 || !password2) {
		errors.push({ msg: "Please fill in all the fields" });
	}
	const emailRegex = /^([a-zA-Z0-9_\-.+]+)@([a-zA-Z0-9\-.]+)\.([A-Za-z]{2,5})$/;
	if (!emailRegex.test(email)) {
		errors.push({ msg: "Please enter a valid email address." });
	}
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9@]{4,}$/;
	if (password1 !== password2) {
		errors.push({ msg: "Passwords are not matching" });
	}
	if (!passwordRegex.test(password1)) {
		errors.push({ msg: "Password must contain at least one uppercase, one lowercase letter, only @ as special character, and be at least 4 characters." });
	}
	if (errors.length > 0) {
		return res.status(400).json({ errors });
	}

	try {
		const user = await User.findOne({ email: email });
		if (user) {
			return res.status(409).json({ error: "This email is already registered." });
		}

		const otp = generateOtp();
		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(password1, salt);

		req.session.pendingSignup = {
			firstName,
			lastName,
			email,
			password: hash,
			role,
			otp,
			otpExpires: Date.now() + 10 * 60 * 1000
		};

		const sent = await sendOtpEmail(email, otp);
		if (!sent) {
			delete req.session.pendingSignup;
			return res.status(500).json({ error: 'Could not send verification email. Please try again.' });
		}

		return res.json({ ok: true, redirect: '/auth/verify' });
	} catch (err) {
		console.error('Signup server error:', err);
		return res.status(500).json({ error: 'Server error during signup.' });
	}
});


router.post('/auth/forgot', middleware.ensureNotLoggedIn, async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ error: 'No account found with that email' });
		}
		const otp = generateOtp();
		user.resetOtp = otp;
		user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
		await user.save();
		const { sendEmail } = require('../config/mail');
		const sent = await sendEmail(email, 'Password reset code', `Your password reset code is: ${otp}`, `<p>Your password reset code is: <strong>${otp}</strong></p><p>It is valid for 10 minutes.</p>`);
		if (!sent) {
			return res.status(500).json({ error: 'Could not send reset email. Please try again later.' });
		}
		return res.json({ ok: true, redirect: `/auth/reset?email=${encodeURIComponent(email)}` });
	} catch (err) {
		console.error('Error in forgot password:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

router.post('/auth/reset', middleware.ensureNotLoggedIn, async (req, res) => {
	const { email, otp, password1, password2 } = req.body;
	const errors = [];
	if (!email || !otp || !password1 || !password2) {
		errors.push({ msg: 'Please fill in all fields' });
	}
	if (password1 !== password2) errors.push({ msg: 'Passwords do not match' });
	if (!passwordValid(password1)) errors.push({ msg: 'Password must contain at least one uppercase, one lowercase letter, only @ as special character, and be at least 4 characters.'});
	if (errors.length > 0) {
		return res.status(400).json({ errors });
	}
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ error: 'No account found' });
		}
		if (!user.resetOtp || !user.resetOtpExpires || Date.now() > user.resetOtpExpires) {
			return res.status(410).json({ error: 'Reset code expired. Please request a new code.' });
		}
		if (user.resetOtp !== String(otp).trim()) {
			return res.status(400).json({ error: 'Invalid reset code' });
		}
		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(password1, salt);
		user.password = hash;
		user.resetOtp = undefined;
		user.resetOtpExpires = undefined;
		await user.save();
		return res.json({ ok: true, redirect: '/auth/login' });
	} catch (err) {
		console.error('Error resetting password:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});


// Verify OTP routes
router.get('/auth/verify', middleware.ensureNotLoggedIn, (req, res) => {
	if (!req.session.pendingSignup) {
		return res.status(400).json({ error: 'Please sign up first to verify your email.' });
	}
	return res.json({ email: req.session.pendingSignup.email });
});

router.post('/auth/verify', middleware.ensureNotLoggedIn, async (req, res) => {
	const { otp } = req.body;
	try {
		const pendingSignup = req.session.pendingSignup;
		if (!pendingSignup) {
			return res.status(400).json({ error: 'Signup session expired. Please sign up again.' });
		}

		if (!pendingSignup.otp || !pendingSignup.otpExpires || Date.now() > pendingSignup.otpExpires) {
			return res.status(410).json({ error: 'OTP expired. Please resend OTP.' });
		}

		if (pendingSignup.otp !== String(otp).trim()) {
			return res.status(400).json({ error: 'Invalid OTP.' });
		}

		const existingUser = await User.findOne({ email: pendingSignup.email });
		if (existingUser) {
			delete req.session.pendingSignup;
			return res.status(409).json({ error: 'This email is already registered. Please log in.' });
		}

		const newUser = new User({
			firstName: pendingSignup.firstName,
			lastName: pendingSignup.lastName,
			email: pendingSignup.email,
			password: pendingSignup.password,
			role: pendingSignup.role,
			isVerified: true
		});

		await newUser.save();

		try {
			await Notification.create({
				message: `New user registered: ${newUser.firstName} ${newUser.lastName} (${newUser.role})`,
				data: { userId: newUser._id, role: newUser.role },
				recipients: ['admin']
			});
		} catch (notifErr) {
			console.error('Could not create notification:', notifErr);
		}

		delete req.session.pendingSignup;

		const token = signToken(newUser);
		setAuthCookie(res, token);
		return res.json({ ok: true, redirect: `/${newUser.role}/dashboard` });
	} catch (err) {
		console.error('Error verifying OTP', err);
		return res.status(500).json({ error: 'Server error verifying OTP' });
	}
});

router.post('/auth/resend-otp', middleware.ensureNotLoggedIn, async (req, res) => {
	try {
		const pendingSignup = req.session.pendingSignup;
		if (!pendingSignup) {
			return res.status(400).json({ error: 'Signup session expired. Please sign up again.' });
		}
		const otp = generateOtp();
		pendingSignup.otp = otp;
		pendingSignup.otpExpires = Date.now() + 10 * 60 * 1000;
		req.session.pendingSignup = pendingSignup;

		const sent = await sendOtpEmail(pendingSignup.email, otp);
		if (!sent) {
			return res.status(500).json({ error: 'Could not send OTP email.' });
		}
		return res.json({ ok: true, message: 'A new verification code has been sent to your email.' });
	} catch (err) {
		console.error('Error resending OTP', err);
		return res.status(500).json({ error: 'Server error resending OTP' });
	}
});

router.post('/auth/login', middleware.ensureNotLoggedIn, async (req, res, next) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password are required.' });
		}

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ error: 'The email is not registered' });
		}

		if (user.isVerified === false) {
			return res.status(401).json({ error: 'Please verify your email before logging in.' });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ error: 'Password incorrect' });
		}

		const token = signToken(user);
		setAuthCookie(res, token);
		return res.json({ ok: true, redirect: `/${user.role}/dashboard` });
	} catch (err) {
		next(err);
	}
});

router.post('/auth/logout', (req, res, next) => {
	clearAuthCookie(res);
	return res.json({ ok: true });
});


// Allow any logged-in user to unregister (delete) their own account
router.post('/auth/unregister', middleware.ensureLoggedIn, async (req, res, next) => {
	try {
		const userId = req.user._id;
		const role = req.user.role;

		if (role === 'agent') {
			await Donation.updateMany({ agent: userId, status: 'assigned' }, { $set: { agent: null, status: 'accepted' } });
		}

		if (role === 'donor') {
			await Donation.deleteMany({ donor: userId });
		}

		await User.findByIdAndDelete(userId);

		clearAuthCookie(res);
		req.flash('success', 'Your account has been unregistered successfully.');
		return res.redirect('/');
	} catch (err) {
		console.error('Error unregistering user:', err);
		req.flash('error', 'Could not unregister account.');
		return res.redirect('back');
	}
});


module.exports = router;