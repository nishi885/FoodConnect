const { verifyToken } = require('../config/jwt');
const User = require('../models/user');

const getJwtUser = async (req) => {
	if (req.user) return req.user;
	if (!req.cookies?.foodconnect_token) return null;
	const decoded = verifyToken(req.cookies.foodconnect_token);
	if (!decoded?.id) return null;
	const user = await User.findById(decoded.id).lean();
	if (!user) return null;
	req.user = user;
	return user;
};

const middleware = {
	ensureLoggedIn: async (req, res, next) => {
		const user = await getJwtUser(req);
		if (user) return next();
		req.flash("warning", "Please log in first to continue");
		res.redirect("/auth/login");
	},
	
	ensureAdminLoggedIn: async (req, res, next) => {
		const user = await getJwtUser(req);
		if (!user) {
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/login");
		}
		if(user.role != "admin") {
			req.flash("warning", "This route is allowed for admin only!!");
			return res.redirect("back");
		}
		next();
	},
	
	ensureDonorLoggedIn: async (req, res, next) => {
		const user = await getJwtUser(req);
		if (!user) {
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/login");
		}
		if(user.role != "donor") {
			req.flash("warning", "This route is allowed for donor only!!");
			return res.redirect("back");
		}
		next();
	},
	
	ensureAgentLoggedIn: async (req, res, next) => {
		const user = await getJwtUser(req);
		if (!user) {
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/login");
		}
		if(user.role != "agent") {
			req.flash("warning", "This route is allowed for agent only!!");
			return res.redirect("back");
		}
		next();
	},
	
	ensureNotLoggedIn: async (req, res, next) => {
		const user = await getJwtUser(req);
		if(user) {
			req.flash("warning", "Please logout first to continue");
			if(user.role == "admin")
				return res.redirect("/admin/dashboard");
			if(user.role == "donor")
				return res.redirect("/donor/dashboard");
			if(user.role == "agent")
				return res.redirect("/agent/dashboard");
		}
		next();
	}
	
}

module.exports = middleware;