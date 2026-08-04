const mongoose = require("mongoose");


mongoose.set('strictQuery', false);


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
