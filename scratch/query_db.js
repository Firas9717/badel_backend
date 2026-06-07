const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Offer = require('../src/models/Offer');
  const User = require('../src/models/User');

  const offers = await Offer.find().populate('user');
  console.log(`Total offers: ${offers.length}`);
  offers.forEach(o => {
    console.log(`Offer: ${o.title}, User field type: ${typeof o.user}, User: ${o.user ? o.user._id : 'null'} (${o.user ? o.user.firstName + ' ' + o.user.lastName : 'N/A'})`);
  });

  const users = await User.find();
  console.log(`Total users: ${users.length}`);
  users.forEach(u => {
    console.log(`User: ${u._id} - ${u.firstName} ${u.lastName} - email: ${u.email}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
