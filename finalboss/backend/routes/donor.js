const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");

const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const { geocodeLocation } = require("../utils/geocode.js");
const { findBestNGO } = require("../utils/matching.js");
const { classifyUrgency } = require("../utils/urgency.js");


router.get("/donor/dashboard", middleware.ensureDonorLoggedIn, async (req,res) => {
	const donorId = req.user._id;
	const numPendingDonations = await Donation.countDocuments({ donor: donorId, status: "pending" });
	const numAcceptedDonations = await Donation.countDocuments({ donor: donorId, status: "accepted" });
	const numAssignedDonations = await Donation.countDocuments({ donor: donorId, status: "assigned" });
	const numCollectedDonations = await Donation.countDocuments({ donor: donorId, status: "collected" });
	res.render("donor/dashboard", {
		title: "Dashboard",
		numPendingDonations, numAcceptedDonations, numAssignedDonations, numCollectedDonations
	});
});

router.get("/donor/donate", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/donate", { title: "Donate" });
});

// Donation creation with geocoding and NGO recommendation
router.post("/donor/donate", middleware.ensureDonorLoggedIn, async (req, res) => {
	try {
		const donation = req.body.donation;
		donation.status = "pending";
		donation.donor = req.user._id;

		// Geocode address
		const geo = await geocodeLocation(donation.address);
		donation.lat = geo.lat;
		donation.lng = geo.lng;

		// Find best NGO (recommendation)
		// For demo: get all NGOs (users with role 'agent' and location)
		const ngos = await User.find({ role: "agent", address: { $exists: true, $ne: "" } });
		// Map NGOs to required format for matching
		const ngoList = ngos.map(ngo => ({
			_id: ngo._id,
			name: ngo.firstName + " " + ngo.lastName,
			location: geo, // fallback to donor location if ngo location not available
			capacity: 10 // demo: static capacity
		}));
		const recommendedNGO = findBestNGO({ lat: donation.lat, lng: donation.lng }, ngoList);
		if (recommendedNGO) {
			donation.recommendedNGO = recommendedNGO._id;
		}

		const newDonation = new Donation(donation);
		await newDonation.save();
		req.flash("success", "Donation request sent successfully");
		res.redirect("/donor/donations/pending");
	} catch (err) {
		console.log(err);
		req.flash("error", "Some error occurred on the server.");
		res.redirect("back");
	}
});

// Add urgency and recommended NGO to pending donations
router.get("/donor/donations/pending", middleware.ensureDonorLoggedIn, async (req, res) => {
	try {
		let pendingDonations = await Donation.find({ donor: req.user._id, status: ["pending", "rejected", "accepted", "assigned"] }).populate("agent");
		// Add urgency and recommended NGO fields
		pendingDonations = pendingDonations.map(donation => {
			const urgency = classifyUrgency(donation.cookingTime);
			return { ...donation._doc, urgency, recommendedNGO: donation.recommendedNGO };
		});
		res.render("donor/pendingDonations", { title: "Pending Donations", pendingDonations });
	} catch (err) {
		console.log(err);
		req.flash("error", "Some error occurred on the server.");
		res.redirect("back");
	}
});

router.get("/donor/donations/previous", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const previousDonations = await Donation.find({ donor: req.user._id, status: "collected" }).populate("agent");
		res.render("donor/previousDonations", { title: "Previous Donations", previousDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donation/deleteRejected/:donationId", async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndDelete(donationId);
		res.redirect("/donor/donations/pending");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/profile", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/profile", { title: "My Profile" });
});

router.put("/donor/profile", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.donor;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id, updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/donor/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});


module.exports = router;