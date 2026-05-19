const mongoose = require("mongoose");

// Suppress Mongoose strictQuery deprecation warning
mongoose.set('strictQuery', false);

// Make sure your .env file contains:
// MONGO_URI=mongodb+srv://aanchalkanwar25_db_user:pxNjReTDUrX8GPMP@cluster0.3rahy9o.mongodb.net/your_db_name

const connectDB = async () => {
	try {
		const db = process.env.MONGO_URI;
		await mongoose.connect(db);
		console.log("MongoDB connected...");
	} catch (err) {
		console.log(err);
		process.exit(1);
	}
}

module.exports = connectDB;