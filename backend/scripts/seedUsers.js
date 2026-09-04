const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/user');

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = [
    { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'Password1@', role: 'admin', isVerified: true },
    { firstName: 'Donor', lastName: 'User', email: 'donor@example.com', password: 'Password1@', role: 'donor', isVerified: true }
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`User ${u.email} already exists`);
      continue;
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(u.password, salt);
    const newUser = new User({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: hash,
      role: u.role,
      isVerified: u.isVerified
    });
    await newUser.save();
    console.log(`Created user ${u.email} with role ${u.role}`);
  }

  await mongoose.disconnect();
  console.log('Done');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
