const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
	donor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "users",
		required: true
	},
	agent: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "users",
	},
	foodType: {
		type: String,
		required: true
	},
	quantity: {
		type: String,
		required: true
	},
	cookingTime: {
		type: Date,
		required: true
	},
	expiryTime: {
		type: Date
	},
	hasExpired: {
		type: Boolean,
		default: false,
		index: true
	},
	location: {
		lat: Number,
		lng: Number
	},
	address: {
		type: String,
		required: true
	},
	phone: {
		type: Number,
		required: true
	},
	donorToAdminMsg: String,
	adminToAgentMsg: String,
	collectionTime: {
		type: Date,
	},
	status: {
		type: String,
		enum: ["pending", "rejected", "accepted", "assigned", "collected"],
		required: true
	},
}, { timestamps: true });

donationSchema.index({ donor: 1, status: 1 });
donationSchema.index({ agent: 1, status: 1 });
donationSchema.index({ status: 1, expiryTime: 1 });

const Donation = mongoose.model("donations", donationSchema);
module.exports = Donation;
