require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");

const connectDB = require("./config/dbConnection");

// Import routers
const homeRoutes = require("./routes/home");
const adminRoutes = require("./routes/admin");
const agentRoutes = require("./routes/agent");
const donorRoutes = require("./routes/donor");
const authRoutes = require("./routes/auth");

const app = express();

// Connect to MongoDB
dbConnect = async () => { await connectDB(); };
dbConnect();

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);

// Static files
app.use(express.static(path.join(__dirname, "../assets")));

// Body parser
app.use(express.urlencoded({ extended: true }));

// Method override
app.use(methodOverride("_method"));

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// Flash messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.warning = req.flash("warning");
  res.locals.user = req.user || null;
  next();
});

// Use routers
app.use("/", homeRoutes);
app.use("/", adminRoutes);
app.use("/", agentRoutes);
app.use("/", donorRoutes);
app.use("/", authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render("404page", { title: "404 Not Found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
