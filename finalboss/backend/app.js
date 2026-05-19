const path = require("path");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const expressLayouts = require("express-ejs-layouts");
const dotenv = require("dotenv");

// Load environment variables from .env in both root and local directory
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("./config/dbConnection");
const configurePassport = require("./config/passport");
const homeRoutes = require("./routes/home");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const donorRoutes = require("./routes/donor");
const agentRoutes = require("./routes/agent");

const app = express();
const port = Number(process.env.PORT) || 5001;

// Connect to DB and configure passport
connectDB();
configurePassport(passport);

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");
app.use(expressLayouts);

// Static files (support both possible asset locations)
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "..", "assets")));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override
app.use(methodOverride("_method"));

// Express session
app.use(
	session({
		secret: process.env.SESSION_SECRET || "foodconnect-dev-secret",
		resave: false,
		saveUninitialized: false
	})
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());
app.use((req, res, next) => {
	res.locals.success = req.flash("success");
	res.locals.error = req.flash("error");
	res.locals.warning = req.flash("warning");
	// Use currentUser for consistency
	res.locals.currentUser = req.user || null;
	next();
});

// Use routers
app.use(homeRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(donorRoutes);
app.use(agentRoutes);

// 404 handler
app.use((req, res) => {
	res.status(404).render("404page", { title: "Page Not Found" });
});

app.listen(port, () => {
	console.log(`FoodConnect server running on http://localhost:${port}`);
});

module.exports = app;
