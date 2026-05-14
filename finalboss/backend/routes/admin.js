const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const { matchDonationToAgent } = require("../services/ai/donationMatcher");


router.get("/admin/dashboard", middleware.ensureAdminLoggedIn, async (req,res) => {
	const numAdmins = await User.countDocuments({ role: "admin" });
	const numDonors = await User.countDocuments({ role: "donor" });
	const numAgents = await User.countDocuments({ role: "agent" });
	const numPendingDonations = await Donation.countDocuments({ status: "pending" });
	const numAcceptedDonations = await Donation.countDocuments({ status: "accepted" });
	const numAssignedDonations = await Donation.countDocuments({ status: "assigned" });
	const numCollectedDonations = await Donation.countDocuments({ status: "collected" });
	res.render("admin/dashboard", {
		title: "Dashboard",
		numAdmins, numDonors, numAgents, numPendingDonations, numAcceptedDonations, numAssignedDonations, numCollectedDonations
	});
});

router.get("/admin/donations/pending", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const pendingDonations = await Donation.find({status: ["pending", "accepted", "assigned"]}).populate("donor");
		res.render("admin/pendingDonations", { title: "Pending Donations", pendingDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donations/previous", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const previousDonations = await Donation.find({ status: "collected" }).populate("donor");
		res.render("admin/previousDonations", { title: "Previous Donations", previousDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/view/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const donation = await Donation.findById(donationId).populate("donor").populate("agent");
		res.render("admin/donation", { title: "Donation details", donation });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/accept/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
			const donationId = req.params.donationId;
			// Accept the donation
			await Donation.findByIdAndUpdate(donationId, { status: "accepted" });
			// Auto-assign agent using AI
			const donation = await Donation.findById(donationId);
			const agents = await User.find({ role: "agent" });
			const agentObjs = agents.map(a => ({
				_id: a._id,
				location: { lat: a.lat, lng: a.lng },
				capacity: a.capacity || 10,
				assigned: a.assigned || 0,
				foodTypesHandled: a.foodTypesHandled || [donation.foodType]
			}));
			const { matchDonationToAgent } = require("../services/ai/donationMatcher");
			const matched = matchDonationToAgent({
				location: { lat: donation.lat, lng: donation.lng },
				foodType: donation.foodType,
				quantity: parseInt(donation.quantity)
			}, agentObjs);
			if (matched) {
				await Donation.findByIdAndUpdate(donationId, { status: "assigned", agent: matched._id });
				req.flash("success", "Donation accepted and agent assigned automatically.");
			} else {
				req.flash("warning", "Donation accepted, but no suitable agent found for auto-assignment.");
			}
			res.redirect(`/admin/donation/view/${donationId}`);
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/reject/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndUpdate(donationId, { status: "rejected" });
		req.flash("success", "Donation rejected successfully");
		res.redirect(`/admin/donation/view/${donationId}`);
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/donation/assign/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const agents = await User.find({ role: "agent" });
		const donation = await Donation.findById(donationId).populate("donor");
		res.render("admin/assignAgent", { title: "Assign agent", donation, agents });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.post("/admin/donation/assign/:donationId", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
			const donationId = req.params.donationId;
			let { agent, adminToAgentMsg } = req.body;
			// If agent is not selected, auto-match using AI
			if (!agent) {
				const donation = await Donation.findById(donationId);
				// Find all agents (add more filters as needed)
				const agents = await User.find({ role: "agent" });
				// Prepare agent objects for matcher
				const agentObjs = agents.map(a => ({
					_id: a._id,
					location: { lat: a.lat, lng: a.lng },
					// Add these fields to your agent model if not present
					capacity: a.capacity || 10,
					assigned: a.assigned || 0,
					foodTypesHandled: a.foodTypesHandled || [donation.foodType]
				}));
				const matched = matchDonationToAgent({
					location: { lat: donation.lat, lng: donation.lng },
					foodType: donation.foodType,
					quantity: parseInt(donation.quantity)
				}, agentObjs);
				if (matched) agent = matched._id;
			}
			if (!agent) {
				req.flash("error", "No suitable agent found for this donation.");
				return res.redirect(`/admin/donation/assign/${donationId}`);
			}
			await Donation.findByIdAndUpdate(donationId, { status: "assigned", agent, adminToAgentMsg });
			req.flash("success", "Agent assigned successfully");
			res.redirect(`/admin/donation/view/${donationId}`);
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/admin/agents", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const agents = await User.find({ role: "agent" });
		res.render("admin/agents", { title: "List of agents", agents });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});


router.get("/admin/profile", middleware.ensureAdminLoggedIn, (req,res) => {
	res.render("admin/profile", { title: "My profile" });
});

router.put("/admin/profile", middleware.ensureAdminLoggedIn, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.admin;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id, updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/admin/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});


module.exports = router;