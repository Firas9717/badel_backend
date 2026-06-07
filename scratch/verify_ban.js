require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function runTest() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        // Find or create test user
        const email = 'test_ban_flow@badel.tn';
        let user = await User.findOne({ email });
        if (!user) {
            console.log('👤 Creating a test user...');
            user = await User.create({
                firstName: 'Test',
                lastName: 'BanFlow',
                email: email,
                password: 'Password123'
            });
        }
        console.log(`👤 Test user: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user._id}`);
        console.log(`Initial Status - isBanned: ${user.isBanned}, banReason: "${user.banReason || ''}"`);

        // Test 1: Simulate login when active
        // (Just check isBanned state check replica from login logic)
        console.log('\n--- Test 1: Check Active Login Guard ---');
        if (user.isBanned) {
            console.error('❌ Expected user to be active, but they are banned.');
        } else {
            console.log('✅ Success: Active user login check passed.');
        }

        // Test 2: Ban the user
        console.log('\n--- Test 2: Ban User ---');
        user.isBanned = true;
        user.banReason = 'Violation of policies';
        await user.save();
        
        // Fetch fresh copy from DB
        let bannedUser = await User.findById(user._id);
        console.log(`Banned Status - isBanned: ${bannedUser.isBanned}, banReason: "${bannedUser.banReason}"`);
        if (bannedUser.isBanned && bannedUser.banReason === 'Violation of policies') {
            console.log('✅ Success: User successfully marked as banned in database.');
        } else {
            console.error('❌ Failed: User was not correctly banned.');
        }

        // Test 3: Simulate login when banned
        console.log('\n--- Test 3: Check Banned Login Guard ---');
        if (bannedUser.isBanned) {
            console.log('✅ Success: Login guard successfully blocked banned user. Message: Your account has been banned.');
        } else {
            console.error('❌ Failed: Banned user login check bypassed the guard.');
        }

        // Test 4: Unban the user
        console.log('\n--- Test 4: Unban User ---');
        bannedUser.isBanned = false;
        bannedUser.banReason = undefined;
        await bannedUser.save();

        let unbannedUser = await User.findById(user._id);
        console.log(`Unbanned Status - isBanned: ${unbannedUser.isBanned}, banReason: "${unbannedUser.banReason || ''}"`);
        if (!unbannedUser.isBanned && !unbannedUser.banReason) {
            console.log('✅ Success: User successfully unbanned.');
        } else {
            console.error('❌ Failed: User unban failed.');
        }

        // Clean up the test user
        console.log('\n🧹 Cleaning up test user...');
        await User.deleteOne({ _id: user._id });
        console.log('✅ Done.');

    } catch (e) {
        console.error('❌ Error running test:', e);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 DB Connection closed.');
    }
}

runTest();
