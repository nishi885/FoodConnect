const mongoose = require("mongoose");

// Suppress Mongoose strictQuery deprecation warning
mongoose.set('strictQuery', false);

// Make sure your .env file contains:
// MONGO_URI=mongodb+srv://aanchalkanwar25_db_user:pxNjReTDUrX8GPMP@cluster0.3rahy9o.mongodb.net/your_db_name

const connectDB = async () => {
	try {
		const db = process.env.MONGO_URI;
		if (!db) {
			throw new Error('MONGO_URI is not defined. Check backend/.env or the dotenv config path.');
		}
		await mongoose.connect(db);
		console.log("MongoDB connected...");
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}

module.exports = connectDB;