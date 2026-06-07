const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');

async function check() {
    try {
        console.log("Connecting to DB:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        const users = await User.find({ email: 'admin@badel.tn' });
        console.log("Admin email search result (all matching documents):");
        console.log(users.map(u => ({
            id: u._id,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            isBanned: u.isBanned,
            firstName: u.firstName,
            lastName: u.lastName
        })));

        const allAdmins = await User.find({ role: 'admin' });
        console.log("All admin users in DB:");
        console.log(allAdmins.map(u => ({
            id: u._id,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            isBanned: u.isBanned
        })));

        await mongoose.disconnect();
    } catch(err) {
        console.error("Error:", err);
    }
}

check();
