const path = require("path");
const express = require("express");
const session = require("express-session");
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

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 5001;

configurePassport(passport);
connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
app.use(passport.session());

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

app.use((req, res) => {
	res.status(404).render("404page", { title: "Page Not Found" });
});

app.listen(port, () => {
	console.log(`FoodConnect server running on http://localhost:${port}`);
});

module.exports = app;
