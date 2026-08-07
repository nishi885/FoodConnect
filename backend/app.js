const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const expressLayouts = require("express-ejs-layouts");
const dotenv = require("dotenv");


const originalEmit = process.emit;
process.emit = function(type, ...args) {
	if (type === 'warning' && args[0]?.code === 'DEP0044') {
		return;
	}
	return originalEmit.apply(process, [type, ...args]);
};

const connectDB = require("./config/dbConnection");
const configurePassport = require("./config/passport");
const authRoutes = require("./routes/auth");
const homeRoutes = require("./routes/home");
const adminRoutes = require("./routes/admin");
const donorRoutes = require("./routes/donor");
const agentRoutes = require("./routes/agent");
const notificationsRoutes = require("./routes/notifications");
const faqRoutes = require("./routes/faq");
const apiRoutes = require("./routes/api");
const { markExpiredDonations } = require("./services/donationPriority");
const { COOKIE_NAME, clearAuthCookie, readToken } = require("./config/jwt");
const User = require("./models/user");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 5001;

configurePassport(passport);
connectDB();
markExpiredDonations().catch(err => console.error("Expiry status update failed:", err));
setInterval(() => markExpiredDonations().catch(err => console.error("Expiry status update failed:", err)), 5 * 60 * 1000).unref();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use(
	session({
		secret: process.env.SESSION_SECRET || "foodconnect-dev-secret",
		resave: false,
		saveUninitialized: false
	})
);

app.use(flash());
app.use(passport.initialize());

// Login identity comes only from the signed JWT HttpOnly cookie.
// express-session remains only for temporary OTP/flash state, never for authentication.
app.use(async (req, res, next) => {
	const token = req.cookies?.[COOKIE_NAME];
	req.user = null;
	req.isAuthenticated = () => Boolean(req.user);
	req.isUnauthenticated = () => !req.user;
	if (!token) return next();
	try {
		const payload = readToken(token);
		req.user = await User.findById(payload.sub);
		if (!req.user) clearAuthCookie(res);
	} catch (_) {
		clearAuthCookie(res);
	}
	next();
});

app.use((req, res, next) => {
	res.locals.success = req.flash("success");
	res.locals.error = req.flash("error");
	res.locals.warning = req.flash("warning");
	res.locals.currentUser = req.user || null;
	next();
});

app.use(homeRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(donorRoutes);
app.use(agentRoutes);
app.use(notificationsRoutes);
app.use(faqRoutes);
app.use(apiRoutes);

// React SPA. Run `npm install && npm run build` in /frontend before production use.
const reactAppDirectory = path.join(__dirname, "public", "app");
app.use("/app", express.static(reactAppDirectory));
app.get("/app/*", (req, res) => res.sendFile(path.join(reactAppDirectory, "index.html")));

app.use((req, res) => {
	res.status(404).render("404page", { title: "Page Not Found" });
});

app.listen(port, () => {
	console.log(`FoodConnect server running on http://localhost:${port}`);
});

module.exports = app;
