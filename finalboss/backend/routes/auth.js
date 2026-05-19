const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const { sendOtpEmail } = require("../config/mail.js");
const passport = require("passport");
const middleware = require("../middleware/index.js")

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Password reset helpers
const passwordValid = (p) => {
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9@]{4,}$/;
	const allowedSpecial = /^[A-Za-z0-9@]*$/;
	return passwordRegex.test(p) && allowedSpecial.test(p);
}



router.get("/auth/signup", middleware.ensureNotLoggedIn, (req,res) => {
	res.render("auth/signup", { title: "User Signup" });
});

router.post("/auth/signup", middleware.ensureNotLoggedIn, async (req, res) => {
	const { firstName, lastName, email, password1, password2, role } = req.body;
	let errors = [];
	console.log("Signup form data:", req.body);
	if (!firstName || !lastName || !email || !password1 || !password2) {
		errors.push({ msg: "Please fill in all the fields" });
	}
	// Email validation
	const emailRegex = /^([a-zA-Z0-9_\-.+]+)@([a-zA-Z0-9\-.]+)\.([a-zA-Z]{2,5})$/;
	if (!emailRegex.test(email)) {
		errors.push({ msg: "Please enter a valid email address." });
	}
	// Password validation: at least one uppercase, one lowercase, only @ as special character, min 4 chars
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9@]{4,}$/;
	const allowedSpecial = /^[A-Za-z0-9@]*$/;
	if (password1 !== password2) {
		errors.push({ msg: "Passwords are not matching" });
	}
	if (!passwordRegex.test(password1) || !allowedSpecial.test(password1)) {
		errors.push({ msg: "Password must contain at least one uppercase, one lowercase letter, only @ as special character, and be at least 4 characters." });
	}
	if (errors.length > 0) {
		console.log("Signup validation errors:", errors);
		return res.render("auth/signup", {
			title: "User Signup",
			errors, firstName, lastName, email, password1, password2
		});
	}

	try {
		const user = await User.findOne({ email: email });
		if (user) {
			errors.push({ msg: "This Email is already registered. Please try another email." });
			console.log("Signup error: Email already registered");
			return res.render("auth/signup", {
				title: "User Signup",
				firstName, lastName, errors, email, password1, password2
			});
		}

		const otp = generateOtp();
		const otpExpires = Date.now() + 10 * 60 * 1000;
		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(password1, salt);

		// keep signup pending in session until OTP is verified
		req.session.pendingSignup = {
			firstName,
			lastName,
			email,
			password: hash,
			role,
			otp,
			otpExpires
		};

		const sent = await sendOtpEmail(email, otp);
		if (!sent) {
			delete req.session.pendingSignup;
			req.flash('error', 'Could not send verification email. Please try again.');
			return res.render("auth/signup", {
				title: "User Signup",
				firstName, lastName, email, password1, password2
			});
		}

		req.flash('success', 'OTP sent to your email. Please verify to complete signup.');
		return res.redirect('/auth/verify');
	} catch (err) {
		console.log("Signup server error:", err);
		req.flash("error", "Some error occurred on the server.");
		res.redirect("back");
	}
});


router.get("/auth/login", middleware.ensureNotLoggedIn, (req,res) => {
	res.render("auth/login", { title: "User login" });
});


// Forgot password: request OTP
router.get('/auth/forgot', middleware.ensureNotLoggedIn, (req, res) => {
	res.render('auth/forgot', { title: 'Forgot Password' });
});

router.post('/auth/forgot', middleware.ensureNotLoggedIn, async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			req.flash('error', 'No account found with that email');
			return res.redirect('/auth/forgot');
		}
		const otp = generateOtp();
		user.resetOtp = otp;
		user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
		await user.save();
		const { sendEmail } = require('../config/mail');
		const sent = await sendEmail(email, 'Password reset code', `Your password reset code is: ${otp}`, `<p>Your password reset code is: <strong>${otp}</strong></p><p>It is valid for 10 minutes.</p>`);
		if (!sent) {
			req.flash('error', 'Could not send reset email. Please try again later.');
			return res.redirect('/auth/forgot');
		}
		req.flash('info', 'Password reset code sent to your email.');
		return res.redirect(`/auth/reset?email=${encodeURIComponent(email)}`);
	} catch (err) {
		console.error('Error in forgot password:', err);
		req.flash('error', 'Server error');
		return res.redirect('/auth/forgot');
	}
});

// Reset password: verify OTP + set new password
router.get('/auth/reset', middleware.ensureNotLoggedIn, (req, res) => {
	const email = req.query.email || '';
	res.render('auth/reset', { title: 'Reset Password', email });
});

router.post('/auth/reset', middleware.ensureNotLoggedIn, async (req, res) => {
	const { email, otp, password1, password2 } = req.body;
	let errors = [];
	if (!email || !otp || !password1 || !password2) {
		errors.push({ msg: 'Please fill in all fields' });
	}
	if (password1 !== password2) errors.push({ msg: 'Passwords do not match' });
	if (!passwordValid(password1)) errors.push({ msg: 'Password must contain at least one uppercase, one lowercase letter, only @ as special character, and be at least 4 characters.'});
	if (errors.length > 0) {
		return res.render('auth/reset', { title: 'Reset Password', email, errors });
	}
	try {
		const user = await User.findOne({ email });
		if (!user) {
			req.flash('error', 'No account found');
			return res.redirect('/auth/forgot');
		}
		if (!user.resetOtp || !user.resetOtpExpires || Date.now() > user.resetOtpExpires) {
			req.flash('error', 'Reset code expired. Please request a new code.');
			return res.redirect('/auth/forgot');
		}
		if (user.resetOtp !== String(otp).trim()) {
			req.flash('error', 'Invalid reset code');
			return res.redirect(`/auth/reset?email=${encodeURIComponent(email)}`);
		}
		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(password1, salt);
		user.password = hash;
		user.resetOtp = undefined;
		user.resetOtpExpires = undefined;
		await user.save();
		req.flash('success', 'Password updated. You can now log in.');
		return res.redirect('/auth/login');
	} catch (err) {
		console.error('Error resetting password:', err);
		req.flash('error', 'Server error');
		return res.redirect('/auth/forgot');
	}
});


// Verify OTP routes
router.get('/auth/verify', middleware.ensureNotLoggedIn, (req, res) => {
	if (!req.session.pendingSignup) {
		req.flash('warning', 'Please sign up first to verify your email.');
		return res.redirect('/auth/signup');
	}
	const email = req.session.pendingSignup.email;
	res.render('auth/verify', { title: 'Verify Account', email });
});

router.post('/auth/verify', middleware.ensureNotLoggedIn, async (req, res) => {
	const { otp } = req.body;
	try {
		const pendingSignup = req.session.pendingSignup;
		if (!pendingSignup) {
			req.flash('warning', 'Signup session expired. Please sign up again.');
			return res.redirect('/auth/signup');
		}

		if (!pendingSignup.otp || !pendingSignup.otpExpires || Date.now() > pendingSignup.otpExpires) {
			req.flash('error', 'OTP expired. Please resend OTP.');
			return res.redirect('/auth/verify');
		}

		if (pendingSignup.otp !== String(otp).trim()) {
			req.flash('error', 'Invalid OTP.');
			return res.redirect('/auth/verify');
		}

		const existingUser = await User.findOne({ email: pendingSignup.email });
		if (existingUser) {
			delete req.session.pendingSignup;
			req.flash('error', 'This email is already registered. Please log in.');
			return res.redirect('/auth/login');
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

		// remove pending signup from session
		delete req.session.pendingSignup;

		// automatically log the user in after verification
		req.login(newUser, function(err) {
			if (err) {
				console.error('Login after verify failed:', err);
				req.flash('success', 'Email verified. Please log in.');
				return res.redirect('/auth/login');
			}
			req.flash('success', 'Email verified and logged in successfully.');
			return res.redirect(req.session.returnTo || `/${newUser.role}/dashboard`);
		});
	} catch (err) {
		console.error('Error verifying OTP', err);
		req.flash('error', 'Server error verifying OTP');
		return res.redirect('/auth/signup');
	}
});

router.post('/auth/resend-otp', middleware.ensureNotLoggedIn, async (req, res) => {
	try {
		const pendingSignup = req.session.pendingSignup;
		if (!pendingSignup) {
			req.flash('warning', 'Signup session expired. Please sign up again.');
			return res.redirect('/auth/signup');
		}
		const otp = generateOtp();
		pendingSignup.otp = otp;
		pendingSignup.otpExpires = Date.now() + 10 * 60 * 1000;
		req.session.pendingSignup = pendingSignup;

		const sent = await sendOtpEmail(pendingSignup.email, otp);
		if (!sent) {
			req.flash('error', 'Could not send OTP email.');
			return res.redirect('/auth/verify');
		}
		req.flash('success', 'A new verification code has been sent to your email.');
		return res.redirect('/auth/verify');
	} catch (err) {
		console.error('Error resending OTP', err);
		req.flash('error', 'Server error resending OTP');
		return res.redirect('/auth/signup');
	}
});

router.post("/auth/login", middleware.ensureNotLoggedIn,
	passport.authenticate('local', {
		failureRedirect: "/auth/login",
		failureFlash: true,
		successFlash: true
	}), (req,res) => {
		res.redirect(req.session.returnTo || `/${req.user.role}/dashboard`);
	}
);


router.get("/auth/logout", (req, res, next) => {
	req.logout(function(err) {
		if (err) { return next(err); }
		req.flash("success", "Logged out successfully from FoodBridge");
		res.redirect("/");
	});
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

		req.logout(function(err) {
			if (err) return next(err);
			req.flash('success', 'Your account has been unregistered successfully.');
			return res.redirect('/');
		});
	} catch (err) {
		console.error('Error unregistering user:', err);
		req.flash('error', 'Could not unregister account.');
		return res.redirect('back');
	}
});


module.exports = router;