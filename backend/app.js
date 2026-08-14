const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const dotenv = require("dotenv");


const originalEmit = process.emit;
process.emit = function(type, ...args) {
	if (type === 'warning' && args[0]?.code === 'DEP0044') {
		return;
	}
	return originalEmit.apply(process, [type, ...args]);
};

const connectDB = require("./config/dbConnection");
const authRoutes = require("./routes/auth");
const homeRoutes = require("./routes/home");
const adminRoutes = require("./routes/admin");
const donorRoutes = require("./routes/donor");
const agentRoutes = require("./routes/agent");
const notificationsRoutes = require("./routes/notifications");
const faqRoutes = require("./routes/faq");
const apiRoutes = require("./routes/api");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 5001;

connectDB();

const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'foodconnect-flash-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));
app.use(methodOverride("_method"));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

app.use(flash());

app.use((req, res, next) => {
	res.locals.success = req.flash("success");
	res.locals.error = req.flash("error");
	res.locals.warning = req.flash("warning");
	res.locals.currentUser = req.user || null;
	next();
});

app.use(apiRoutes);
app.use(authRoutes);
app.use(notificationsRoutes);
app.use(faqRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/notifications') || req.path.startsWith('/faq')) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }
  return res.status(404).send('Frontend not built yet. Run npm install && npm run build in frontend.');
});

app.listen(port, () => {
	console.log(`FoodConnect server running on http://localhost:${port}`);
});

module.exports = app;
