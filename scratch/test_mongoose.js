const mongoose = require('mongoose');

async function test() {
  const schema = new mongoose.Schema({ name: String });
  schema.pre('save', async function(next) {
    console.log('Hook next type:', typeof next);
    next();
  });
  const Model = mongoose.model('Test', schema);
  try {
    const doc = new Model({ name: 'test' });
    await doc.save();
    console.log('Save successful');
  } catch (err) {
    console.error('Save failed:', err.message);
  }
}

test();
