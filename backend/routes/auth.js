const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const passport = require("passport");
const middleware = require("../middleware/index.js")



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
		const newUser = new User({ firstName, lastName, email, password: password1, role });
		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(newUser.password, salt);
		newUser.password = hash;
		await newUser.save();
		console.log("Signup success: User registered", newUser.email);
		req.flash("success", "You are successfully registered and can log in.");
		res.redirect("/auth/login");
	} catch (err) {
		console.log("Signup server error:", err);
		req.flash("error", "Some error occurred on the server.");
		res.redirect("back");
	}
});


router.get("/auth/login", middleware.ensureNotLoggedIn, (req,res) => {
	res.render("auth/login", { title: "User login" });
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


module.exports = router;