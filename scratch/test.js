const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  location: {
    city: String,
    governorate: String
  }
});
const User = mongoose.model('UserTest', UserSchema);

async function test() {
  const user = new User({ location: { city: 'Tunis', governorate: 'Tunis' }});
  console.log('Before spread:', user.location);
  try {
    user.location = { ...user.location, city: 'Sfax' };
    console.log('After spread:', user.location);
    console.log('Success!');
  } catch (err) {
    console.error('Error spreading location:', err);
  }
}
test();
